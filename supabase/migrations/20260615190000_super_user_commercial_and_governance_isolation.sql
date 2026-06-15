-- Keep internal operator accounts outside commercial lifecycle mutations and
-- prevent lower roles or accidental deletion from removing privileged access.

DROP POLICY IF EXISTS "Admins can update profiles in their broker" ON public.profiles;
CREATE POLICY "Admins can update profiles in their broker"
ON public.profiles FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND public.user_in_current_broker(user_id)
  AND NOT public.has_role(user_id, 'super_user')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND public.user_in_current_broker(user_id)
  AND NOT public.has_role(user_id, 'super_user')
);

CREATE OR REPLACE FUNCTION public.prevent_lower_role_super_user_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'super_user')
     AND public.has_role(NEW.user_id, 'super_user') THEN
    RAISE EXCEPTION 'Admins cannot modify super user profiles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_lower_role_super_user_mutation ON public.profiles;
CREATE TRIGGER trg_prevent_lower_role_super_user_mutation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_lower_role_super_user_mutation();

CREATE OR REPLACE FUNCTION public.protect_last_active_super_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_deleted IS DISTINCT FROM true
     AND NEW.is_deleted IS true
     AND public.has_role(OLD.user_id, 'super_user')
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles ur
       JOIN public.profiles p ON p.user_id = ur.user_id
       WHERE ur.role = 'super_user'
         AND ur.user_id <> OLD.user_id
         AND NOT p.is_deleted
     ) THEN
    RAISE EXCEPTION 'Cannot deactivate the last active super user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_active_super_user_profile ON public.profiles;
CREATE TRIGGER trg_protect_last_active_super_user_profile
BEFORE UPDATE OF is_deleted ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_last_active_super_user_profile();

CREATE OR REPLACE FUNCTION public.protect_last_active_super_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'super_user'
     AND (
       TG_OP = 'DELETE'
       OR (TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM 'super_user')
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles ur
       JOIN public.profiles p ON p.user_id = ur.user_id
       WHERE ur.role = 'super_user'
         AND ur.user_id <> OLD.user_id
         AND NOT p.is_deleted
     ) THEN
    RAISE EXCEPTION 'Cannot remove the last active super user role';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_active_super_user_role ON public.user_roles;
CREATE TRIGGER trg_protect_last_active_super_user_role
BEFORE DELETE OR UPDATE OF role ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_last_active_super_user_role();

CREATE OR REPLACE FUNCTION public.initialize_user_credits(
  target_user_id uuid,
  target_plan_type public.plan_type
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_params RECORD;
BEGIN
  IF public.has_role(target_user_id, 'super_user') THEN
    RETURN;
  END IF;

  SELECT * INTO plan_params
  FROM public.plan_parameters
  WHERE plan_type = target_plan_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan type % not found', target_plan_type;
  END IF;

  INSERT INTO public.user_credits (
    user_id, plan_type, credits_queries_remaining, credits_ideas_remaining,
    credits_reports_remaining, last_reset_date
  ) VALUES (
    target_user_id, target_plan_type, plan_params.max_queries,
    plan_params.max_ideas, plan_params.max_reports, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_type = EXCLUDED.plan_type,
    credits_queries_remaining = EXCLUDED.credits_queries_remaining,
    credits_ideas_remaining = EXCLUDED.credits_ideas_remaining,
    credits_reports_remaining = EXCLUDED.credits_reports_remaining,
    last_reset_date = EXCLUDED.last_reset_date,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_plan_credits(
  p_user_id uuid,
  p_plan_type public.plan_type,
  p_source text,
  p_reference_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_params RECORD;
  v_existing RECORD;
  v_already_processed boolean;
BEGIN
  IF public.has_role(p_user_id, 'super_user') THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'super_user');
  END IF;

  IF p_reference_id IS NOT NULL AND p_reference_id <> '' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.credit_transactions
      WHERE reference_id = p_reference_id
      LIMIT 1
    ) INTO v_already_processed;

    IF v_already_processed THEN
      RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'already_processed');
    END IF;
  END IF;

  SELECT max_queries, max_ideas, max_reports
  INTO v_plan_params
  FROM public.plan_parameters
  WHERE plan_type = p_plan_type;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'plan_not_found');
  END IF;

  INSERT INTO public.user_credits (
    user_id, plan_type, credits_queries_remaining, credits_ideas_remaining,
    credits_reports_remaining, last_reset_date
  ) VALUES (
    p_user_id, p_plan_type, v_plan_params.max_queries, v_plan_params.max_ideas,
    v_plan_params.max_reports, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_type = EXCLUDED.plan_type,
    credits_queries_remaining = EXCLUDED.credits_queries_remaining,
    credits_ideas_remaining = EXCLUDED.credits_ideas_remaining,
    credits_reports_remaining = EXCLUDED.credits_reports_remaining,
    last_reset_date = EXCLUDED.last_reset_date,
    updated_at = now();

  SELECT credits_queries_remaining, credits_ideas_remaining, credits_reports_remaining
  INTO v_existing
  FROM public.user_credits
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (
    user_id, transaction_type, credit_type, amount, source, reference_id, balance_after
  ) VALUES
    (p_user_id, 'plan_provision', 'queries', v_plan_params.max_queries, p_source, p_reference_id, v_existing.credits_queries_remaining),
    (p_user_id, 'plan_provision', 'ideas', v_plan_params.max_ideas, p_source, p_reference_id, v_existing.credits_ideas_remaining),
    (p_user_id, 'plan_provision', 'reports', v_plan_params.max_reports, p_source, p_reference_id, v_existing.credits_reports_remaining);

  RETURN jsonb_build_object(
    'success', true,
    'skipped', false,
    'plan_type', p_plan_type::text,
    'credits', jsonb_build_object(
      'queries', v_plan_params.max_queries,
      'ideas', v_plan_params.max_ideas,
      'reports', v_plan_params.max_reports
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_free_trial_safe(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_used boolean;
  v_user_plan text;
  v_is_deleted boolean;
  v_plan_params RECORD;
  v_profile RECORD;
  v_credits RECORD;
BEGIN
  SELECT trial_used, user_plan::text, is_deleted
  INTO v_trial_used, v_user_plan, v_is_deleted
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
  END IF;
  IF v_is_deleted THEN
    RETURN jsonb_build_object('success', false, 'reason', 'account_deleted');
  END IF;
  IF public.has_role(p_user_id, 'super_user') THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'super_user');
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

CREATE OR REPLACE FUNCTION public.revoke_product_access_service(
  p_user_id uuid,
  p_source text,
  p_reference_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits RECORD;
BEGIN
  IF public.has_role(p_user_id, 'super_user') THEN
    RETURN true;
  END IF;

  IF p_reference_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_transactions WHERE reference_id = p_reference_id
  ) THEN
    RETURN true;
  END IF;

  SELECT credits_queries_remaining, credits_ideas_remaining, credits_reports_remaining
  INTO v_credits
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.user_credits SET
      plan_type = 'free_trial',
      credits_queries_remaining = 0,
      credits_ideas_remaining = 0,
      credits_reports_remaining = 0,
      updated_at = now()
    WHERE user_id = p_user_id;

    INSERT INTO public.credit_transactions (
      user_id, transaction_type, credit_type, amount, source, reference_id, balance_after
    ) VALUES
      (p_user_id, 'access_revoked', 'queries', -v_credits.credits_queries_remaining, p_source, p_reference_id, 0),
      (p_user_id, 'access_revoked', 'ideas', -v_credits.credits_ideas_remaining, p_source, p_reference_id, 0),
      (p_user_id, 'access_revoked', 'reports', -v_credits.credits_reports_remaining, p_source, p_reference_id, 0);
  END IF;

  DELETE FROM public.credits_engaged WHERE user_id = p_user_id;

  UPDATE public.profiles SET
    user_plan = 'free_trial',
    trial_used = true,
    trial_started_at = NULL,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_due_credits_service()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit RECORD;
  v_result jsonb;
  v_renewed integer := 0;
BEGIN
  FOR v_credit IN
    SELECT uc.user_id, uc.plan_type, uc.last_reset_date, pp.renewal_cycle_days
    FROM public.user_credits uc
    JOIN public.plan_parameters pp ON pp.plan_type = uc.plan_type
    JOIN public.profiles p ON p.user_id = uc.user_id
    WHERE pp.renewal_cycle_days > 0
      AND p.status = 'approved'
      AND NOT p.is_deleted
      AND NOT public.has_role(uc.user_id, 'super_user')
      AND uc.last_reset_date + make_interval(days => pp.renewal_cycle_days) <= now()
  LOOP
    v_result := public.provision_plan_credits(
      v_credit.user_id,
      v_credit.plan_type,
      'cron_renewal',
      format('renew_%s_%s', v_credit.user_id, current_date)
    );
    IF coalesce((v_result->>'success')::boolean, false)
       AND NOT coalesce((v_result->>'skipped')::boolean, false) THEN
      v_renewed := v_renewed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'renewed_count', v_renewed);
END;
$$;

REVOKE ALL ON FUNCTION public.initialize_user_credits(uuid, public.plan_type) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_plan_credits(uuid, public.plan_type, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_free_trial_safe(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_product_access_service(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renew_due_credits_service() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_user_credits(uuid, public.plan_type) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_plan_credits(uuid, public.plan_type, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_free_trial_safe(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_product_access_service(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_due_credits_service() TO service_role;
