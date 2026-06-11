import { corsHeaders } from "../_shared/cors.ts";
import { consumeProductCredit, refundProductCredit, requireProductAccess } from "../_shared/auth.ts";

const SURFACE_API_URL = "http://178.105.21.238:8001/surface";

Deno.serve(async (req) => {
  let consumedCredit: { userId: string; referenceId: string } | null = null;
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  // Require an authenticated end-user (prevents anonymous abuse of paid compute)
  const { user, error: authError, status } = await requireProductAccess(req, 'queries');
  if (!user) {
    console.warn("[surface-proxy] Request rejected:", authError);
    return new Response(
      JSON.stringify({ error: authError }),
      { status: status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  try {
    const body = await req.json();
    
    console.log("[surface-proxy] Received request:", JSON.stringify(body));

    // Validate required fields
    if (!body.symbol || !body.timeframe) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: symbol, timeframe" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    const consumed = await consumeProductCredit(user.id, 'queries', 'surface-proxy');
    if (!consumed.success) {
      return new Response(JSON.stringify({ error: consumed.error }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    consumedCredit = { userId: user.id, referenceId: consumed.referenceId };

    // Build the request payload for the Surface API
    // Note: horizon_hours expects a single float, not an array
    const horizonHours = Array.isArray(body.horizon_hours) 
      ? body.horizon_hours[0] 
      : (body.horizon_hours ?? 1);

    const surfacePayload: Record<string, unknown> = {
      symbol: body.symbol,
      timeframe: body.timeframe,
      horizon_hours: horizonHours,
      skew: body.skew ?? 0.0, // Skew parameter: 0 = symmetric, >0 = right skew, <0 = left skew
      paths: body.paths ?? 1000,
      dof: body.dof ?? 3.0,
      target_prob: body.target_prob ?? { min: 0.05, max: 0.95, steps: 30 },
      sl_sigma: body.sl_sigma ?? { min: 0.1, max: 8.0, steps: 30 },
    };
    
    // CRITICAL: Pass entry_price from forecast response as single source of truth
    // This ensures the risk surface is computed using the same market entry point as the forecast
    if (body.entry_price !== undefined) {
      surfacePayload.entry_price = body.entry_price;
      console.log("[surface-proxy] Using entry_price from forecast:", body.entry_price);
    }
    
    // Pass methodology ONLY if present in request (optional field)
    if (body.methodology) {
      surfacePayload.methodology = body.methodology;
    }

    console.log("[surface-proxy] Payload:", JSON.stringify(surfacePayload));

    // Forward the request to the Surface API
    const response = await fetch(SURFACE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(surfacePayload),
    });

    const responseText = await response.text();
    console.log("[surface-proxy] Response status:", response.status);
    console.log("[surface-proxy] Response preview:", responseText.substring(0, 500));
    if (!response.ok && consumedCredit) {
      await refundProductCredit(consumedCredit.userId, 'queries', 'surface-proxy-failed', consumedCredit.referenceId);
      consumedCredit = null;
    }

    // Return the response as-is
    return new Response(responseText, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("[surface-proxy] Error:", error);
    if (consumedCredit) {
      await refundProductCredit(consumedCredit.userId, 'queries', 'surface-proxy-failed', consumedCredit.referenceId);
    }
    return new Response(
      JSON.stringify({ 
        error: "Surface proxy error", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
