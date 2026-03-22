-- Update activate_free_trial_safe to also reject users with paid plans
CREATE OR REPLACE FUNCTION public.activate_free_trial_safe(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trial_used boolean;
  v_user_plan text;
  v_plan_params RECORD;
  v_has_credits boolean;
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

  SELECT max_queries, max_ideas, max_reports 
  INTO v_plan_params
  FROM public.plan_parameters 
  WHERE plan_type = 'free_trial';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'plan_not_found');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_credits WHERE user_id = p_user_id) INTO v_has_credits;

  IF v_has_credits THEN
    UPDATE public.user_credits SET
      credits_queries_remaining = credits_queries_remaining + v_plan_params.max_queries,
      credits_ideas_remaining = credits_ideas_remaining + v_plan_params.max_ideas,
      credits_reports_remaining = credits_reports_remaining + v_plan_params.max_reports,
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    INSERT INTO public.user_credits (
      user_id, plan_type,
      credits_queries_remaining, credits_ideas_remaining, credits_reports_remaining,
      last_reset_date
    ) VALUES (
      p_user_id, 'free_trial',
      v_plan_params.max_queries, v_plan_params.max_ideas, v_plan_params.max_reports,
      now()
    );
  END IF;

  UPDATE public.profiles SET
    trial_used = true,
    trial_started_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id;

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