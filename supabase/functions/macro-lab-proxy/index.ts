import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { corsHeaders } from "../_shared/cors.ts";
import { requireProductAccess } from "../_shared/auth.ts";
import { extractUsage, logAiUsage } from "../_shared/ai-usage.ts";

const MACRO_LAB_API_URL = "http://178.105.21.238:9000/run";

const corsHeadersWithMethods = {
  ...corsHeaders,
  // Required for browser CORS preflight (otherwise fetch throws "Failed to fetch")
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type CreditFeature = 'queries' | 'ideas';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveCreditFeature(payload: Record<string, unknown>): CreditFeature {
  const mode = String(payload.mode ?? '').toLowerCase();
  return mode.includes('trade') || payload.isTradeQuery === true ? 'ideas' : 'queries';
}

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
  let claimedJob: { id: string; userId: string } | null = null;

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

    // Require an authenticated end-user (prevents anonymous abuse of paid compute)
    const { user, error: authError, status } = await requireProductAccess(req);
    if (!user) {
      console.warn(`[macro-lab-proxy] request rejected`, { reqId, authError });
      return new Response(JSON.stringify({ error: authError }), {
        status: status ?? 403,
        headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    if (!body || body.length > 1_000_000) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" },
      });
    }

    // Parse body to extract and log critical fields for debugging
    let parsedBody: Record<string, unknown>;
    let jobIdFromPayload: string | null = null;
    let requestType: string | null = null;
    let instrument: string | null = null;

    try {
      parsedBody = JSON.parse(body);
      if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
        throw new Error("Request body must be a JSON object");
      }
      jobIdFromPayload = typeof parsedBody.job_id === 'string' && isUuid(parsedBody.job_id)
        ? parsedBody.job_id
        : null;
      requestType = typeof parsedBody.type === 'string' ? parsedBody.type : null;
      instrument = typeof parsedBody.instrument === 'string' ? parsedBody.instrument : null;
    } catch (parseError) {
      console.log(`[macro-lab-proxy] body parse failed`, {
        reqId,
        error: parseError instanceof Error ? parseError.message : String(parseError),
        bodyPreview: body.substring(0, 200),
      });
      return new Response(JSON.stringify({ error: "Request body must be valid JSON" }), {
        status: 400,
        headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" },
      });
    }

    if (!jobIdFromPayload) {
      return new Response(JSON.stringify({ error: "A valid engaged job_id is required" }), {
        status: 400,
        headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const requiredFeature = resolveCreditFeature(parsedBody);
    const { data: engagement, error: engagementError } = await admin
      .from('credits_engaged')
      .select('id')
      .eq('job_id', jobIdFromPayload)
      .eq('user_id', user.id)
      .eq('feature', requiredFeature)
      .maybeSingle();

    if (engagementError || !engagement) {
      return new Response(JSON.stringify({ error: "No valid credit engagement found for this job" }), {
        status: 402,
        headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" },
      });
    }
    const { data: claimedJobRow, error: claimError } = await admin
      .from('jobs')
      .update({ status: 'running' })
      .eq('id', jobIdFromPayload)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimedJobRow) {
      return new Response(JSON.stringify({ error: "Job is already running or completed" }), {
        status: 409,
        headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" },
      });
    }
    claimedJob = { id: jobIdFromPayload, userId: user.id };

    console.log(`[macro-lab-proxy] payload inspection`, {
      reqId,
      job_id: jobIdFromPayload,
      job_id_present: !!jobIdFromPayload,
      credit_feature: requiredFeature,
      type: requestType,
      instrument: instrument,
      bodyBytes: body.length,
    });

    console.log(`[macro-lab-proxy] forwarding to backend`, {
      reqId,
      job_id: jobIdFromPayload,
      bodyBytes: body.length,
    });

    const startedAt = Date.now();
    const upstream = await fetch(MACRO_LAB_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...parsedBody,
        user_id: user.id,
        authenticated_user_id: user.id,
      }),
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

    let responsePayload: unknown = upstreamText;
    try {
      responsePayload = JSON.parse(upstreamText);
    } catch {
      // Preserve non-JSON provider responses as a JSON string.
    }
    const { error: jobUpdateError } = await admin
      .from('jobs')
      .update(
        upstream.ok
          ? { status: 'completed', response_payload: responsePayload }
          : { status: 'error' },
      )
      .eq('id', jobIdFromPayload)
      .eq('user_id', user.id)
      .eq('status', 'running');
    if (jobUpdateError) throw jobUpdateError;

    // Best-effort usage logging (never throws). Captures model/tokens only when
    // the upstream engine includes them in its response.
    if (upstream.ok) {
      const u = extractUsage(responsePayload);
      if (u.model || u.total != null) {
        await logAiUsage({
          userId: user.id,
          jobId: jobIdFromPayload,
          feature: requiredFeature,
          source: 'macro-lab-proxy',
          model: u.model,
          promptTokens: u.prompt,
          completionTokens: u.completion,
          totalTokens: u.total,
        });
      }
    }

    return new Response(upstreamText, {
      status: upstream.status,
      headers: { ...corsHeadersWithMethods, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.log(`[macro-lab-proxy] error`, {
      reqId,
      message: error instanceof Error ? error.message : String(error),
    });
    if (claimedJob) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );
      await admin
        .from('jobs')
        .update({ status: 'error' })
        .eq('id', claimedJob.id)
        .eq('user_id', claimedJob.userId)
        .eq('status', 'running');
    }
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
