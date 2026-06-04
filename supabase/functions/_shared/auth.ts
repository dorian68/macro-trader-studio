// Shared auth helper for edge functions that must only be callable by a
// genuinely authenticated end-user.
//
// NOTE: setting `verify_jwt = true` at the gateway is NOT sufficient on its own,
// because the public anon key is itself a valid (role=anon) JWT and would pass
// gateway verification. Validating the token with `auth.getUser(token)` is what
// actually proves a real user session (the anon key has no `sub`/user).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

export interface AuthResult {
  user: { id: string; email?: string } | null;
  error: string | null;
}

export async function requireUser(req: Request): Promise<AuthResult> {
  const authHeader =
    req.headers.get('Authorization') ?? req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return { user: null, error: 'Missing bearer token' };
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: 'Invalid or expired session' };
  }

  return { user: data.user, error: null };
}
