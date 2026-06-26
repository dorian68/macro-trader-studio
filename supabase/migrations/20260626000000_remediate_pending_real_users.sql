-- Remediation: complete the partial June 16 bulk update that set trial_used=true
-- and trial_started_at but forgot to flip status='pending' → 'approved'.
-- Also provisions fresh user_credits for users who never received them.
-- Resets trial_started_at to now() so users get the full 4-day window fresh.
--
-- Scope: real non-test external users only.
-- Excluded: dorian.labry+* test accounts, labrynicolas4@hmail.com (typo domain).

DO $$
DECLARE
  v_plan    RECORD;
  v_updated integer;
  v_credited integer;
BEGIN
  SELECT max_queries, max_ideas, max_reports, trial_duration_days
  INTO v_plan
  FROM public.plan_parameters
  WHERE plan_type = 'free_trial';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_parameters row for free_trial not found — aborting remediation';
  END IF;

  -- Step 1: flip status to approved and restart trial window
  UPDATE public.profiles
  SET
    status          = 'approved',
    trial_started_at = now(),
    updated_at      = now()
  WHERE status     = 'pending'
    AND trial_used = true
    AND user_plan  = 'free_trial'
    AND is_deleted = false
    -- exclude known test / dorian.labry alias accounts
    AND user_id NOT IN (
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
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Step 2: provision fresh user_credits for those who have none
  INSERT INTO public.user_credits (
    user_id,
    plan_type,
    credits_queries_remaining,
    credits_ideas_remaining,
    credits_reports_remaining,
    last_reset_date
  )
  SELECT
    p.user_id,
    'free_trial',
    v_plan.max_queries,
    v_plan.max_ideas,
    v_plan.max_reports,
    now()
  FROM public.profiles p
  LEFT JOIN public.user_credits uc ON uc.user_id = p.user_id
  WHERE p.status     = 'approved'
    AND p.trial_used = true
    AND p.user_plan  = 'free_trial'
    AND p.is_deleted = false
    AND uc.user_id IS NULL
    -- same exclusion list
    AND p.user_id NOT IN (
      '939081d9-e562-4ffd-b6f8-fe1719b67720',
      'b7dc415a-65cb-47f4-9192-1a3825851f8d',
      'fe87b063-64a5-4d1d-8534-23a8a1625718',
      'f86f30b3-90bd-4087-9058-8d38ba5fb161',
      '792a7682-fedf-431f-93a1-4771b6a4bce4',
      '289066e0-2692-4956-a037-5eff8d94f1ff',
      'fdadd5da-6f4b-429e-b34e-f6efd48cb0ee',
      '171c2592-a48a-44f9-afa3-b34aa50e5b0b',
      'f12c00f3-0922-4927-8371-7a4eaced12b7',
      'f168eeb1-d10b-419b-a27d-01a5dcd8c2fb',
      '2084bb90-3d8e-46d5-9945-66df39a2538d',
      '64b0bf99-c3d7-4ddc-80b7-1529b570a090',
      'e42f3d1e-c7a5-4fa0-96b0-f2ee94986a15',
      '7bb36d5c-9965-4bec-a5e5-56fc54cc900d',
      '26911ef9-1ca4-42a7-80b9-1d36243bba78',
      '76c198d9-ee33-4b4e-9e40-163791e8402a',
      '01bbf827-8622-4bb2-a7b5-f09e484fd3ea'
    );

  GET DIAGNOSTICS v_credited = ROW_COUNT;

  RAISE NOTICE 'Remediation complete: % profiles approved, % user_credits provisioned',
    v_updated, v_credited;
END;
$$;
