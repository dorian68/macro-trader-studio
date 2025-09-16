import { safePostRequest } from '@/lib/safe-request';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced POST request that supports both traditional HTTP response 
 * and parallel Realtime job tracking via Supabase
 */
export async function enhancedPostRequest(
  url: string, 
  payload: any, 
  options: {
    enableJobTracking?: boolean;
    jobType?: string;
    instrument?: string;
    feature?: string;
    headers?: Record<string, string>;
    jobId?: string; // Optional: reuse an existing job id instead of creating a new one
  } = {}
): Promise<{ response: Response; jobId?: string }> {
  
  let jobId: string | undefined;
  
  // If job tracking is enabled, create a job record and inject job_id
  if (options.enableJobTracking) {
    const { data: user } = await supabase.auth.getUser();
    
    if (user.user) {
      jobId = options.jobId || uuidv4();
      
      // Add job_id to the payload
      const enhancedPayload = {
        ...payload,
        job_id: jobId
      };
      
      // Create job record in Supabase only if we don't already have one
      if (!options.jobId) {
        await supabase
          .from('jobs')
          .insert({
            id: jobId,
            status: 'pending',
            request_payload: enhancedPayload,
            user_id: user.user.id,
            feature: options.feature
          });
      }
      
      // Send the enhanced payload with job_id
      const response = await safePostRequest(url, enhancedPayload, options.headers);
      
      return { response, jobId };
    }
  }
  
  // Fallback to traditional request without job tracking
  const response = await safePostRequest(url, payload, options.headers);
  return { response, jobId };
}

/**
 * Utility to handle response with potential realtime fallback
 */
export async function handleResponseWithFallback(
  response: Response,
  jobId?: string,
  onRealtimeResult?: (result: any) => void
): Promise<any> {
  
  let httpResult: any = null;
  let httpError: any = null;
  
  // Try to get HTTP response
  try {
    if (response.ok) {
      httpResult = await response.json();
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    httpError = error;
    console.log('HTTP response failed, waiting for realtime result...', error);
  }
  
  // If we have a job ID and HTTP failed, set up realtime listener
  if (jobId && httpError && onRealtimeResult) {
    console.log('Setting up realtime listener for job:', jobId);
    
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const job = payload.new as any;
          
          if (job.status === 'completed' && job.response_payload) {
            onRealtimeResult(job.response_payload);
            supabase.removeChannel(channel);
          } else if (job.status === 'error') {
            onRealtimeResult({ error: 'Job failed' });
            supabase.removeChannel(channel);
          }
        }
      )
      .subscribe();
    
    // Set timeout to clean up the listener
    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 300000); // 5 minutes timeout
    
    // Return a promise that resolves when realtime result arrives
    return new Promise((resolve, reject) => {
      const originalOnRealtimeResult = onRealtimeResult;
      onRealtimeResult = (result) => {
        originalOnRealtimeResult(result);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      };
    });
  }
  
  // If HTTP succeeded, return the result
  if (httpResult) {
    return httpResult;
  }
  
  // If both failed and no realtime fallback, throw the HTTP error
  throw httpError;
}