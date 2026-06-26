-- Two structural fixes to the signup/trial pipeline:
--
-- Fix 1 — DB invariant: trial_used=true implies status='approved'.
--   Prevents any future direct SQL operation from recreating the June 16 state
--   (trial clock running on a pending account). Requires migration
--   20260626000000 to have cleared all pre-existing violations first.
--
-- Fix 2 — Trial timer starts at first login, not at account creation.
--   Removed the activate_free_trial_safe() call from handle_new_user.
--   The Auth.tsx sign-in flow now calls the activate-free-trial edge function
--   on first authenticated session. ensure-profile retains its own call as an
--   orphan-recovery fallback (profile missing entirely).

-- Fix 1: structural guard
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_trial_implies_approved
  CHECK (NOT (trial_used = true AND status = 'pending'));

-- Fix 2: slimmed-down trigger — no trial activation at account creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, broker_name, broker_id, status)
  VALUES (NEW.id, NULL, NULL, 'pending')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
