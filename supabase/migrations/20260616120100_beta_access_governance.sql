-- Beta-tester accounts: plumbing + super_user-only governance.
--
-- A beta account is a regular `user` (no elevated role, zero decisional power)
-- placed on the 'beta' plan. Because requireProductAccess only enforces *trial
-- expiry* for free_trial but enforces *credits* for every plan, a beta account
-- that is `approved` + on 'beta' is naturally time-unlimited yet credit-gated.
--
-- Assignment is done by a super_user from the admin UI (User Management ->
-- Manage -> Update Role -> "Beta Tester", and the super_user-only Plan dialog).
-- Super_user writes go straight to profiles/user_credits (they bypass the
-- privileged-column triggers). The triggers below add DB-level defense in depth
-- so that admins / the beta user themselves can NOT move accounts into/out of
-- beta or change a beta account's credits via a raw API call.

-- ---------------------------------------------------------------------------
-- 1. Default beta plan parameters (global defaults; super_user edits them via
--    the already-RLS-locked plan_parameters table / PlanParametersManagement).
--    trial_duration_days = NULL  -> no trial window (time-unlimited)
--    renewal_cycle_days   = NULL -> no auto-renew (manual recharge only)
-- ---------------------------------------------------------------------------
INSERT INTO public.plan_parameters
  (plan_type, max_queries, max_ideas, max_reports, trial_duration_days, renewal_cycle_days)
VALUES
  ('beta', 100, 50, 20, NULL, NULL)
ON CONFLICT (plan_type) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. profiles: carve beta out so only super_user / trusted backend can change
--    beta accounts. The beta checks run BEFORE the admin bypass.
--    SECURITY INVOKER (default) on purpose — current_user must reflect the real
--    request role so trusted-backend detection works.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profiles_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Trusted backend writers: service_role + any SECURITY DEFINER RPC/migration.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Super users have full control (including beta accounts).
  IF public.has_role(auth.uid(), 'super_user') THEN
    RETURN NEW;
  END IF;

  -- Beta isolation (runs before the admin bypass): an admin or regular user may
  -- neither move a profile INTO nor OUT OF beta, nor edit a beta account's
  -- privileged columns. Only super_user / trusted backend (handled above) can.
  IF TG_OP = 'UPDATE'
     AND (OLD.user_plan = 'beta'::plan_type OR NEW.user_plan = 'beta'::plan_type) THEN
    NEW.status           := OLD.status;
    NEW.user_plan        := OLD.user_plan;
    NEW.is_deleted       := OLD.is_deleted;
    NEW.deleted_at       := OLD.deleted_at;
    NEW.deleted_by       := OLD.deleted_by;
    NEW.trial_used       := OLD.trial_used;
    NEW.trial_started_at := OLD.trial_started_at;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' AND NEW.user_plan = 'beta'::plan_type THEN
    -- A non-super_user cannot self-create a profile already on beta.
    NEW.status           := 'pending';
    NEW.user_plan        := 'free_trial'::plan_type;
    NEW.is_deleted       := false;
    NEW.deleted_at       := NULL;
    NEW.deleted_by       := NULL;
    NEW.trial_used       := false;
    NEW.trial_started_at := NULL;
    RETURN NEW;
  END IF;

  -- Admins may legitimately change these columns on NON-beta accounts.
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Regular authenticated user: neutralize privileged columns.
  IF TG_OP = 'INSERT' THEN
    NEW.status           := 'pending';
    NEW.user_plan        := 'free_trial'::plan_type;
    NEW.is_deleted       := false;
    NEW.deleted_at       := NULL;
    NEW.deleted_by       := NULL;
    NEW.trial_used       := false;
    NEW.trial_started_at := NULL;
  ELSE
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

-- ---------------------------------------------------------------------------
-- 3. user_credits: same beta carve-out — admins cannot recharge/alter a beta
--    account's balance; only super_user / trusted backend can.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_user_credits_privileged_cols()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'super_user') THEN
    RETURN NEW;
  END IF;

  -- Beta isolation (before the admin bypass).
  IF TG_OP = 'UPDATE'
     AND (OLD.plan_type = 'beta'::plan_type OR NEW.plan_type = 'beta'::plan_type) THEN
    NEW.plan_type                 := OLD.plan_type;
    NEW.credits_queries_remaining := OLD.credits_queries_remaining;
    NEW.credits_ideas_remaining   := OLD.credits_ideas_remaining;
    NEW.credits_reports_remaining := OLD.credits_reports_remaining;
    NEW.last_reset_date           := OLD.last_reset_date;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' AND NEW.plan_type = 'beta'::plan_type THEN
    RAISE EXCEPTION 'Beta credits can only be provisioned by a super user';
  END IF;

  -- Admins may manage NON-beta credits.
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Regular authenticated user.
  IF TG_OP = 'UPDATE' THEN
    NEW.plan_type                 := OLD.plan_type;
    NEW.credits_queries_remaining := OLD.credits_queries_remaining;
    NEW.credits_ideas_remaining   := OLD.credits_ideas_remaining;
    NEW.credits_reports_remaining := OLD.credits_reports_remaining;
    NEW.last_reset_date           := OLD.last_reset_date;
  ELSE
    RAISE EXCEPTION 'Direct credit creation is not allowed';
  END IF;

  RETURN NEW;
END;
$$;
