// Shared auth helper for edge functions that must only be callable by a
// genuinely authenticated end-user.
//
// NOTE: setting `verify_jwt = true` at the gateway is NOT sufficient on its own,
// because the public anon key is itself a valid (role=anon) JWT and would pass
// gateway verification. Validating the token with `auth.getUser(token)` is what
// actually proves a real user session (the anon key has no `sub`/user).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

type AppRole = 'user' | 'admin' | 'super_user';
type CreditFeature = 'queries' | 'ideas' | 'reports';

export interface AuthResult {
  user: { id: string; email?: string; email_confirmed_at?: string | null } | null;
  error: string | null;
  status?: number;
  serviceRole?: boolean;
}

function getBearerToken(req: Request): string | null {
  const authHeader =
    req.headers.get('Authorization') ?? req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  return token || null;
}

export function isServiceRoleRequest(req: Request): boolean {
  const token = getBearerToken(req);
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return !!token && !!serviceRoleKey && token === serviceRoleKey;
}

export async function requireUserOrService(req: Request): Promise<AuthResult> {
  if (isServiceRoleRequest(req)) {
    return { user: null, error: null, serviceRole: true };
  }

  const token = getBearerToken(req);
  if (!token) return { user: null, error: 'Missing authorization header', status: 401 };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: 'Invalid or expired session', status: 401 };
  }

  return { user: data.user, error: null, serviceRole: false };
}

export async function requireUser(req: Request): Promise<AuthResult> {
  const result = await requireUserOrService(req);
  if (result.serviceRole) {
    return { user: null, error: 'End-user session required', status: 401 };
  }
  return result;
}

export async function requireVerifiedUser(req: Request): Promise<AuthResult> {
  const result = await requireUser(req);
  if (result.error || !result.user) return result;
  if (!result.user.email || !result.user.email_confirmed_at) {
    return { user: null, error: 'Verified email required', status: 403 };
  }
  return result;
}

export async function requireRole(req: Request, allowedRoles: AppRole[]): Promise<AuthResult> {
  const caller = await requireUserOrService(req);
  if (caller.error || caller.serviceRole) return caller;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data, error } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', caller.user!.id)
    .in('role', allowedRoles);

  if (error) return { user: null, error: 'Failed to verify permissions', status: 500 };
  if (!data?.length) return { user: null, error: 'Insufficient permissions', status: 403 };
  return caller;
}

export async function requireProductAccess(
  req: Request,
  feature?: CreditFeature,
): Promise<AuthResult> {
  const caller = await requireUserOrService(req);
  if (caller.error || caller.serviceRole) return caller;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('status, user_plan, is_deleted, trial_started_at')
    .eq('user_id', caller.user!.id)
    .maybeSingle();

  if (profileError) return { user: null, error: 'Failed to verify account access', status: 500 };
  if (!profile || profile.is_deleted) return { user: null, error: 'Account unavailable', status: 403 };
  if (profile.status !== 'approved') return { user: null, error: 'Account approval required', status: 403 };

  if (profile.user_plan === 'free_trial') {
    if (!profile.trial_started_at) {
      return { user: null, error: 'An active plan or free trial is required', status: 402 };
    }

    const { data: trialPlan } = await admin
      .from('plan_parameters')
      .select('trial_duration_days')
      .eq('plan_type', 'free_trial')
      .maybeSingle();

    const durationDays = trialPlan?.trial_duration_days ?? 7;
    const expiresAt = new Date(profile.trial_started_at).getTime() + durationDays * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return { user: null, error: 'Free trial expired', status: 402 };
    }
  }

  if (feature) {
    const creditColumn = {
      queries: 'credits_queries_remaining',
      ideas: 'credits_ideas_remaining',
      reports: 'credits_reports_remaining',
    }[feature];

    const [{ data: credits, error: creditsError }, { count, error: engagedError }] = await Promise.all([
      admin.from('user_credits').select(creditColumn).eq('user_id', caller.user!.id).maybeSingle(),
      admin
        .from('credits_engaged')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', caller.user!.id)
        .eq('feature', feature),
    ]);

    if (creditsError || engagedError) {
      return { user: null, error: 'Failed to verify available credits', status: 500 };
    }

    const total = Number((credits as Record<string, number> | null)?.[creditColumn] ?? 0);
    if (total - (count ?? 0) <= 0) {
      return { user: null, error: 'No credits available', status: 402 };
    }
  }

  return caller;
}

export async function consumeProductCredit(
  userId: string,
  feature: CreditFeature,
  source: string,
): Promise<{ success: boolean; error: string | null; referenceId: string }> {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const referenceId = crypto.randomUUID();
  const { data, error } = await admin.rpc('consume_credit_service', {
    p_user_id: userId,
    p_feature: feature,
    p_source: source,
    p_reference_id: referenceId,
  });

  if (error) return { success: false, error: error.message, referenceId };
  return { success: data === true, error: data === true ? null : 'No credits available', referenceId };
}

export async function refundProductCredit(
  userId: string,
  feature: CreditFeature,
  source: string,
  consumedReferenceId: string,
): Promise<{ success: boolean; error: string | null }> {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data, error } = await admin.rpc('refund_credit_service', {
    p_user_id: userId,
    p_feature: feature,
    p_source: source,
    p_reference_id: `refund:${consumedReferenceId}`,
  });

  if (error) return { success: false, error: error.message };
  return { success: data === true, error: data === true ? null : 'Credit refund failed' };
}
