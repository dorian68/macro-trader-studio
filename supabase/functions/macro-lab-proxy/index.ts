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

    // Parse body to extract and log critical fields for debugging
    let parsedBody: any = null;
    let jobIdFromPayload: string | null = null;
    let requestType: string | null = null;
    let instrument: string | null = null;

    try {
      parsedBody = JSON.parse(body);
      jobIdFromPayload = parsedBody?.job_id || null;
      requestType = parsedBody?.type || null;
      instrument = parsedBody?.instrument || null;
    } catch (parseError) {
      console.log(`[macro-lab-proxy] body parse failed`, {
        reqId,
        error: parseError instanceof Error ? parseError.message : String(parseError),
        bodyPreview: body.substring(0, 200),
      });
    }

    console.log(`[macro-lab-proxy] payload inspection`, {
      reqId,
      job_id: jobIdFromPayload,
      job_id_present: !!jobIdFromPayload,
      type: requestType,
      instrument: instrument,
      bodyBytes: body.length,
    });

    console.log(`[macro-lab-proxy] forwarding to backend`, {
      reqId,
      target: TARGET_URL,
      job_id: jobIdFromPayload,
      bodyBytes: body.length,
    });

    const startedAt = Date.now();
    const upstream = await fetch(TARGET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const upstreamText = await upstream.text();

    // Parse upstream response to verify job_id echo
    let upstreamJobId: string | null = null;
    try {
      const upstreamParsed = JSON.parse(upstreamText);
      // Backend may return job_id at different paths
      upstreamJobId = upstreamParsed?.job_id 
        || upstreamParsed?.message?.job_id 
        || upstreamParsed?.body?.message?.job_id 
        || null;
    } catch {
      // Ignore parse errors for response logging
    }

    console.log(`[macro-lab-proxy] upstream response`, {
      reqId,
      status: upstream.status,
      ms: Date.now() - startedAt,
      upstreamBodyBytes: upstreamText.length,
      job_id_in_response: upstreamJobId,
      job_id_roundtrip: jobIdFromPayload === upstreamJobId ? 'MATCH' : 'MISMATCH',
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
