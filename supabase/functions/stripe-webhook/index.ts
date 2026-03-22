import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeConfig } from "../_shared/stripe-config.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    logStep("Webhook received");

    const config = getStripeConfig();
    logStep("Stripe config loaded", { mode: config.mode });
    
    const stripe = new Stripe(config.secretKey, { 
      apiVersion: "2025-08-27.basil",
    });
    
    const webhookSecret = config.webhookSecret;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        logStep("Webhook signature verified", { eventType: event.type });
      } catch (err: any) {
        logStep("Webhook signature verification failed", { error: err?.message || err });
        return new Response("Invalid signature", { status: 400 });
      }
    } else {
      event = JSON.parse(body);
      logStep("Webhook parsed without signature verification (development mode)");
    }

    logStep("Processing event", { type: event.type, id: event.id });

    // ============================================================
    // IDEMPOTENCY GUARD: Deduplicate Stripe events
    // ============================================================
    const { data: insertedEvent, error: dedupError } = await supabase
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type })
      .select('event_id')
      .maybeSingle();

    if (dedupError) {
      // Unique constraint violation = already processed
      if (dedupError.code === '23505') {
        logStep("Event already processed (idempotency skip)", { eventId: event.id });
        return new Response(JSON.stringify({ received: true, skipped: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
      logStep("WARNING: Dedup check error (proceeding anyway)", { error: dedupError.message });
    }

    if (!insertedEvent) {
      logStep("Event already processed (idempotency skip)", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ============================================================
    // Helper: find user by email
    // ============================================================
    const findUserByEmail = async (email: string) => {
      const { data: userList } = await supabase.auth.admin.listUsers();
      return userList?.users?.find(u => u.email === email) || null;
    };

    // ============================================================
    // Helper: resolve plan type from price ID
    // ============================================================
    const resolvePlanType = async (priceId: string): Promise<string> => {
      const { data: planData, error: planError } = await supabase
        .from('plan_parameters')
        .select('plan_type')
        .eq('stripe_price_id', priceId)
        .single();

      if (planError || !planData?.plan_type) {
        logStep("Could not find plan for price, using fallback", { priceId });
        return 'premium';
      }
      return planData.plan_type;
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id });
        
        const customerEmail = session.customer_email || 
          (session.customer && typeof session.customer === 'string' ? 
            (await stripe.customers.retrieve(session.customer) as Stripe.Customer).email : null);

        if (!customerEmail) {
          logStep("No customer email found", { session: session.id });
          break;
        }

        let existingUser = await findUserByEmail(customerEmail);
        let userId: string;
        
        if (existingUser) {
          userId = existingUser.id;
          logStep("Found existing user", { userId, email: customerEmail });
        } else {
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: customerEmail,
            email_confirm: true,
            user_metadata: {
              created_via_stripe: true,
              stripe_customer_id: session.customer
            }
          });

          if (createError || !newUser.user) {
            logStep("Failed to create user", { error: createError });
            break;
          }

          userId = newUser.user.id;
          logStep("Created new user", { userId, email: customerEmail });
        }

        let planType = session.metadata?.plan_type;
        
        if (!planType) {
          const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['line_items']
          });
          const priceId = fullSession.line_items?.data[0]?.price?.id;
          if (priceId) {
            planType = await resolvePlanType(priceId);
          }
        }
        
        if (planType) {
          // Use idempotent provision_plan_credits instead of initialize_user_credits
          const { data: provisionResult, error: creditsError } = await supabase.rpc('provision_plan_credits', {
            p_user_id: userId,
            p_plan_type: planType,
            p_source: 'stripe_webhook_checkout',
            p_reference_id: event.id
          });

          if (creditsError) {
            logStep("Failed to provision credits", { error: creditsError });
          } else {
            logStep("Credits provisioned", { userId, planType, result: provisionResult });
          }

          // Update profile: set plan + auto-approve
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ user_plan: planType, status: 'approved' })
            .eq('user_id', userId);

          if (profileError) {
            logStep("Failed to update profile", { error: profileError });
          } else {
            logStep("Profile updated (plan + auto-approved)", { userId, planType });
          }
        } else {
          logStep("ERROR: Could not determine plan_type", { sessionId: session.id });
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });
        
        if (subscription.status === "active") {
          const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
          
          if (customer.email) {
            const user = await findUserByEmail(customer.email);
            
            if (user) {
              const priceId = subscription.items.data[0]?.price?.id;
              const planType = priceId ? await resolvePlanType(priceId) : 'premium';
              
              // Update profile plan
              await supabase
                .from('profiles')
                .update({ user_plan: planType })
                .eq('user_id', user.id);
              
              // Use idempotent provision
              const { error: creditsError } = await supabase.rpc('provision_plan_credits', {
                p_user_id: user.id,
                p_plan_type: planType,
                p_source: 'stripe_webhook_subscription_updated',
                p_reference_id: event.id
              });

              if (creditsError) {
                logStep("Failed to provision credits for subscription change", { error: creditsError });
              } else {
                logStep("Credits provisioned for subscription change", { userId: user.id, planType });
              }
            }
          }
        }
        
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id });
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
          
          if (customer.email) {
            const user = await findUserByEmail(customer.email);
            
            if (user) {
              const priceId = subscription.items.data[0]?.price?.id;
              const planType = priceId ? await resolvePlanType(priceId) : 'premium';
              
              // Use idempotent provision for billing renewal
              const { error: creditsError } = await supabase.rpc('provision_plan_credits', {
                p_user_id: user.id,
                p_plan_type: planType,
                p_source: 'stripe_webhook_invoice',
                p_reference_id: event.id
              });

              if (!creditsError) {
                logStep("Credits provisioned for billing period", { userId: user.id, planType });
              }
            }
          }
        }
        
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { invoiceId: invoice.id });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription cancelled", { subscriptionId: subscription.id });
        
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        if (customer.email) {
          const user = await findUserByEmail(customer.email);
          
          if (user) {
            // Use idempotent provision to downgrade
            const { error: creditsError } = await supabase.rpc('provision_plan_credits', {
              p_user_id: user.id,
              p_plan_type: 'free_trial',
              p_source: 'stripe_webhook_cancellation',
              p_reference_id: event.id
            });

            if (!creditsError) {
              logStep("User credits downgraded to free plan", { userId: user.id });
            }

            const { error: profileError } = await supabase
              .from('profiles')
              .update({ user_plan: 'free_trial' })
              .eq('user_id', user.id);

            if (profileError) {
              logStep("Failed to downgrade profile plan", { error: profileError });
            } else {
              logStep("Profile plan downgraded to free_trial", { userId: user.id });
            }
          }
        }
        
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});