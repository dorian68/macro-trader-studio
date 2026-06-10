import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { consumeProductCredit, refundProductCredit, requireProductAccess } from "../_shared/auth.ts";
import { getSecureUpstream } from "../_shared/upstream.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let consumedCredit: { userId: string; referenceId: string } | null = null;
  try {
    // Only allow POST
    if (req.method !== "POST") {
      console.error("[forecast-proxy] Method not allowed:", req.method);
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Require an authenticated end-user (prevents anonymous abuse of paid compute)
    const { user, error: authError, status } = await requireProductAccess(req, 'queries');
    if (!user) {
      console.warn("[forecast-proxy] Request rejected:", authError);
      return new Response(
        JSON.stringify({ error: authError }),
        { status: status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Forward the request body to EC2
    const body = await req.text();
    if (!body || body.length > 1_000_000) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "Request body must be valid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const consumed = await consumeProductCredit(user.id, 'queries', 'forecast-proxy');
    if (!consumed.success) {
      return new Response(JSON.stringify({ error: consumed.error }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    consumedCredit = { userId: user.id, referenceId: consumed.referenceId };
    const upstreamConfig = getSecureUpstream('FORECAST_API_URL');
    console.log("[forecast-proxy] Request body bytes:", body.length);

    const response = await fetch(upstreamConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Backend-Secret": upstreamConfig.secret,
      },
      body,
    });

    // Get the response data
    const responseText = await response.text();
    
    console.log("[forecast-proxy] Response status:", response.status);
    console.log("[forecast-proxy] Response preview:", responseText.substring(0, 500));
    if (!response.ok && consumedCredit) {
      await refundProductCredit(consumedCredit.userId, 'queries', 'forecast-proxy-failed', consumedCredit.referenceId);
      consumedCredit = null;
    }

    // Return the response as-is
    return new Response(responseText, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  } catch (error) {
    console.error("[forecast-proxy] Error:", error);
    if (consumedCredit) {
      await refundProductCredit(consumedCredit.userId, 'queries', 'forecast-proxy-failed', consumedCredit.referenceId);
    }
    return new Response(
      JSON.stringify({ 
        error: "Proxy error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
