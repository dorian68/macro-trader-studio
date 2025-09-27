import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

  try {
    logStep("Function started");

    // Initialize Stripe and Supabase
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
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
        // Check if user exists in Supabase
        const { data: userList } = await supabase.auth.admin.listUsers();
        const existingUser = userList?.users?.find(user => user.email === email);
        
        if (!existingUser) {
          // This is an orphan payment - user paid but doesn't have an account
          const priceId = subscription.items.data[0]?.price?.id;
          let planType = 'premium'; // default
          
          const priceToplan = {
            "price_1SC398Bbyt0kGZ1fmyLGVmWa": "basic",
            "price_1SC39lBbyt0kGZ1fUhOBloBb": "standard", 
            "price_1SC39zBbyt0kGZ1fvhRYyA0x": "premium"
          };
          
          planType = priceToplan[priceId as keyof typeof priceToplan] || 'premium';
          
          orphanPayments.push({
            customer_id: customer.id,
            subscription_id: subscription.id,
            plan_type: planType,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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