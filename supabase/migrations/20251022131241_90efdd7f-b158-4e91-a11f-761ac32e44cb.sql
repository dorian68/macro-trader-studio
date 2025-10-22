-- Update handle_new_user trigger to support Google OAuth users
-- This extension allows Google users to be created without broker initially
-- They will be auto-approved once broker is linked via OAuth callback

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  broker_uuid UUID;
  user_provider TEXT;
BEGIN
  -- Detect auth provider
  user_provider := NEW.raw_app_meta_data ->> 'provider';
  
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

  -- Insert profile with conditional status
  -- Google users without broker get 'pending' status initially
  -- They will be updated to 'approved' once broker is linked
  INSERT INTO public.profiles (user_id, broker_name, broker_id, status)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'broker_name',
    broker_uuid,
    CASE 
      WHEN user_provider = 'google' AND broker_uuid IS NOT NULL THEN 'approved'
      WHEN user_provider = 'google' AND broker_uuid IS NULL THEN 'pending'
      ELSE 'pending'
    END
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign default role in user_roles table (secure)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;