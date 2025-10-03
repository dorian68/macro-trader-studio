-- Add stripe_price_id column to plan_parameters table for dynamic plan mapping
ALTER TABLE public.plan_parameters 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Add unique constraint to ensure each Stripe price ID is associated with only one plan
ALTER TABLE public.plan_parameters 
ADD CONSTRAINT plan_parameters_stripe_price_id_key UNIQUE (stripe_price_id);

-- Update existing plans with their Stripe price IDs
UPDATE public.plan_parameters 
SET stripe_price_id = 'price_1SC398Bbyt0kGZ1fmyLGVmWa' 
WHERE plan_type = 'basic';

UPDATE public.plan_parameters 
SET stripe_price_id = 'price_1SC39lBbyt0kGZ1fUhOBloBb' 
WHERE plan_type = 'standard';

UPDATE public.plan_parameters 
SET stripe_price_id = 'price_1SC39zBbyt0kGZ1fvhRYyA0x' 
WHERE plan_type = 'premium';

-- Add comment explaining the column
COMMENT ON COLUMN public.plan_parameters.stripe_price_id IS 'Stripe price ID associated with this plan for webhook processing';