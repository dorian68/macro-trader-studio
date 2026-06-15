-- Close legacy SECURITY DEFINER RPCs that were executable by anon/public.

CREATE OR REPLACE FUNCTION public.invalidate_previous_sessions(
  current_user_id uuid,
  current_session_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> current_user_id THEN
    RAISE EXCEPTION 'Unauthorized session operation';
  END IF;
  IF current_session_id IS NULL OR btrim(current_session_id) = '' THEN
    RAISE EXCEPTION 'Current session id is required';
  END IF;

  UPDATE public.user_sessions
  SET is_active = false, last_seen = now()
  WHERE user_id = current_user_id
    AND session_id <> current_session_id
    AND is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.invalidate_previous_sessions(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invalidate_previous_sessions(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.cleanup_stale_engaged_credits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_engaged_credits() TO service_role;

-- Trigger functions do not need direct client execution privileges.
REVOKE ALL ON FUNCTION public.auto_manage_credits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_last_active_super_user_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_last_active_super_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_ai_trade_setups() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_trade_setup_from_job() FROM PUBLIC, anon, authenticated;
