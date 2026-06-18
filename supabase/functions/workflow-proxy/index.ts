import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  consumeProductCredit,
  refundProductCredit,
  requireProductAccess,
} from "../_shared/auth.ts";
import { extractUsage, logAiUsage } from "../_shared/ai-usage.ts";

const PYTHON_BACKEND_URL = "http://178.105.21.238:9000/run";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CreditFeature = 'queries' | 'ideas' | 'reports';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveCreditFeature(payload: Record<string, unknown>): CreditFeature {
  const type = String(payload.type ?? '').toLowerCase();
  const mode = String(payload.mode ?? '').toLowerCase();
  if (type.includes('report')) return 'reports';
  if (
    type.includes('trade') ||
    mode.includes('trade') ||
    payload.isTradeQuery === true
  ) {
    return 'ideas';
  }
  return 'queries';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let consumedCredit: { userId: string; feature: CreditFeature; referenceId: string } | null = null;
  let engagedJob: { id: string; userId: string } | null = null;

  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.length > 1_000_000) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error("Request body must be a JSON object");
    }

    const feature = resolveCreditFeature(payload);
    const suppliedJobId = typeof payload.job_id === 'string' ? payload.job_id : null;
    const jobId = suppliedJobId && isUuid(suppliedJobId) ? suppliedJobId : null;
    const { user, error: authError, status } = await requireProductAccess(
      req,
      jobId ? undefined : feature,
    );
    if (!user) {
      return new Response(JSON.stringify({ error: authError }), {
        status: status ?? 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (jobId) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );
      const { data: engagement, error: engagementError } = await admin
        .from('credits_engaged')
        .select('id')
        .eq('job_id', jobId)
        .eq('user_id', user.id)
        .eq('feature', feature)
        .maybeSingle();
      if (engagementError || !engagement) {
        return new Response(JSON.stringify({ error: "No matching credit engagement found for this job" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: claimedJob, error: claimError } = await admin
        .from('jobs')
        .update({ status: 'running' })
        .eq('id', jobId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimedJob) {
        return new Response(JSON.stringify({ error: "Job is already running or completed" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      engagedJob = { id: jobId, userId: user.id };
    } else {
      const consumed = await consumeProductCredit(user.id, feature, 'workflow-proxy');
      if (!consumed.success) {
        return new Response(JSON.stringify({ error: consumed.error }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      consumedCredit = { userId: user.id, feature, referenceId: consumed.referenceId };
    }

    const upstream = await fetch(PYTHON_BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        user_id: user.id,
        authenticated_user_id: user.id,
      }),
    });
    const responseText = await upstream.text();

    if (!upstream.ok) {
      throw new Error(`Workflow provider returned HTTP ${upstream.status}`);
    }
    if (engagedJob) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );
      let responsePayload: unknown = responseText;
      try {
        responsePayload = JSON.parse(responseText);
      } catch {
        // Preserve non-JSON provider responses as a JSON string.
      }
      const { error: jobError } = await admin
        .from('jobs')
        .update({ status: 'completed', response_payload: responsePayload })
        .eq('id', engagedJob.id)
        .eq('user_id', engagedJob.userId)
        .eq('status', 'running');
      if (jobError) throw jobError;
    }

    // Best-effort usage logging (never throws). Captures model/tokens only when
    // the upstream engine includes them in its response.
    try {
      let rp: unknown = responseText;
      try { rp = JSON.parse(responseText); } catch { /* keep raw */ }
      const u = extractUsage(rp);
      if (u.model || u.total != null) {
        await logAiUsage({
          userId: user.id,
          jobId: engagedJob?.id ?? null,
          feature,
          source: 'workflow-proxy',
          model: u.model,
          promptTokens: u.prompt,
          completionTokens: u.completion,
          totalTokens: u.total,
        });
      }
    } catch { /* never block the response */ }

    return new Response(responseText, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    if (consumedCredit) {
      const refund = await refundProductCredit(
        consumedCredit.userId,
        consumedCredit.feature,
        'workflow-proxy-failed',
        consumedCredit.referenceId,
      );
      if (!refund.success) console.error('[workflow-proxy] Credit refund failed:', refund.error);
    }
    if (engagedJob) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );
      await admin
        .from('jobs')
        .update({ status: 'error' })
        .eq('id', engagedJob.id)
        .eq('user_id', engagedJob.userId)
        .eq('status', 'running');
    }

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Workflow proxy failed",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
