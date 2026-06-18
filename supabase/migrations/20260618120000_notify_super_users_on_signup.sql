-- Notify all super_users by email whenever a new account is created.
--
-- Purely additive and NON-BLOCKING: a dedicated AFTER INSERT trigger on
-- auth.users fires an asynchronous pg_net call to the existing
-- `notify-new-registration` edge function (which fans out to every super_user
-- via send-admin-notification). The whole body is wrapped in an exception guard
-- so a notification failure can NEVER block or roll back a signup — the current
-- onboarding flow (handle_new_user) is completely untouched.
--
-- The service-role key required by notify-new-registration is read from
-- Supabase Vault (secret name 'service_role_key'); it is NEVER stored in this
-- migration. If the secret is missing the function simply no-ops.

CREATE OR REPLACE FUNCTION public.notify_super_users_new_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;

    IF v_key IS NULL OR NEW.email IS NULL THEN
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := 'https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/notify-new-registration',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object(
        'userEmail', NEW.email,
        'brokerName', NEW.raw_user_meta_data->>'broker_name'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Swallow everything: signup must succeed regardless of notification issues.
    RAISE LOG 'notify_super_users_new_registration failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.notify_super_users_new_registration() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.notify_super_users_new_registration() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_notify_super_users ON auth.users;
CREATE TRIGGER on_auth_user_created_notify_super_users
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_super_users_new_registration();
