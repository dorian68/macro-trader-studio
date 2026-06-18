// Best-effort AI usage logger. NEVER throws — callers can fire it without
// risking the request flow. Records model + token usage + computed cost into
// public.ai_usage. Real usage is logged where it is actually available; where a
// provider streams or omits usage, tokens are simply null.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

// Approximate USD price per 1M tokens. Extend as models are added; unknown
// models simply get a null cost (tokens are still recorded).
const MODEL_RATES: Record<string, { in: number; out: number }> = {
  'google/gemini-2.5-flash': { in: 0.30, out: 2.50 },
  'gemini-2.5-flash': { in: 0.30, out: 2.50 },
  'google/gemini-2.5-pro': { in: 1.25, out: 10.0 },
  'gemini-2.5-pro': { in: 1.25, out: 10.0 },
};

function rateFor(model?: string | null): { in: number; out: number } | null {
  if (!model) return null;
  const key = model.toLowerCase();
  return MODEL_RATES[key] ?? MODEL_RATES[key.replace(/^.*\//, '')] ?? null;
}

export interface ExtractedUsage {
  model: string | null;
  prompt: number | null;
  completion: number | null;
  total: number | null;
}

/** Pull model + token usage out of an OpenAI- or Anthropic-shaped response. */
export function extractUsage(resp: unknown): ExtractedUsage {
  const out: ExtractedUsage = { model: null, prompt: null, completion: null, total: null };
  try {
    const r = (resp ?? {}) as any;
    out.model = r.model ?? r.body?.model ?? r.response?.model ?? null;
    const u = r.usage ?? r.body?.usage ?? r.response?.usage ?? null;
    if (u) {
      out.prompt = u.prompt_tokens ?? u.input_tokens ?? null;
      out.completion = u.completion_tokens ?? u.output_tokens ?? null;
      out.total = u.total_tokens ?? (((out.prompt ?? 0) + (out.completion ?? 0)) || null);
    }
  } catch {
    /* ignore */
  }
  return out;
}

export interface AiUsageRecord {
  userId?: string | null;
  jobId?: string | null;
  feature?: string | null;
  source: string;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
}

export async function logAiUsage(rec: AiUsageRecord): Promise<void> {
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const rate = rateFor(rec.model);
    let cost: number | null = null;
    if (rate && (rec.promptTokens != null || rec.completionTokens != null)) {
      cost = ((rec.promptTokens ?? 0) * rate.in + (rec.completionTokens ?? 0) * rate.out) / 1_000_000;
      cost = Math.round(cost * 1e6) / 1e6;
    }

    await admin.from('ai_usage').insert({
      user_id: rec.userId ?? null,
      job_id: rec.jobId ?? null,
      feature: rec.feature ?? null,
      source: rec.source,
      model: rec.model ?? null,
      prompt_tokens: rec.promptTokens ?? null,
      completion_tokens: rec.completionTokens ?? null,
      total_tokens: rec.totalTokens ?? null,
      cost_usd: cost,
    });
  } catch (e) {
    console.error('[ai-usage] log failed (ignored):', e instanceof Error ? e.message : e);
  }
}
