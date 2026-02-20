
-- Replace cleanup_stale_engaged_credits() with improved version
CREATE OR REPLACE FUNCTION public.cleanup_stale_engaged_credits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cleaned_count INT;
BEGIN
  DELETE FROM public.credits_engaged ce
  WHERE 
    -- Orphaned: job doesn't exist
    NOT EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = ce.job_id
    )
    -- Job in terminal state
    OR EXISTS (
      SELECT 1 FROM public.jobs j 
      WHERE j.id = ce.job_id 
        AND j.status IN ('completed', 'failed', 'error')
    )
    -- Job stuck in pending for more than 10 minutes
    OR EXISTS (
      SELECT 1 FROM public.jobs j 
      WHERE j.id = ce.job_id 
        AND j.status = 'pending' 
        AND j.created_at < NOW() - INTERVAL '10 minutes'
    )
    -- Engagement older than 30 minutes regardless
    OR ce.engaged_at < NOW() - INTERVAL '30 minutes';
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  IF cleaned_count > 0 THEN
    RAISE LOG '[CLEANUP] Purged % stale credits_engaged entries', cleaned_count;
  END IF;
END;
$function$;

-- Execute immediately to clear stale entries
SELECT public.cleanup_stale_engaged_credits();
