-- Autonomous onboarding: every new signup is auto-approved onto a card-free
-- free trial, removing the manual admin-approval gate.
--
-- New users immediately get:
--   * status = 'approved'           (no manual validation needed)
--   * user_plan = 'free_trial'      (card-free)
--   * trial_started_at = now()      (7-day window — see plan_parameters)
--   * provisioned free-trial credits
-- When the trial expires, the frontend already prompts the user to subscribe
-- (AuthGuard "Free Trial Has Expired" → Stripe Checkout). Paid signups still go
-- through Stripe; their webhook upgrades the plan over the trial.
--
-- Existing 'pending' accounts are intentionally left untouched.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial jsonb;
BEGIN
  -- Public signup metadata is caller-controlled. Broker assignment must only
  -- happen later through trusted administrative flows.
  INSERT INTO public.profiles (user_id, broker_name, broker_id, status)
  VALUES (NEW.id, NULL, NULL, 'pending')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Autonomous onboarding: activate the card-free free trial immediately so the
  -- account is usable without manual approval. This sets status = 'approved',
  -- user_plan = 'free_trial', trial_started_at = now() and provisions credits.
  -- On any failure (e.g. misconfigured plan_parameters) the account safely
  -- stays 'pending' and an admin can still approve it.
  BEGIN
    v_trial := public.activate_free_trial_safe(NEW.id);
    IF coalesce((v_trial->>'success')::boolean, false) IS NOT TRUE THEN
      RAISE LOG 'handle_new_user: free trial not activated for % (%).',
        NEW.id, coalesce(v_trial->>'reason', 'unknown');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: activate_free_trial_safe failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
