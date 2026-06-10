-- Link the production AlphaLens plans to their live Stripe monthly prices.

DO $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.plan_parameters
  SET
    monthly_price_usd = CASE plan_type
      WHEN 'basic' THEN 25.00
      WHEN 'standard' THEN 35.00
      WHEN 'premium' THEN 49.00
      ELSE monthly_price_usd
    END,
    stripe_price_id = CASE plan_type
      WHEN 'basic' THEN 'price_1Tgv8PB2Pjgoe0Q17RyJLwu7'
      WHEN 'standard' THEN 'price_1Tgv8aB2Pjgoe0Q1OqOgLA4l'
      WHEN 'premium' THEN 'price_1Tgv8cB2Pjgoe0Q1IJZjaV48'
      ELSE stripe_price_id
    END,
    updated_at = now()
  WHERE plan_type IN ('basic', 'standard', 'premium');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 3 THEN
    RAISE EXCEPTION 'Expected to update 3 paid plans, updated %', v_updated;
  END IF;
END;
$$;
