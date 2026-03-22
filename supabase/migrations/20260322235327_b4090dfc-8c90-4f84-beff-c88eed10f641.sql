-- ============================================================
-- Phase 1: Idempotency table for Stripe webhooks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT,
  processed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.processed_stripe_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Phase 2: Credit ledger (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  credit_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  reference_id TEXT,
  balance_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.credit_transactions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_user'::app_role));

CREATE POLICY "Service role can manage transactions" ON public.credit_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_reference_id ON public.credit_transactions(reference_id);

-- ============================================================
-- Phase 3: provision_plan_credits RPC (idempotent, with ledger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.provision_plan_credits(
  p_user_id UUID,
  p_plan_type plan_type,
  p_source TEXT,
  p_reference_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan_params RECORD;
  v_existing RECORD;
  v_already_processed BOOLEAN;
BEGIN
  -- Idempotency check: skip if this reference was already processed
  IF p_reference_id IS NOT NULL AND p_reference_id != '' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.credit_transactions
      WHERE reference_id = p_reference_id
      LIMIT 1
    ) INTO v_already_processed;

    IF v_already_processed THEN
      RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'already_processed');
    END IF;
  END IF;

  -- Get plan parameters
  SELECT max_queries, max_ideas, max_reports
  INTO v_plan_params
  FROM public.plan_parameters
  WHERE plan_type = p_plan_type;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'plan_not_found');
  END IF;

  -- Upsert credits (SET to plan max — correct for plan provisioning/renewal)
  INSERT INTO public.user_credits (
    user_id, plan_type,
    credits_queries_remaining, credits_ideas_remaining, credits_reports_remaining,
    last_reset_date
  ) VALUES (
    p_user_id, p_plan_type,
    v_plan_params.max_queries, v_plan_params.max_ideas, v_plan_params.max_reports,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_type = EXCLUDED.plan_type,
    credits_queries_remaining = EXCLUDED.credits_queries_remaining,
    credits_ideas_remaining = EXCLUDED.credits_ideas_remaining,
    credits_reports_remaining = EXCLUDED.credits_reports_remaining,
    last_reset_date = EXCLUDED.last_reset_date,
    updated_at = now();

  -- Get final balances for ledger
  SELECT credits_queries_remaining, credits_ideas_remaining, credits_reports_remaining
  INTO v_existing
  FROM public.user_credits
  WHERE user_id = p_user_id;

  -- Record in ledger (one entry per credit type)
  INSERT INTO public.credit_transactions (user_id, transaction_type, credit_type, amount, source, reference_id, balance_after)
  VALUES
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