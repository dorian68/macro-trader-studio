import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const corsHeadersWithMethods = {
  ...corsHeaders,
  // Required for browser CORS preflight (otherwise fetch throws "Failed to fetch")
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Proxy target (HTTP) for internal Macro Lab webhook
const TARGET_URL = "http://3.137.115.96:9000/run";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersWithMethods });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();

    const upstream = await fetch(TARGET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const upstreamText = await upstream.text();

    return new Response(upstreamText, {
      status: upstream.status,
      headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Proxy error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" } }
    );
  }
});
