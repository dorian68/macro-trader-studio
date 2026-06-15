-- Super users are internal operators and must not be constrained by product
-- approval, subscription, trial, or credit-balance rules. Authentication,
-- account-deletion checks, job ownership, and feature validation still apply.

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

  IF public.has_role(target_user_id, 'super_user') THEN
    RETURN true;
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

  IF public.has_role(p_user_id, 'super_user') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.credits_engaged
      WHERE job_id = p_job_id AND user_id = p_user_id AND feature = p_feature
    ) THEN
      INSERT INTO public.credits_engaged (user_id, feature, job_id)
      VALUES (p_user_id, p_feature, p_job_id);
    END IF;

    RETURN QUERY SELECT true, -1, 'Super user credit bypass'::text;
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

CREATE OR REPLACE FUNCTION public.auto_manage_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  engaged_feature text;
  credit_column text;
  current_credits integer;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT feature INTO engaged_feature
  FROM public.credits_engaged
  WHERE job_id = NEW.id
  LIMIT 1;

  IF engaged_feature IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(NEW.user_id, 'super_user') THEN
    IF NEW.status IN ('completed', 'failed', 'error') THEN
      DELETE FROM public.credits_engaged WHERE job_id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  credit_column := CASE engaged_feature
    WHEN 'queries' THEN 'credits_queries_remaining'
    WHEN 'ideas' THEN 'credits_ideas_remaining'
    WHEN 'reports' THEN 'credits_reports_remaining'
    ELSE 'credits_ideas_remaining'
  END;

  IF NEW.status = 'completed' AND OLD.status NOT IN ('completed', 'failed', 'error') THEN
    EXECUTE format(
      'SELECT %I FROM public.user_credits WHERE user_id = $1 FOR UPDATE',
      credit_column
    )
    INTO current_credits
    USING NEW.user_id;

    IF current_credits > 0 THEN
      EXECUTE format(
        'UPDATE public.user_credits SET %I = %I - 1, updated_at = now() WHERE user_id = $1',
        credit_column, credit_column
      )
      USING NEW.user_id;
    END IF;

    DELETE FROM public.credits_engaged WHERE job_id = NEW.id;
  ELSIF NEW.status IN ('failed', 'error') AND OLD.status NOT IN ('completed', 'failed', 'error') THEN
    DELETE FROM public.credits_engaged WHERE job_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

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

  IF public.has_role(p_user_id, 'super_user') THEN
    RETURN true;
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

  IF public.has_role(p_user_id, 'super_user') THEN
    RETURN true;
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

REVOKE ALL ON FUNCTION public.decrement_credit(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.try_engage_credit(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_credit_service(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_credit_service(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_credit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_engage_credit(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credit_service(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credit_service(uuid, text, text, text) TO service_role;
