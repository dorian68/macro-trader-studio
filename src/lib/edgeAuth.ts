import { supabase } from '@/integrations/supabase/client';

/**
 * Headers for calling an edge function via a raw `fetch()` (i.e. not through
 * `supabase.functions.invoke`, which attaches the token automatically).
 *
 * Includes the current user's access token so server-side `requireUser()`
 * guards can authenticate the caller. Use on pages that are already behind
 * AuthGuard, where a session is guaranteed to exist.
 */
export async function edgeAuthHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
    ...extra,
  };
}
