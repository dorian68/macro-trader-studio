import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeConfig } from "../_shared/stripe-config.ts";
import { requireVerifiedUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { user, error: authError, status } = await requireVerifiedUser(req);
    if (!user) {
      return new Response(JSON.stringify({
        subscribed: false,
        plan_type: null,
        error: authError || "Verified email required",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: status ?? 401,
      });
    }

    const config = getStripeConfig();
    logStep("Stripe config loaded", { mode: config.mode });
    
    const stripe = new Stripe(config.secretKey, { 
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Load price-to-plan mapping dynamically from plan_parameters
    const { data: planParamsData } = await supabaseClient
      .from('plan_parameters')
      .select('plan_type, stripe_price_id')
      .not('stripe_price_id', 'is', null);

    const priceToPlan: Record<string, string> = {};
    if (planParamsData) {
      for (const p of planParamsData) {
        if (p.stripe_price_id) {
          priceToPlan[p.stripe_price_id] = p.plan_type;
        }
      }
    }
    logStep("Price-to-plan mapping loaded", { count: Object.keys(priceToPlan).length });

    let subscription: Stripe.Subscription | null = null;
    let customerId: string | null = null;
    for await (const customer of stripe.customers.list({ email: user.email, limit: 100 })) {
      for await (const candidate of stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 100,
      })) {
        const belongsToUser = !candidate.metadata?.user_id || candidate.metadata.user_id === user.id;
        if (belongsToUser && ['active', 'trialing'].includes(candidate.status)) {
          subscription = candidate;
          customerId = customer.id;
          break;
        }
      }
      if (subscription) break;
    }

    if (!subscription || !customerId) {
      logStep("No active subscription found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_type: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const planType = priceId ? priceToPlan[priceId] : null;
    if (!planType) {
      throw new Error(`No plan mapping found for Stripe price ${priceId || '(missing)'}`);
    }
    
    let subscriptionEnd: string | null = null;
    // `current_period_end` moved from the subscription to its items in the
    // basil API version (2025+); read whichever the API returns.
    const periodEnd = subscription.current_period_end
      ?? subscription.items?.data?.[0]?.current_period_end
      ?? null;
    if (periodEnd) {
      try {
        subscriptionEnd = new Date(periodEnd * 1000).toISOString();
      } catch (err) {
        logStep("Error parsing subscription end date", { error: err instanceof Error ? err.message : String(err) });
      }
    }

    logStep("Active subscription found", { 
      subscriptionId: subscription.id,
      priceId,
      planType,
      endDate: subscriptionEnd
    });

    return new Response(JSON.stringify({
      subscribed: true,
      plan_type: planType,
      subscription_end: subscriptionEnd,
      subscription_id: subscription.id,
      customer_id: customerId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      subscribed: false,
      plan_type: null,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
