-- Create cleanup function for stale engaged credits
CREATE OR REPLACE FUNCTION public.cleanup_stale_engaged_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete engaged credits older than 24 hours
  DELETE FROM public.credits_engaged
  WHERE engaged_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE LOG 'Cleaned up % stale engaged credits', deleted_count;
  
  RETURN deleted_count;
END;
$$;

-- Immediately clean up stale credits and orphaned pending jobs
SELECT public.cleanup_stale_engaged_credits();

-- Mark orphaned pending jobs as error (older than 15 minutes)
UPDATE public.jobs 
SET 
  status = 'error',
  updated_at = NOW(),
  response_payload = jsonb_build_object(
    'error', 'Job timeout - never processed by backend',
    'auto_cleaned_at', NOW()
  )
WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '15 minutes';