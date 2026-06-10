-- Make free-trial activation atomic and truthful. The RPC must never report
-- success if a trigger or stale database definition prevented profile updates.

CREATE OR REPLACE FUNCTION public.activate_free_trial_safe(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_used boolean;
  v_user_plan text;
  v_plan_params RECORD;
  v_profile RECORD;
  v_credits RECORD;
BEGIN
  SELECT trial_used, user_plan::text INTO v_trial_used, v_user_plan
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
  END IF;
  IF v_user_plan IN ('basic', 'standard', 'premium') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'has_paid_plan');
  END IF;
  IF v_trial_used THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_used');
  END IF;

  SELECT max_queries, max_ideas, max_reports INTO v_plan_params
  FROM public.plan_parameters
  WHERE plan_type = 'free_trial';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'plan_not_found');
  END IF;

  INSERT INTO public.user_credits (
    user_id, plan_type, credits_queries_remaining, credits_ideas_remaining,
    credits_reports_remaining, last_reset_date
  ) VALUES (
    p_user_id, 'free_trial', v_plan_params.max_queries, v_plan_params.max_ideas,
    v_plan_params.max_reports, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_type = 'free_trial',
    credits_queries_remaining = user_credits.credits_queries_remaining + EXCLUDED.credits_queries_remaining,
    credits_ideas_remaining = user_credits.credits_ideas_remaining + EXCLUDED.credits_ideas_remaining,
    credits_reports_remaining = user_credits.credits_reports_remaining + EXCLUDED.credits_reports_remaining,
    updated_at = now()
  RETURNING plan_type, credits_queries_remaining, credits_ideas_remaining, credits_reports_remaining
  INTO v_credits;

  UPDATE public.profiles SET
    status = 'approved',
    user_plan = 'free_trial',
    trial_used = true,
    trial_started_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING status, user_plan, trial_used, trial_started_at
  INTO v_profile;

  IF v_profile.status IS DISTINCT FROM 'approved'
     OR v_profile.user_plan::text IS DISTINCT FROM 'free_trial'
     OR v_profile.trial_used IS DISTINCT FROM true
     OR v_profile.trial_started_at IS NULL THEN
    RAISE EXCEPTION 'Free trial profile activation was blocked for user %', p_user_id;
  END IF;

  IF v_credits.plan_type::text IS DISTINCT FROM 'free_trial' THEN
    RAISE EXCEPTION 'Free trial credit provisioning was blocked for user %', p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'credits_added', jsonb_build_object(
      'queries', v_plan_params.max_queries,
      'ideas', v_plan_params.max_ideas,
      'reports', v_plan_params.max_reports
    )
  );
END;
$$;

ALTER FUNCTION public.activate_free_trial_safe(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.activate_free_trial_safe(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_free_trial_safe(uuid) TO service_role;
