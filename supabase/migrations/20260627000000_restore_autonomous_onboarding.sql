-- Restore autonomous onboarding (reverts the 2026-06-26 manual-approval regression).
--
-- Commit 3d049db ("trial ne démarre qu'après approbation admin") removed the
-- activate_free_trial_safe() call from handle_new_user, leaving every new signup
-- stuck in status='pending' with no automatic path to 'approved'. The frontend
-- guard activateTrialIfNeeded() only runs when status='approved', so new users
-- could never start a trial without a manual admin action — producing the
-- "Account Pending Approval" wall seen in production.
--
-- This migration:
--   1. Re-wires handle_new_user to auto-approve onto a card-free free trial
--      (the 2026-06-10 autonomous design), keeping the chk_trial_implies_approved
--      invariant intact (activate_free_trial_safe sets status+trial atomically).
--   2. Remediates real users currently stranded in 'pending' by the regression.
--
-- The chk_trial_implies_approved CHECK constraint (migration 20260626010000) is
-- intentionally preserved — autonomous activation satisfies it.

-- 1) Autonomous trigger: every new signup is auto-approved + free trial + credits.
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

-- 2) Remediate users stranded in 'pending' by the 2026-06-26 regression.
-- Real, non-deleted, non-paid users only. activate_free_trial_safe is internally
-- safe (it skips super_users, paid plans, deleted and already-used accounts), so
-- we simply replay it per pending user. Test/alias accounts are excluded to keep
-- their hand-crafted state intact.
DO $$
DECLARE
  r RECORD;
  v_res jsonb;
  v_fixed integer := 0;
BEGIN
  FOR r IN
    SELECT p.user_id
    FROM public.profiles p
    WHERE p.status = 'pending'
      AND p.is_deleted = false
      -- only free-trial / unset plans — never overwrite a paid or beta plan
      AND coalesce(p.user_plan::text, 'free_trial') = 'free_trial'
      AND NOT public.has_role(p.user_id, 'super_user')
      AND p.user_id NOT IN (
        '939081d9-e562-4ffd-b6f8-fe1719b67720',  -- dorian.labry+wxcvbn
        'b7dc415a-65cb-47f4-9192-1a3825851f8d',  -- dorian.labry+aqwzsx
        'fe87b063-64a5-4d1d-8534-23a8a1625718',  -- dorian.labry+bot
        'f86f30b3-90bd-4087-9058-8d38ba5fb161',  -- dorian.labry+paidagent
        '792a7682-fedf-431f-93a1-4771b6a4bce4',  -- dorian.labry+paidazerty
        '289066e0-2692-4956-a037-5eff8d94f1ff',  -- dorian.labry+paid1
        'fdadd5da-6f4b-429e-b34e-f6efd48cb0ee',  -- dorian.labry+premium
        '171c2592-a48a-44f9-afa3-b34aa50e5b0b',  -- dorian.labry+testpayement
        'f12c00f3-0922-4927-8371-7a4eaced12b7',  -- dorian.labry+777
        'f168eeb1-d10b-419b-a27d-01a5dcd8c2fb',  -- dorian.labry+789
        '2084bb90-3d8e-46d5-9945-66df39a2538d',  -- dorian.labry+456
        '64b0bf99-c3d7-4ddc-80b7-1529b570a090',  -- dorian.labry+123
        'e42f3d1e-c7a5-4fa0-96b0-f2ee94986a15',  -- dorian.labry+callspread
        '7bb36d5c-9965-4bec-a5e5-56fc54cc900d',  -- dorian.labry+call+spread
        '26911ef9-1ca4-42a7-80b9-1d36243bba78',  -- dorian.labry+444444
        '76c198d9-ee33-4b4e-9e40-163791e8402a',  -- dorian.labry+0000
        '01bbf827-8622-4bb2-a7b5-f09e484fd3ea'   -- labrynicolas4@hmail.com (typo domain)
      )
  LOOP
    BEGIN
      v_res := public.activate_free_trial_safe(r.user_id);
      IF coalesce((v_res->>'success')::boolean, false) THEN
        v_fixed := v_fixed + 1;
      ELSE
        RAISE NOTICE 'Skipped % during remediation (%).',
          r.user_id, coalesce(v_res->>'reason', 'unknown');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Remediation failed for %: %', r.user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Autonomous onboarding restored: % stranded pending users activated', v_fixed;
END;
$$;
