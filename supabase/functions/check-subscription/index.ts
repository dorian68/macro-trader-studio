import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeConfig } from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const config = getStripeConfig();
    logStep("Stripe config loaded", { mode: config.mode });
    
    const stripe = new Stripe(config.secretKey, { 
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_type: null,
        error: "Not authenticated" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      logStep("Authentication failed", { error: userError?.message });
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_type: null,
        error: "Invalid authentication" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const user = userData.user;
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

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_type: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
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

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price?.id;
    const planType = priceToPlan[priceId as string] || 'unknown';
    
    let subscriptionEnd: string | null = null;
    if (subscription.current_period_end) {
      try {
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
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
