import { supabase } from '@/integrations/supabase/client';

export async function discardPendingJob(jobId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('discard_pending_job', {
    p_job_id: jobId,
  });

  if (error) {
    console.error('[Jobs] Failed to discard pending job:', error);
    return false;
  }

  return data === true;
}
