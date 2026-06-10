import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-STRIPE-MODE] ${step}${detailsStr}`);
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

    // Parse request body
    const { mode } = await req.json();
    logStep("Request received", { mode });

    // Validate mode
    if (!mode || (mode !== 'test' && mode !== 'live')) {
      throw new Error("Invalid mode. Must be 'test' or 'live'");
    }

    return new Response(
      JSON.stringify({
        error: "Stripe mode must be changed through managed Supabase secrets and a controlled deployment.",
        requested_mode: mode,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 501,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
