/**
 * Admin data export → multi-sheet Excel (.xlsx).
 *
 * Generates a workbook covering everything currently logged so a super_user can
 * investigate all user activity offline:
 *   - Users           : account + plan + credits + role
 *   - Activity by user: per-user request counts, errors, estimated cost
 *   - Daily           : requests + estimated cost per day
 *   - Requests        : every job — who/what/when/status + the actual request
 *                       and response payloads (model/tokens surfaced when present)
 *   - Credit transactions : the credit ledger
 *
 * NOTE on cost/model/tokens: the platform does NOT log real per-request cost,
 * model or token usage today, so `est_cost_usd` is an ESTIMATE (fixed price per
 * feature, same map the dashboard uses) and model/tokens are best-effort scraped
 * from the response JSON when present.
 *
 * SheetJS is loaded on demand from the official CDN (no npm dependency, no
 * bundle impact).
 */
import { supabase } from '@/integrations/supabase/client';

const SHEETJS_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
const CELL_MAX = 30000; // Excel cell hard limit is 32767 chars

// Same estimate the dashboard uses (no real cost is logged).
const FEATURE_COST: Record<string, number> = {
  'ai trade setup': 0.06,
  'macro commentary': 0.07,
  'report': 0.14,
};

function normFeature(feature?: string | null): string {
  return (feature ?? '').trim().toLowerCase().replace(/_/g, ' ');
}
function featureCost(feature?: string | null): number {
  return FEATURE_COST[normFeature(feature)] ?? 0;
}

let xlsxPromise: Promise<any> | null = null;
function loadXLSX(): Promise<any> {
  const w = window as any;
  if (w.XLSX) return Promise.resolve(w.XLSX);
  if (!xlsxPromise) {
    xlsxPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SHEETJS_URL;
      s.async = true;
      s.onload = () => (w.XLSX ? resolve(w.XLSX) : reject(new Error('Excel library failed to initialize')));
      s.onerror = () => reject(new Error('Could not load the Excel library (network).'));
      document.head.appendChild(s);
    });
  }
  return xlsxPromise;
}

function clip(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s.length > CELL_MAX ? s.slice(0, CELL_MAX) + '…[truncated]' : s;
}

function extractModel(resp: any): string {
  try {
    return String(resp?.model ?? resp?.body?.model ?? resp?.response?.model ?? '');
  } catch {
    return '';
  }
}
function extractTokens(resp: any): string {
  try {
    const u = resp?.usage ?? resp?.body?.usage ?? resp?.response?.usage;
    if (!u) return '';
    return `total:${u.total_tokens ?? '?'} prompt:${u.prompt_tokens ?? '?'} completion:${u.completion_tokens ?? '?'}`;
  } catch {
    return '';
  }
}

async function fetchAllJobs(): Promise<any[]> {
  const pageSize = 1000;
  let from = 0;
  const all: any[] = [];
  // PostgREST caps at 1000 rows/request — page until exhausted.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from('jobs')
      .select('id,user_id,feature,status,created_at,updated_at,request_payload,response_payload')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export interface AdminExportUser {
  user_id: string;
  email?: string;
  status?: string;
  user_plan?: string | null;
  broker_name?: string | null;
  roles?: string[];
  created_at?: string;
  is_deleted?: boolean;
}

/**
 * Build and download the admin workbook. `users` should be the list returned by
 * the `fetch-users-with-emails` edge function (already used by the dashboard).
 */
export async function exportAdminWorkbook(users: AdminExportUser[]): Promise<{ users: number; requests: number }> {
  const emailById = new Map<string, string>();
  users.forEach((u) => u.user_id && emailById.set(u.user_id, u.email ?? ''));

  const [jobs, creditsRes, txRes] = await Promise.all([
    fetchAllJobs(),
    supabase
      .from('user_credits')
      .select('user_id, plan_type, credits_queries_remaining, credits_ideas_remaining, credits_reports_remaining, last_reset_date'),
    supabase.from('credit_transactions').select('*').order('created_at', { ascending: false }),
  ]);

  const credits = creditsRes.data ?? [];
  const txs = (txRes.data ?? []) as any[];
  const creditById = new Map<string, any>();
  credits.forEach((c: any) => creditById.set(c.user_id, c));

  // --- Sheet: Users ---
  const usersSheet = users.map((u) => {
    const c = creditById.get(u.user_id);
    return {
      email: u.email ?? '',
      status: u.status ?? '',
      plan: u.user_plan ?? c?.plan_type ?? '',
      roles: (u.roles ?? []).join(', '),
      broker: u.broker_name ?? '',
      queries_left: c?.credits_queries_remaining ?? '',
      ideas_left: c?.credits_ideas_remaining ?? '',
      reports_left: c?.credits_reports_remaining ?? '',
      created_at: u.created_at ?? '',
      is_deleted: u.is_deleted ?? false,
      user_id: u.user_id,
    };
  });

  // --- Sheet: Requests ---
  const requests = jobs.map((j) => {
    const durationSec =
      j.created_at && j.updated_at
        ? Math.round((new Date(j.updated_at).getTime() - new Date(j.created_at).getTime()) / 1000)
        : '';
    return {
      created_at: j.created_at ?? '',
      user_email: emailById.get(j.user_id) ?? j.user_id,
      feature: j.feature ?? '',
      status: j.status ?? '',
      duration_sec: durationSec,
      est_cost_usd: featureCost(j.feature),
      model: extractModel(j.response_payload),
      tokens: extractTokens(j.response_payload),
      request: clip(j.request_payload),
      response: clip(j.response_payload),
      job_id: j.id,
    };
  });

  // --- Sheet: Activity by user ---
  const byUser = new Map<string, any>();
  for (const j of jobs) {
    const e =
      byUser.get(j.user_id) ??
      {
        user_email: emailById.get(j.user_id) ?? j.user_id,
        total: 0,
        ai_trade_setup: 0,
        macro_commentary: 0,
        report: 0,
        errors: 0,
        est_cost_usd: 0,
      };
    e.total += 1;
    const f = normFeature(j.feature);
    if (f === 'ai trade setup') e.ai_trade_setup += 1;
    else if (f === 'macro commentary') e.macro_commentary += 1;
    else if (f === 'report') e.report += 1;
    if (j.status === 'error') e.errors += 1;
    e.est_cost_usd += featureCost(j.feature);
    byUser.set(j.user_id, e);
  }
  const activity = [...byUser.values()]
    .map((e) => ({ ...e, est_cost_usd: Number(e.est_cost_usd.toFixed(2)) }))
    .sort((a, b) => b.total - a.total);

  // --- Sheet: Daily ---
  const byDay = new Map<string, any>();
  for (const j of jobs) {
    const day = (j.created_at ?? '').slice(0, 10);
    const e = byDay.get(day) ?? { date: day, requests: 0, est_cost_usd: 0 };
    e.requests += 1;
    e.est_cost_usd += featureCost(j.feature);
    byDay.set(day, e);
  }
  const daily = [...byDay.values()]
    .map((e) => ({ ...e, est_cost_usd: Number(e.est_cost_usd.toFixed(2)) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  // --- Sheet: Credit transactions ---
  const txSheet = txs.map((t) => ({ user_email: emailById.get(t.user_id) ?? t.user_id, ...t }));

  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersSheet), 'Users');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activity), 'Activity by user');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(daily), 'Daily');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(requests), 'Requests');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txSheet), 'Credit transactions');

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  XLSX.writeFile(wb, `alphalens-admin-export-${stamp}.xlsx`);

  return { users: usersSheet.length, requests: requests.length };
}
