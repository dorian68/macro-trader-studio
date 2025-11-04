-- ============================================================
-- ATOMIC CREDIT ENGAGEMENT SYSTEM (Zero Regression Fix)
-- ============================================================

-- 🔐 STEP 1: Create atomic engagement RPC with row locking
CREATE OR REPLACE FUNCTION public.try_engage_credit(
  p_user_id UUID,
  p_feature TEXT,
  p_job_id UUID
)
RETURNS TABLE(success BOOLEAN, available_credits INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credit_column TEXT;
  v_total_credits INTEGER;
  v_engaged_count INTEGER;
  v_available INTEGER;
BEGIN
  v_credit_column := CASE p_feature
    WHEN 'queries' THEN 'credits_queries_remaining'
    WHEN 'ideas' THEN 'credits_ideas_remaining'
    WHEN 'reports' THEN 'credits_reports_remaining'
    ELSE NULL
  END;
  
  IF v_credit_column IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Invalid feature type'::TEXT;
    RETURN;
  END IF;
  
  EXECUTE format('
    SELECT %I FROM public.user_credits 
    WHERE user_id = $1
    FOR UPDATE
  ', v_credit_column)
  INTO v_total_credits
  USING p_user_id;
  
  IF v_total_credits IS NULL OR v_total_credits <= 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'No credits available'::TEXT;
    RETURN;
  END IF;
  
  SELECT COUNT(*) INTO v_engaged_count
  FROM public.credits_engaged
  WHERE user_id = p_user_id AND feature = p_feature;
  
  v_available := v_total_credits - v_engaged_count;
  
  IF v_available <= 0 THEN
    RETURN QUERY SELECT FALSE, v_available, 
      'All credits currently engaged in active jobs'::TEXT;
    RETURN;
  END IF;
  
  INSERT INTO public.credits_engaged (user_id, feature, job_id)
  VALUES (p_user_id, p_feature, p_job_id);
  
  RAISE LOG '[CREDIT] Engaged atomically: user=%, feature=%, job=%, available=%', 
    p_user_id, p_feature, p_job_id, v_available - 1;
  
  RETURN QUERY SELECT TRUE, v_available - 1, 
    'Credit engaged successfully'::TEXT;
END;
$$;

-- 🔐 STEP 2: Update trigger with FOR UPDATE
CREATE OR REPLACE FUNCTION public.auto_manage_credits()
RETURNS TRIGGER AS $$
DECLARE
  engaged_feature TEXT;
  credit_column TEXT;
  current_credits INTEGER;
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
  
  credit_column := CASE engaged_feature
    WHEN 'queries' THEN 'credits_queries_remaining'
    WHEN 'ideas' THEN 'credits_ideas_remaining'
    WHEN 'reports' THEN 'credits_reports_remaining'
    ELSE 'credits_ideas_remaining'
  END;

  IF NEW.status = 'completed' AND OLD.status NOT IN ('completed', 'failed', 'error') THEN
    EXECUTE format('
      SELECT %I FROM public.user_credits
      WHERE user_id = $1
      FOR UPDATE
    ', credit_column)
    INTO current_credits
    USING NEW.user_id;
    
    IF current_credits > 0 THEN
      EXECUTE format('
        UPDATE public.user_credits
        SET %I = %I - 1, updated_at = now()
        WHERE user_id = $1
      ', credit_column, credit_column)
      USING NEW.user_id;
      
      RAISE LOG '[CREDIT] Job % completed: 1 credit debited from % (was %, now %)', 
        NEW.id, credit_column, current_credits, current_credits - 1;
    ELSE
      RAISE WARNING '[CREDIT] Job % completed but no credits to debit (already 0)', NEW.id;
    END IF;
    
    DELETE FROM public.credits_engaged WHERE job_id = NEW.id;
    
  ELSIF NEW.status IN ('failed', 'error') AND OLD.status NOT IN ('completed', 'failed', 'error') THEN
    DELETE FROM public.credits_engaged WHERE job_id = NEW.id;
    RAISE LOG '[CREDIT] Job % failed: engagement released, NO credit debited', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS auto_manage_credits_trigger ON public.jobs;
CREATE TRIGGER auto_manage_credits_trigger
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_manage_credits();