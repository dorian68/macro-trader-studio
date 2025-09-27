import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2025-08-27.basil",
    });

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is available
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err: any) {
        logStep("Webhook signature verification failed", { error: err?.message || err });
        return new Response("Invalid signature", { status: 400 });
      }
    } else {
      // Parse event manually if no webhook secret (development)
      event = JSON.parse(body);
      logStep("Webhook parsed without signature verification (development mode)");
    }

    logStep("Processing event", { type: event.type, id: event.id });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id });
        
        // Get customer email
        const customerEmail = session.customer_email || 
          (session.customer && typeof session.customer === 'string' ? 
            (await stripe.customers.retrieve(session.customer) as Stripe.Customer).email : null);

        if (!customerEmail) {
          logStep("No customer email found", { session: session.id });
          break;
        }

        // Find user by email using listUsers
        const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
        let existingUser = null;
        
        if (userList?.users) {
          existingUser = userList.users.find(user => user.email === customerEmail);
        }
        
        let userId: string;
        
        if (existingUser) {
          userId = existingUser.id;
          logStep("Found existing user", { userId, email: customerEmail });
        } else {
          // Create new user
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

        // Get plan type from metadata
        const planType = session.metadata?.plan_type;
        if (planType) {
          // Initialize user credits based on plan
          const { error: creditsError } = await supabase.rpc('initialize_user_credits', {
            target_user_id: userId,
            target_plan_type: planType
          });

          if (creditsError) {
            logStep("Failed to initialize credits", { error: creditsError });
          } else {
            logStep("User credits initialized", { userId, planType });
          }
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });
        
        // Handle subscription changes (upgrades, downgrades, cancellations)
        if (subscription.status === "active") {
          // Get customer and find user
          const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
          
          if (customer.email) {
            // Find user by email using listUsers
            const { data: userList } = await supabase.auth.admin.listUsers();
            let user = null;
            
            if (userList?.users) {
              user = userList.users.find(u => u.email === customer.email);
            }
            
            if (user) {
              // Get plan type from subscription
              const priceId = subscription.items.data[0]?.price?.id;
              let planType = 'premium'; // default fallback
              
              // Map price ID to plan type
              const priceToplan = {
                "price_1SC398Bbyt0kGZ1fmyLGVmWa": "basic",
                "price_1SC39lBbyt0kGZ1fUhOBloBb": "standard", 
                "price_1SC39zBbyt0kGZ1fvhRYyA0x": "premium"
              };
              
              planType = priceToplan[priceId as keyof typeof priceToplan] || 'premium';
              
              // Update user credits
              const { error: creditsError } = await supabase.rpc('initialize_user_credits', {
                target_user_id: user.id,
                target_plan_type: planType
              });

              if (creditsError) {
                logStep("Failed to update credits for subscription change", { error: creditsError });
              } else {
                logStep("Credits updated for subscription change", { userId: user.id, planType });
              }
            }
          }
        }
        
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id });
        
        // Handle successful recurring payments
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
          
          if (customer.email) {
            // Find user by email using listUsers
            const { data: userList } = await supabase.auth.admin.listUsers();
            let user = null;
            
            if (userList?.users) {
              user = userList.users.find(u => u.email === customer.email);
            }
            
            if (user) {
              // Reset credits for the billing period
              const priceId = subscription.items.data[0]?.price?.id;
              let planType = 'premium';
              
              const priceToplan = {
                "price_1SC398Bbyt0kGZ1fmyLGVmWa": "basic",
                "price_1SC39lBbyt0kGZ1fUhOBloBb": "standard", 
                "price_1SC39zBbyt0kGZ1fvhRYyA0x": "premium"
              };
              
              planType = priceToplan[priceId as keyof typeof priceToplan] || 'premium';
              
              const { error: creditsError } = await supabase.rpc('initialize_user_credits', {
                target_user_id: user.id,
                target_plan_type: planType
              });

              if (!creditsError) {
                logStep("Credits reset for billing period", { userId: user.id, planType });
              }
            }
          }
        }
        
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { invoiceId: invoice.id });
        
        // Handle failed payments - you might want to notify the user
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription cancelled", { subscriptionId: subscription.id });
        
        // Handle subscription cancellation
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        if (customer.email) {
          // Find user by email using listUsers
          const { data: userList } = await supabase.auth.admin.listUsers();
          let user = null;
          
          if (userList?.users) {
            user = userList.users.find(u => u.email === customer.email);
          }
          
          if (user) {
            // Downgrade to free plan
            const { error: creditsError } = await supabase.rpc('initialize_user_credits', {
              target_user_id: user.id,
              target_plan_type: 'free_trial'
            });

            if (!creditsError) {
              logStep("User downgraded to free plan", { userId: user.id });
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