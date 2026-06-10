-- Prevent admins and authenticated users from escalating roles or minting credits.

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Super users can manage roles" ON public.user_roles;
CREATE POLICY "Super users can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_user'))
WITH CHECK (public.has_role(auth.uid(), 'super_user'));

CREATE OR REPLACE FUNCTION public.user_in_current_broker(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles caller
    JOIN public.profiles target ON target.user_id = p_user_id
    WHERE caller.user_id = auth.uid()
      AND caller.broker_id IS NOT NULL
      AND target.broker_id = caller.broker_id
  );
$$;

REVOKE ALL ON FUNCTION public.user_in_current_broker(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_in_current_broker(uuid) TO authenticated;

DROP POLICY IF EXISTS "Admins and super users can view all profiles (roles table)" ON public.profiles;
DROP POLICY IF EXISTS "Admins and super users can update all profiles (roles table)" ON public.profiles;
DROP POLICY IF EXISTS "Admins and super users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and super users can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in their broker" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their broker" ON public.profiles;
DROP POLICY IF EXISTS "Super users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super users can update all profiles" ON public.profiles;

CREATE POLICY "Super users can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_user'));

CREATE POLICY "Super users can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_user'))
WITH CHECK (public.has_role(auth.uid(), 'super_user'));

CREATE POLICY "Admins can view profiles in their broker"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND public.user_in_current_broker(user_id)
);

CREATE POLICY "Admins can update profiles in their broker"
ON public.profiles FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND public.user_in_current_broker(user_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND public.user_in_current_broker(user_id)
);

CREATE OR REPLACE FUNCTION public.protect_profile_broker_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND NOT public.has_role(auth.uid(), 'super_user') THEN
    NEW.broker_id := OLD.broker_id;
    NEW.broker_name := OLD.broker_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_broker_assignment ON public.profiles;
CREATE TRIGGER trg_protect_profile_broker_assignment
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_broker_assignment();

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

DROP POLICY IF EXISTS "Super users and admins can view all credits" ON public.user_credits;
DROP POLICY IF EXISTS "Super users can view all credits" ON public.user_credits;
DROP POLICY IF EXISTS "Admins can view credits in their broker" ON public.user_credits;

CREATE POLICY "Super users can view all credits"
ON public.user_credits FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_user'));

CREATE POLICY "Admins can view credits in their broker"
ON public.user_credits FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND public.user_in_current_broker(user_id)
);

DROP POLICY IF EXISTS "Admins and super users can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Super users can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can view jobs in their broker" ON public.jobs;

CREATE POLICY "Super users can view all jobs"
ON public.jobs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_user'));

CREATE POLICY "Admins can view jobs in their broker"
ON public.jobs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND public.user_in_current_broker(user_id)
);

DROP POLICY IF EXISTS "Users can create their own engaged credits" ON public.credits_engaged;
DROP POLICY IF EXISTS "Users can delete their own engaged credits" ON public.credits_engaged;

CREATE OR REPLACE FUNCTION public.decrement_credit(target_user_id uuid, credit_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits integer;
  update_column text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'Unauthorized credit operation';
  END IF;

  CASE credit_type
    WHEN 'queries' THEN update_column := 'credits_queries_remaining';
    WHEN 'ideas' THEN update_column := 'credits_ideas_remaining';
    WHEN 'reports' THEN update_column := 'credits_reports_remaining';
    ELSE RAISE EXCEPTION 'Invalid credit type: %', credit_type;
  END CASE;

  EXECUTE format(
    'UPDATE public.user_credits SET %I = %I - 1, updated_at = now()
     WHERE user_id = $1 AND %I > 0 RETURNING %I',
    update_column, update_column, update_column, update_column
  )
  INTO current_credits
  USING target_user_id;

  RETURN current_credits IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_engage_credit(
  p_user_id uuid,
  p_feature text,
  p_job_id uuid
)
RETURNS TABLE(success boolean, available_credits integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_column text;
  v_total_credits integer;
  v_engaged_count integer;
  v_available integer;
  v_job_feature text;
  v_job_status text;
  v_expected_feature text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized credit operation';
  END IF;

  v_credit_column := CASE p_feature
    WHEN 'queries' THEN 'credits_queries_remaining'
    WHEN 'ideas' THEN 'credits_ideas_remaining'
    WHEN 'reports' THEN 'credits_reports_remaining'
    ELSE NULL
  END;

  IF v_credit_column IS NULL THEN
    RETURN QUERY SELECT false, 0, 'Invalid feature type'::text;
    RETURN;
  END IF;

  SELECT feature, status
  INTO v_job_feature, v_job_status
  FROM public.jobs
  WHERE id = p_job_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Invalid job ownership'::text;
    RETURN;
  END IF;

  IF v_job_status <> 'pending' THEN
    RETURN QUERY SELECT false, 0, 'Job is not pending'::text;
    RETURN;
  END IF;

  v_expected_feature := CASE lower(trim(coalesce(v_job_feature, '')))
    WHEN 'queries' THEN 'queries'
    WHEN 'macro commentary' THEN 'queries'
    WHEN 'macro analysis' THEN 'queries'
    WHEN 'macro lab' THEN 'queries'
    WHEN 'macro_lab' THEN 'queries'
    WHEN 'macro_commentary' THEN 'queries'
    WHEN 'ideas' THEN 'ideas'
    WHEN 'ai trade setup' THEN 'ideas'
    WHEN 'trade setup' THEN 'ideas'
    WHEN 'trade generator' THEN 'ideas'
    WHEN 'trade_generator' THEN 'ideas'
    WHEN 'tradesetup' THEN 'ideas'
    WHEN 'reports' THEN 'reports'
    WHEN 'report' THEN 'reports'
    ELSE NULL
  END;

  IF v_expected_feature IS NULL OR v_expected_feature <> p_feature THEN
    RETURN QUERY SELECT false, 0, 'Credit type does not match job feature'::text;
    RETURN;
  END IF;

  EXECUTE format(
    'SELECT %I FROM public.user_credits WHERE user_id = $1 FOR UPDATE',
    v_credit_column
  )
  INTO v_total_credits
  USING p_user_id;

  IF v_total_credits IS NULL OR v_total_credits <= 0 THEN
    RETURN QUERY SELECT false, 0, 'No credits available'::text;
    RETURN;
  END IF;

  SELECT count(*) INTO v_engaged_count
  FROM public.credits_engaged
  WHERE user_id = p_user_id AND feature = p_feature;

  v_available := v_total_credits - v_engaged_count;
  IF EXISTS (
    SELECT 1 FROM public.credits_engaged
    WHERE job_id = p_job_id AND user_id = p_user_id AND feature = p_feature
  ) THEN
    RETURN QUERY SELECT true, greatest(v_available, 0), 'Credit already engaged'::text;
    RETURN;
  END IF;

  IF v_available <= 0 THEN
    RETURN QUERY SELECT false, v_available, 'All credits currently engaged in active jobs'::text;
    RETURN;
  END IF;

  INSERT INTO public.credits_engaged (user_id, feature, job_id)
  VALUES (p_user_id, p_feature, p_job_id);

  RETURN QUERY SELECT true, v_available - 1, 'Credit engaged successfully'::text;
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

  SELECT max_queries, max_ideas, max_reports INTO v_plan_params
  FROM public.plan_parameters WHERE plan_type = 'free_trial';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'plan_not_found');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_credits WHERE user_id = p_user_id) INTO v_has_credits;
  IF v_has_credits THEN
    UPDATE public.user_credits SET
      plan_type = 'free_trial',
      credits_queries_remaining = credits_queries_remaining + v_plan_params.max_queries,
      credits_ideas_remaining = credits_ideas_remaining + v_plan_params.max_ideas,
      credits_reports_remaining = credits_reports_remaining + v_plan_params.max_reports,
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    INSERT INTO public.user_credits (
      user_id, plan_type, credits_queries_remaining, credits_ideas_remaining,
      credits_reports_remaining, last_reset_date
    ) VALUES (
      p_user_id, 'free_trial', v_plan_params.max_queries, v_plan_params.max_ideas,
      v_plan_params.max_reports, now()
    );
  END IF;

  UPDATE public.profiles SET
    status = 'approved',
    user_plan = 'free_trial',
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

REVOKE ALL ON FUNCTION public.initialize_user_credits(uuid, public.plan_type) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_plan_credits(uuid, public.plan_type, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_free_trial_safe(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_user_credits(uuid, public.plan_type) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_plan_credits(uuid, public.plan_type, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_free_trial_safe(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.decrement_credit(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.try_engage_credit(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrement_credit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_engage_credit(uuid, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.discard_pending_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.jobs j
  WHERE j.id = p_job_id
    AND j.user_id = auth.uid()
    AND j.status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.credits_engaged ce WHERE ce.job_id = j.id
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.discard_pending_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discard_pending_job(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_credit_service(
  p_user_id uuid,
  p_feature text,
  p_source text,
  p_reference_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_column text;
  v_balance integer;
  v_engaged_count integer;
BEGIN
  v_credit_column := CASE p_feature
    WHEN 'queries' THEN 'credits_queries_remaining'
    WHEN 'ideas' THEN 'credits_ideas_remaining'
    WHEN 'reports' THEN 'credits_reports_remaining'
    ELSE NULL
  END;
  IF v_credit_column IS NULL THEN
    RAISE EXCEPTION 'Invalid feature type';
  END IF;

  EXECUTE format(
    'SELECT %I FROM public.user_credits WHERE user_id = $1 FOR UPDATE',
    v_credit_column
  )
  INTO v_balance
  USING p_user_id;

  SELECT count(*) INTO v_engaged_count
  FROM public.credits_engaged
  WHERE user_id = p_user_id AND feature = p_feature;

  IF v_balance IS NULL OR v_balance - v_engaged_count <= 0 THEN
    RETURN false;
  END IF;

  v_balance := v_balance - 1;
  EXECUTE format(
    'UPDATE public.user_credits SET %I = $2, updated_at = now() WHERE user_id = $1',
    v_credit_column
  )
  USING p_user_id, v_balance;

  INSERT INTO public.credit_transactions (
    user_id, transaction_type, credit_type, amount, source, reference_id, balance_after
  ) VALUES (
    p_user_id, 'usage', p_feature, -1, p_source, p_reference_id, v_balance
  );
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credit_service(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credit_service(uuid, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.refund_credit_service(
  p_user_id uuid,
  p_feature text,
  p_source text,
  p_reference_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_column text;
  v_balance integer;
BEGIN
  v_credit_column := CASE p_feature
    WHEN 'queries' THEN 'credits_queries_remaining'
    WHEN 'ideas' THEN 'credits_ideas_remaining'
    WHEN 'reports' THEN 'credits_reports_remaining'
    ELSE NULL
  END;
  IF v_credit_column IS NULL OR p_reference_id IS NULL OR p_reference_id = '' THEN
    RAISE EXCEPTION 'Invalid credit refund request';
  END IF;

  EXECUTE format(
    'SELECT %I FROM public.user_credits WHERE user_id = $1 FOR UPDATE',
    v_credit_column
  )
  INTO v_balance
  USING p_user_id;

  IF v_balance IS NULL THEN
    RETURN false;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = p_user_id AND reference_id = p_reference_id
  ) THEN
    RETURN true;
  END IF;

  v_balance := v_balance + 1;
  EXECUTE format(
    'UPDATE public.user_credits SET %I = $2, updated_at = now() WHERE user_id = $1',
    v_credit_column
  )
  USING p_user_id, v_balance;

  INSERT INTO public.credit_transactions (
    user_id, transaction_type, credit_type, amount, source, reference_id, balance_after
  ) VALUES (
    p_user_id, 'refund', p_feature, 1, p_source, p_reference_id, v_balance
  );
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_credit_service(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credit_service(uuid, text, text, text) TO service_role;

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

REVOKE ALL ON FUNCTION public.revoke_product_access_service(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_product_access_service(uuid, text, text) TO service_role;

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

REVOKE ALL ON FUNCTION public.renew_due_credits_service() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_due_credits_service() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'renew-credits-daily') THEN
    PERFORM cron.unschedule('renew-credits-daily');
  END IF;
  PERFORM cron.schedule(
    'renew-credits-daily',
    '0 2 * * *',
    'SELECT public.renew_due_credits_service();'
  );
END;
$$;

ALTER TABLE public.processed_stripe_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.processed_stripe_events
  DROP CONSTRAINT IF EXISTS processed_stripe_events_status_check;
ALTER TABLE public.processed_stripe_events
  ADD CONSTRAINT processed_stripe_events_status_check
  CHECK (status IN ('processing', 'completed', 'failed'));

CREATE TABLE IF NOT EXISTS public.contact_form_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_form_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage contact form attempts" ON public.contact_form_attempts;
CREATE POLICY "Service role can manage contact form attempts"
ON public.contact_form_attempts
FOR ALL TO service_role
USING (true)
WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_contact_form_attempts_ip_created
ON public.contact_form_attempts (ip_hash, created_at DESC);

CREATE OR REPLACE FUNCTION public.check_contact_rate_limit_service(
  p_ip_hash text,
  p_limit integer DEFAULT 5,
  p_window interval DEFAULT interval '15 minutes'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_ip_hash IS NULL OR p_ip_hash = '' OR p_limit < 1 OR p_window <= interval '0 seconds' THEN
    RAISE EXCEPTION 'Invalid contact rate-limit request';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));

  SELECT count(*) INTO v_count
  FROM public.contact_form_attempts
  WHERE ip_hash = p_ip_hash
    AND created_at >= now() - p_window;

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.contact_form_attempts (ip_hash) VALUES (p_ip_hash);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_contact_rate_limit_service(text, integer, interval)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_contact_rate_limit_service(text, integer, interval)
TO service_role;

-- Autonomous onboarding: every new signup is auto-approved onto a card-free
-- free trial, removing the manual admin-approval gate.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial jsonb;
BEGIN
  INSERT INTO public.profiles (user_id, broker_name, broker_id, status)
  VALUES (NEW.id, NULL, NULL, 'pending')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

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

-- Make free-trial activation atomic and truthful.

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