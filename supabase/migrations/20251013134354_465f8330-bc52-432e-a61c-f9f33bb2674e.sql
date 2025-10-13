-- Drop the policy that depends on profiles.role
DROP POLICY IF EXISTS "Super users can manage all brokers" ON public.brokers;

-- Remove the insecure role column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Update the handle_new_user trigger to not reference role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  broker_uuid UUID;
BEGIN
  -- Broker association from metadata if available
  IF NEW.raw_user_meta_data ->> 'broker_id' IS NOT NULL THEN
    broker_uuid := (NEW.raw_user_meta_data ->> 'broker_id')::UUID;
  ELSE
    IF NEW.raw_user_meta_data ->> 'broker_name' IS NOT NULL THEN
      SELECT id INTO broker_uuid 
      FROM public.brokers 
      WHERE name = NEW.raw_user_meta_data ->> 'broker_name'
      LIMIT 1;
    END IF;
  END IF;

  -- Insert profile WITHOUT role column
  INSERT INTO public.profiles (user_id, broker_name, broker_id, status)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'broker_name',
    broker_uuid,
    'pending'
  )
  ON CONFLICT DO NOTHING;

  -- Assign default role in user_roles table (secure)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Recreate the brokers policy using secure user_roles table
CREATE POLICY "Super users can manage all brokers"
ON public.brokers
FOR ALL
USING (has_role(auth.uid(), 'super_user'));