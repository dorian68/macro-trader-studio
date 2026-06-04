import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";

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

    // Require an authenticated end-user (prevents anonymous abuse of paid compute)
    const { user, error: authError } = await requireUser(req);
    if (!user) {
      console.warn("[forecast-proxy] Unauthenticated request rejected:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Backend API URL — new IP endpoint
    const apiUrl = "http://178.105.21.238:8000/forecast";

    // Forward the request body to EC2
    const body = await req.text();
    console.log("[forecast-proxy] Forwarding request to:", apiUrl);
    console.log("[forecast-proxy] Request body:", body);

    const response = await fetch(apiUrl, {
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
