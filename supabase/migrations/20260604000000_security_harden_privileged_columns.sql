-- ============================================================================
-- SECURITY HARDENING: prevent regular users from self-escalating privileges
-- ----------------------------------------------------------------------------
-- Context: the policies "Users can update their own profile" and
-- "Users can update their own credits" grant row-level UPDATE without any
-- column restriction. Postgres RLS is row-level (not column-level), so an
-- authenticated user could rewrite privileged columns directly via PostgREST:
--   * profiles.status      -> 'approved'  (bypass admin approval gate)
--   * profiles.user_plan   -> 'premium'   (bypass paywall)
--   * user_credits.*       -> arbitrary   (unlimited credits / paywall bypass)
--
-- Fix: BEFORE INSERT/UPDATE triggers that neutralize changes to privileged
-- columns when the writer is a *regular authenticated user*. Trusted contexts
-- are untouched, so NOTHING in the normal app flow breaks:
--   * service_role edge functions (stripe-webhook, renew-credits, ...) ........ allowed
--   * SECURITY DEFINER RPCs (decrement_credit, try_engage_credit,
--     initialize_user_credits, activate_free_trial_safe) -> run as `postgres` .. allowed
--   * admins / super users (has_role) — incl. client-side UserPlanDialog ....... allowed
--   * regular users -> privileged columns are silently preserved (no error,
--     so legitimate broker/profile edits that happen to include them still pass)
--
-- IMPORTANT: these trigger functions are SECURITY INVOKER (the default). They
-- MUST NOT be SECURITY DEFINER, otherwise `current_user` would always resolve
-- to the function owner and the trusted-context detection would be defeated.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles: protect status / plan / soft-delete / trial columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profiles_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
-- SECURITY INVOKER (default) on purpose — see header note.
SET search_path = public
AS $$
BEGIN
  -- Trusted backend writers: service_role + any SECURITY DEFINER RPC/migration
  -- (which execute as a role other than the PostgREST request roles).
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Admins and super users may legitimately change these columns.
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user') THEN
    RETURN NEW;
  END IF;

  -- Regular authenticated user.
  IF TG_OP = 'INSERT' THEN
    -- Force safe defaults so a self-registered profile cannot be born approved/paid.
    NEW.status           := 'pending';
    NEW.user_plan        := 'free_trial'::plan_type;
    NEW.is_deleted       := false;
    NEW.deleted_at       := NULL;
    NEW.deleted_by       := NULL;
    NEW.trial_used       := false;
    NEW.trial_started_at := NULL;
  ELSE -- UPDATE: keep the existing privileged values, ignore any attempt to change them.
    NEW.status           := OLD.status;
    NEW.user_plan        := OLD.user_plan;
    NEW.is_deleted       := OLD.is_deleted;
    NEW.deleted_at       := OLD.deleted_at;
    NEW.deleted_by       := OLD.deleted_by;
    NEW.trial_used       := OLD.trial_used;
    NEW.trial_started_at := OLD.trial_started_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_privileged_cols ON public.profiles;
CREATE TRIGGER trg_protect_profiles_privileged_cols
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profiles_privileged_cols();

-- ---------------------------------------------------------------------------
-- user_credits: regular users must never self-edit their balance / plan
-- (consumption goes through SECURITY DEFINER RPCs; admin edits via has_role).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_user_credits_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
-- SECURITY INVOKER (default) on purpose — see header note.
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_user') THEN
    RETURN NEW;
  END IF;

  -- Regular authenticated user: on UPDATE, preserve every balance/plan column
  -- (their write becomes a no-op). INSERT by a regular user is already blocked
  -- by RLS (no INSERT policy), but we guard it here too for defense in depth.
  IF TG_OP = 'UPDATE' THEN
    NEW.plan_type                 := OLD.plan_type;
    NEW.credits_queries_remaining := OLD.credits_queries_remaining;
    NEW.credits_ideas_remaining   := OLD.credits_ideas_remaining;
    NEW.credits_reports_remaining := OLD.credits_reports_remaining;
    NEW.last_reset_date           := OLD.last_reset_date;
  ELSE -- INSERT
    RAISE EXCEPTION 'Direct credit creation is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_credits_privileged_cols ON public.user_credits;
CREATE TRIGGER trg_protect_user_credits_privileged_cols
  BEFORE INSERT OR UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_credits_privileged_cols();
