import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeConfig } from "../_shared/stripe-config.ts";
import { requireRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECONCILE-PAYMENTS] ${step}${detailsStr}`);
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
    const { user, error: authError, status } = await requireRole(req, ['super_user']);
    if (!user) {
      return new Response(JSON.stringify({ error: authError }), {
        status: status ?? 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Stripe configuration based on environment
    const config = getStripeConfig();
    logStep("Stripe config loaded", { mode: config.mode });
    
    const stripe = new Stripe(config.secretKey, { apiVersion: "2025-08-27.basil" });
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get request body
    const { email } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    logStep("Checking for orphan payments", { email });

    let existingUser = null;
    let page = 1;
    while (!existingUser) {
      const { data: userList, error: usersError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (usersError) throw usersError;
      existingUser = userList.users.find(user => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
      if (existingUser || userList.users.length < 1000) break;
      page++;
    }

    // Find Stripe customers with this email
    const customers = await stripe.customers.list({ email, limit: 10 });
    
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ 
        found: false, 
        message: "No Stripe customer found with this email" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check for active subscriptions
    const orphanPayments = [];
    
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 10,
      });

      for (const subscription of subscriptions.data) {
        if (!existingUser) {
          // This is an orphan payment - user paid but doesn't have an account
          const priceId = subscription.items.data[0]?.price?.id;
          if (!priceId) throw new Error(`No price found for subscription ${subscription.id}`);
          // `current_period_end` moved to subscription items in the basil API version.
          const periodEnd = subscription.current_period_end
            ?? subscription.items?.data?.[0]?.current_period_end
            ?? null;
          const { data: plan, error: planError } = await supabase
            .from('plan_parameters')
            .select('plan_type')
            .eq('stripe_price_id', priceId)
            .single();
          if (planError || !plan?.plan_type) {
            throw new Error(`No plan mapping found for Stripe price ${priceId}`);
          }

          orphanPayments.push({
            customer_id: customer.id,
            subscription_id: subscription.id,
            plan_type: plan.plan_type,
            status: subscription.status,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            created: new Date(subscription.created * 1000).toISOString()
          });
        }
      }
    }

    if (orphanPayments.length > 0) {
      logStep("Found orphan payments", { count: orphanPayments.length, email });
      
      return new Response(JSON.stringify({ 
        found: true,
        payments: orphanPayments,
        message: `Found ${orphanPayments.length} active subscription(s) without account`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      found: false,
      message: "No orphan payments found - user account already exists or no active subscriptions"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in reconcile-payments", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
