import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getStripeConfig } from "../_shared/stripe-config.ts";
import { requireVerifiedUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

function safeReturnUrl(requestOrigin: string | null): string {
  const fallbackOrigin = "https://alphalensai.com";
  const allowedOrigins = new Set([fallbackOrigin]);
  try {
    const siteUrl = Deno.env.get("SITE_URL");
    if (siteUrl) allowedOrigins.add(new URL(siteUrl).origin);
  } catch {
    // Keep the canonical fallback only.
  }
  if (requestOrigin?.startsWith("http://localhost:") || requestOrigin?.startsWith("http://127.0.0.1:")) {
    allowedOrigins.add(requestOrigin);
  }
  return `${allowedOrigins.has(requestOrigin ?? "") ? requestOrigin : fallbackOrigin}/dashboard`;
}

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
      return new Response(JSON.stringify({ error: authError }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: status ?? 401,
      });
    }

    const config = getStripeConfig();
    logStep("Stripe config loaded", { mode: config.mode });
    
    const stripe = new Stripe(config.secretKey, { 
      apiVersion: "2025-08-27.basil",
    });

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Find Stripe customer
    const customers = await stripe.customers.list({ 
      email: user.email!,
      limit: 1 
    });
    
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get origin for return URL
    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: safeReturnUrl(req.headers.get("origin")),
    });
    
    logStep("Customer portal session created", { 
      sessionId: portalSession.id, 
      url: portalSession.url 
    });

    return new Response(JSON.stringify({ 
      url: portalSession.url 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
