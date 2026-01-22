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
  const reqId = crypto.randomUUID();
  const origin = req.headers.get("origin") || "(no origin)";
  const method = req.method;
  const url = new URL(req.url);

  console.log(`[macro-lab-proxy] start`, {
    reqId,
    method,
    path: url.pathname,
    origin,
    ua: req.headers.get("user-agent") || null,
  });

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`[macro-lab-proxy] preflight ok`, { reqId, origin });
    return new Response(null, { headers: corsHeadersWithMethods });
  }

  try {
    if (req.method !== "POST") {
      console.log(`[macro-lab-proxy] method not allowed`, { reqId, method });
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();

    console.log(`[macro-lab-proxy] forwarding`, {
      reqId,
      target: TARGET_URL,
      bodyBytes: body.length,
    });

    const startedAt = Date.now();
    const upstream = await fetch(TARGET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const upstreamText = await upstream.text();

    console.log(`[macro-lab-proxy] upstream response`, {
      reqId,
      status: upstream.status,
      ms: Date.now() - startedAt,
      upstreamBodyBytes: upstreamText.length,
    });

    return new Response(upstreamText, {
      status: upstream.status,
      headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.log(`[macro-lab-proxy] error`, {
      reqId,
      message: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({
        error: "Proxy error",
        message: error instanceof Error ? error.message : "Unknown error",
        reqId,
      }),
      { status: 500, headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" } }
    );
  }
});
