import { corsHeaders } from "../_shared/cors.ts";

const SURFACE_API_URL = Deno.env.get("ALPHALENS_SURFACE_API_URL") || "http://3.17.224.165:8001/surface";

Deno.serve(async (req) => {
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

    // Build the request payload for the Surface API
    // Note: horizon_hours expects a single float, not an array
    const horizonHours = Array.isArray(body.horizon_hours) 
      ? body.horizon_hours[0] 
      : (body.horizon_hours ?? 1);

    const surfacePayload = {
      symbol: body.symbol,
      timeframe: body.timeframe,
      horizon_hours: horizonHours,
      skew: body.skew ?? 0.0, // Skew parameter: 0 = symmetric, >0 = right skew, <0 = left skew
      paths: body.paths ?? 1000,
      dof: body.dof ?? 3.0,
      target_prob: body.target_prob ?? { min: 0.05, max: 0.95, steps: 30 },
      sl_sigma: body.sl_sigma ?? { min: 0.1, max: 8.0, steps: 30 },
      // Pass methodology ONLY if present in request (optional field)
      ...(body.methodology && { methodology: body.methodology }),
    };

    console.log("[surface-proxy] Forwarding to Surface API:", SURFACE_API_URL);
    console.log("[surface-proxy] Payload:", JSON.stringify(surfacePayload));

    // Forward the request to the Surface API
    const response = await fetch(SURFACE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(surfacePayload),
    });

    const responseText = await response.text();
    console.log("[surface-proxy] Response status:", response.status);
    console.log("[surface-proxy] Response preview:", responseText.substring(0, 500));

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
