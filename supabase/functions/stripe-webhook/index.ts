import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeConfig } from "../_shared/stripe-config.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const terminalSubscriptionStatuses = new Set<Stripe.Subscription.Status>([
  'canceled',
  'incomplete_expired',
]);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let eventId: string | null = null;
  let eventStore: SupabaseClient<any> | null = null;

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
    eventStore = supabase;

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (!webhookSecret) {
      logStep("Webhook secret is not configured; refusing unsigned processing");
      return new Response("Webhook secret not configured", { status: 500 });
    }
    if (!signature) {
      return new Response("Missing Stripe signature", { status: 400 });
    }

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified", { eventType: event.type });
    } catch (err: unknown) {
      logStep("Webhook signature verification failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return new Response("Invalid signature", { status: 400 });
    }

    eventId = event.id;
    logStep("Processing event", { type: event.type, id: event.id });

    // ============================================================
    // IDEMPOTENCY GUARD: Deduplicate Stripe events
    // ============================================================
    const { data: insertedEvent, error: dedupError } = await supabase
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type, status: 'processing', last_error: null })
      .select('event_id')
      .maybeSingle();

    if (dedupError) {
      if (dedupError.code === '23505') {
        const { data: existingEvent, error: existingError } = await supabase
          .from('processed_stripe_events')
          .select('status, processed_at')
          .eq('event_id', event.id)
          .single();

        if (existingError) throw existingError;
        if (existingEvent.status === 'completed') {
          logStep("Event already completed (idempotency skip)", { eventId: event.id });
          return new Response(JSON.stringify({ received: true, skipped: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
          });
        }
        if (existingEvent.status === 'processing') {
          const processingAge = Date.now() - new Date(existingEvent.processed_at).getTime();
          if (Number.isFinite(processingAge) && processingAge < 10 * 60 * 1000) {
            return new Response("Event is already processing", { status: 409 });
          }
        }

        const { error: retryError } = await supabase
          .from('processed_stripe_events')
          .update({ status: 'processing', last_error: null, processed_at: new Date().toISOString() })
          .eq('event_id', event.id);
        if (retryError) throw retryError;
      } else {
        throw dedupError;
      }
    } else if (!insertedEvent) {
      throw new Error("Failed to reserve Stripe event");
    }

    // ============================================================
    // Helper: find user by email
    // ============================================================
    const findUserByEmail = async (email: string) => {
      // Paginate through users to find by email (handles >1000 users)
      const normalizedEmail = email.toLowerCase();
      let page = 1;
      const perPage = 1000;
      while (true) {
        const { data: userList } = await supabase.auth.admin.listUsers({ page, perPage });
        if (!userList?.users?.length) return null;
        const found = userList.users.find(u => u.email?.toLowerCase() === normalizedEmail);
        if (found) return found;
        if (userList.users.length < perPage) return null;
        page++;
      }
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
        throw new Error(`No plan mapping found for Stripe price ${priceId}`);
      }
      return planData.plan_type;
    };

    const ensureProfile = async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { user_id: userId, status: 'pending', user_plan: 'free_trial' },
          { onConflict: 'user_id', ignoreDuplicates: true },
        );
      if (error) throw error;
    };

    const resolveSubscriptionUser = async (
      subscription: Stripe.Subscription,
      customerEmail: string | null,
    ) => {
      const metadataUserId = subscription.metadata?.user_id;
      if (metadataUserId) {
        const { data, error } = await supabase.auth.admin.getUserById(metadataUserId);
        if (data.user) return data.user;

        const { data: deletedAccount, error: deletedAccountError } = await supabase
          .from('deleted_accounts_audit')
          .select('id')
          .eq('original_user_id', metadataUserId)
          .maybeSingle();
        if (deletedAccountError) throw deletedAccountError;
        if (deletedAccount) return null;

        throw error || new Error(`No user found for subscription metadata ${metadataUserId}`);
      }
      if (!customerEmail) return null;
      return await findUserByEmail(customerEmail);
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id });
        
        const customerEmail = session.customer_email || 
          (session.customer && typeof session.customer === 'string' ? 
            (await stripe.customers.retrieve(session.customer) as Stripe.Customer).email : null);

        if (!customerEmail) {
          throw new Error(`No customer email found for checkout session ${session.id}`);
        }

        const metadataUserId = session.metadata?.user_id;
        const metadataUser = metadataUserId
          ? (await supabase.auth.admin.getUserById(metadataUserId)).data.user
          : null;
        if (metadataUserId && !metadataUser) {
          const { data: deletedAccount, error: deletedAccountError } = await supabase
            .from('deleted_accounts_audit')
            .select('id')
            .eq('original_user_id', metadataUserId)
            .maybeSingle();
          if (deletedAccountError) throw deletedAccountError;
          if (deletedAccount) {
            if (typeof session.subscription === 'string') {
              const deletedSubscription = await stripe.subscriptions.retrieve(session.subscription);
              if (!terminalSubscriptionStatuses.has(deletedSubscription.status)) {
                await stripe.subscriptions.cancel(deletedSubscription.id);
              }
            }
            logStep("Checkout belongs to a deleted account; subscription canceled", {
              userId: metadataUserId,
              sessionId: session.id,
            });
            break;
          }
          throw new Error(`Checkout session ${session.id} references an unknown user`);
        }
        const existingUser = metadataUserId ? metadataUser : await findUserByEmail(customerEmail);

        if (!existingUser || existingUser.email?.toLowerCase() !== customerEmail.toLowerCase()) {
          throw new Error(`Checkout session ${session.id} is not linked to an existing matching user`);
        }
        const userId = existingUser.id;
        logStep("Found existing user", { userId, email: customerEmail });

        await ensureProfile(userId);

        // Do not grant access here. A completed checkout can precede final
        // payment confirmation. invoice.payment_succeeded is the only event
        // allowed to approve the account and provision paid-plan credits.
        logStep("Checkout linked to existing user; awaiting paid invoice", {
          userId,
          subscriptionId: session.subscription || null,
        });

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });
        // Do not grant access or reset credits here. Subscription updates can be
        // triggered before a prorated invoice is paid. invoice.payment_succeeded
        // is the source of truth for paid plan changes and renewals.
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id });

        // Resolve the subscription id across Stripe API shapes. The legacy
        // `invoice.subscription` field was removed in the basil API version
        // (2025+) in favor of `invoice.parent.subscription_details.subscription`.
        const directSub = invoice.subscription;
        const parentSub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          (typeof directSub === 'string' ? directSub : directSub?.id) ??
          (typeof parentSub === 'string' ? parentSub : parentSub?.id) ??
          null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
          const user = await resolveSubscriptionUser(subscription, customer.email);
          if (!user && subscription.metadata?.user_id) {
            if (!terminalSubscriptionStatuses.has(subscription.status)) {
              await stripe.subscriptions.cancel(subscription.id);
            }
            logStep("Skipping invoice and canceling subscription for deleted account", {
              invoiceId: invoice.id,
              userId: subscription.metadata.user_id,
            });
            break;
          }
          if (!user) throw new Error(`No user found for invoice ${invoice.id}`);
          const priceId = subscription.items.data[0]?.price?.id;
          if (!priceId) throw new Error(`No price found for invoice ${invoice.id}`);
          const planType = await resolvePlanType(priceId);
          await ensureProfile(user.id);

          const { data: provisionResult, error: creditsError } = await supabase.rpc('provision_plan_credits', {
            p_user_id: user.id,
            p_plan_type: planType,
            p_source: 'stripe_webhook_invoice',
            p_reference_id: event.id
          });
          if (creditsError || provisionResult?.success === false) {
            throw creditsError || new Error(`Credit provisioning failed: ${provisionResult?.reason}`);
          }

          const { data: approvedProfile, error: profileError } = await supabase
            .from('profiles')
            .update({ user_plan: planType, status: 'approved' })
            .eq('user_id', user.id)
            .select('user_id')
            .single();
          if (profileError || !approvedProfile) {
            throw profileError || new Error(`Failed to approve profile for ${user.id}`);
          }
          logStep("Credits provisioned for billing period", { userId: user.id, planType });
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
        const user = await resolveSubscriptionUser(subscription, customer.email);
        if (!user && subscription.metadata?.user_id) {
          logStep("Subscription belongs to an already deleted account", {
            subscriptionId: subscription.id,
            userId: subscription.metadata.user_id,
          });
          break;
        }
        if (!user) throw new Error(`No user found for cancelled subscription ${subscription.id}`);

        const { data: revokeResult, error: revokeError } = await supabase.rpc('revoke_product_access_service', {
          p_user_id: user.id,
          p_source: 'stripe_webhook_cancellation',
          p_reference_id: event.id
        });
        if (revokeError || revokeResult !== true) {
          throw revokeError || new Error(`Failed to revoke product access for ${user.id}`);
        }
        logStep("Product access revoked after cancellation", { userId: user.id });
        
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    const { error: completionError } = await supabase
      .from('processed_stripe_events')
      .update({ status: 'completed', last_error: null, processed_at: new Date().toISOString() })
      .eq('event_id', event.id);
    if (completionError) throw completionError;

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    if (eventId && eventStore) {
      await eventStore
        .from('processed_stripe_events')
        .update({ status: 'failed', last_error: errorMessage.slice(0, 2000) })
        .eq('event_id', eventId);
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
