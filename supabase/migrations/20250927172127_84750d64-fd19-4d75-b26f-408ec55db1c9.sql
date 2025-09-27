-- Add monthly_price column to plan_parameters table
ALTER TABLE public.plan_parameters 
ADD COLUMN monthly_price_usd numeric(10,2) DEFAULT 0.00;

-- Update the monthly_price_usd column with current pricing data
UPDATE public.plan_parameters 
SET monthly_price_usd = CASE 
  WHEN plan_type = 'basic' THEN 25.00
  WHEN plan_type = 'standard' THEN 35.00
  WHEN plan_type = 'premium' THEN 49.00
  WHEN plan_type = 'free_trial' THEN 0.00
  WHEN plan_type = 'broker_free' THEN 0.00
  ELSE 0.00
END;