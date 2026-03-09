import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getStripeConfig } from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckoutRequest {
  plan: 'basic' | 'standard' | 'premium';
  success_url?: string;
  cancel_url?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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

    // Parse request body
    const { plan, success_url, cancel_url }: CheckoutRequest = await req.json();
    logStep("Request parsed", { plan });

    if (!plan) {
      throw new Error(`Plan type is required`);
    }

    // Get plan parameters including stripe_price_id from Supabase
    const { data: planParams, error: planError } = await supabaseClient
      .from('plan_parameters')
      .select('monthly_price_usd, stripe_price_id')
      .eq('plan_type', plan)
      .single();

    if (planError || !planParams) {
      logStep("Plan not found in database", { plan, error: planError });
      throw new Error(`Plan ${plan} not found`);
    }

    if (!planParams.stripe_price_id) {
      logStep("No stripe_price_id configured for plan", { plan });
      throw new Error(`Plan ${plan} does not have a Stripe price ID configured. Please set stripe_price_id in plan_parameters.`);
    }

    logStep("Plan parameters retrieved", { 
      plan, 
      price: planParams.monthly_price_usd,
      stripe_price_id: planParams.stripe_price_id 
    });

    // Get origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://alphalensai.com";
    
    // Try to get authenticated user (optional for guest checkout)
    let userEmail = null;
    let customerId = null;
    
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseClient.auth.getUser(token);
        
        if (data.user?.email) {
          userEmail = data.user.email;
          logStep("User authenticated", { email: userEmail });

          // Check if Stripe customer exists
          const customers = await stripe.customers.list({ 
            email: userEmail, 
            limit: 1 
          });
          
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
            logStep("Existing customer found", { customerId });
          }
        }
      }
    } catch (authError: any) {
      logStep("Authentication failed, proceeding with guest checkout", { error: authError?.message || authError });
    }

    // Create checkout session using the stored Stripe price ID
    const sessionData: any = {
      line_items: [
        {
          price: planParams.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: success_url || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${origin}/payment-canceled`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      metadata: {
        plan_type: plan,
        origin: origin,
        user_authenticated: userEmail ? 'true' : 'false',
        timestamp: new Date().toISOString(),
        checkout_type: userEmail ? 'authenticated' : 'guest',
      }
    };

    // Set customer info
    if (customerId) {
      sessionData.customer = customerId;
    } else if (userEmail) {
      sessionData.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionData);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: "Failed to create checkout session"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
