import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== "POST") {
      console.error("[forecast-proxy] Method not allowed:", req.method);
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API URL from environment
    const apiUrl = Deno.env.get("ALPHALENS_API_URL");
    if (!apiUrl) {
      console.error("[forecast-proxy] ALPHALENS_API_URL not configured");
      return new Response(
        JSON.stringify({ error: "Backend API URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward the request body to EC2
    const body = await req.text();
    console.log("[forecast-proxy] Forwarding request to:", `${apiUrl}/forecast`);
    console.log("[forecast-proxy] Request body:", body);

    const response = await fetch(`${apiUrl}/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    // Get the response data
    const responseText = await response.text();
    
    console.log("[forecast-proxy] Response status:", response.status);
    console.log("[forecast-proxy] Response preview:", responseText.substring(0, 500));

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
    return new Response(
      JSON.stringify({ 
        error: "Proxy error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
