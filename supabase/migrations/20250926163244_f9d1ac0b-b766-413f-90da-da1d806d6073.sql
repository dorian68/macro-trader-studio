-- Update the handle_new_user function to handle broker_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  broker_uuid UUID;
BEGIN
  -- Check if broker_id is provided in metadata
  IF NEW.raw_user_meta_data ->> 'broker_id' IS NOT NULL THEN
    broker_uuid := (NEW.raw_user_meta_data ->> 'broker_id')::UUID;
  ELSE
    -- Try to find broker by name if broker_name is provided
    IF NEW.raw_user_meta_data ->> 'broker_name' IS NOT NULL THEN
      SELECT id INTO broker_uuid 
      FROM public.brokers 
      WHERE name = NEW.raw_user_meta_data ->> 'broker_name'
      LIMIT 1;
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, broker_name, broker_id, status, role)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'broker_name',
    broker_uuid,
    'pending',
    'user'
  );
  RETURN NEW;
END;
$$;