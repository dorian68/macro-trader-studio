-- Fix handle_new_user trigger to remove auto-approval for Google OAuth users
-- All new users should start with 'pending' status for admin approval

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

  -- Insert profile with 'pending' status for ALL new users
  -- No auto-approval for Google OAuth users - all require admin review
  INSERT INTO public.profiles (user_id, broker_name, broker_id, status)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'broker_name',
    broker_uuid,
    'pending' -- Always pending, requires admin approval
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign default role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;