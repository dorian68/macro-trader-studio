import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan mapping to Stripe price IDs
const PLAN_PRICE_MAP = {
  basic: "price_1SC398Bbyt0kGZ1fmyLGVmWa",
  standard: "price_1SC39lBbyt0kGZ1fUhOBloBb", 
  premium: "price_1SC39zBbyt0kGZ1fvhRYyA0x"
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

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2025-08-27.basil",
    });
    logStep("Stripe initialized");

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Parse request body
    const { plan, success_url, cancel_url }: CheckoutRequest = await req.json();
    logStep("Request parsed", { plan });

    if (!plan || !PLAN_PRICE_MAP[plan]) {
      throw new Error(`Invalid plan: ${plan}`);
    }

    const priceId = PLAN_PRICE_MAP[plan];
    logStep("Price ID retrieved", { priceId });

    // Get origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://22f2a47e-97ad-4d12-9369-04abd2bd2d8c.lovableproject.com";
    
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

    // Create checkout session
    const sessionData: any = {
      line_items: [
        {
          price: priceId,
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
        origin: origin
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