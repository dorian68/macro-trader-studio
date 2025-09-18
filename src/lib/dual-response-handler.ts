import { supabase } from '@/integrations/supabase/client';

interface ResponseHandler {
  onResponse: (data: any, source: 'n8n' | 'supabase') => void;
  jobId: string;
}

/**
 * Handles responses from both HTTP (n8n) and Supabase Realtime with "first response wins" strategy
 */
export class DualResponseHandler {
  private handlers = new Map<string, {
    onResponse: (data: any, source: 'n8n' | 'supabase') => void;
    resolved: boolean;
    channel?: any;
    timeoutId?: NodeJS.Timeout;
  }>();

  /**
   * Register a response handler for a specific job
   */
  registerHandler(jobId: string, onResponse: (data: any, source: 'n8n' | 'supabase') => void) {
    // Clean up any existing handler for this job
    this.unregisterHandler(jobId);

    const handler = {
      onResponse,
      resolved: false,
      channel: undefined as any,
      timeoutId: undefined as NodeJS.Timeout | undefined
    };

    this.handlers.set(jobId, handler);

    // Set up Supabase Realtime listener
    this.setupRealtimeListener(jobId);

    // Set up cleanup timeout (5 minutes)
    handler.timeoutId = setTimeout(() => {
      this.unregisterHandler(jobId);
    }, 5 * 60 * 1000);

    console.log(`[DualResponseHandler] Registered handler for job ${jobId}`);
  }

  /**
   * Handle HTTP response from n8n
   */
  handleHttpResponse(jobId: string, data: any) {
    const handler = this.handlers.get(jobId);
    if (!handler) {
      console.log(`[DualResponseHandler] No handler found for job ${jobId}`);
      return;
    }

    if (handler.resolved) {
      console.log(`⚠️ [HTTP] Late response ignored for job ${jobId}`);
      return;
    }

    console.log(`✅ [HTTP] Response received first for job ${jobId}`, data);
    handler.resolved = true;
    handler.onResponse(data, 'n8n');
    this.unregisterHandler(jobId);
  }

  /**
   * Set up Supabase Realtime listener for job updates
   */
  private setupRealtimeListener(jobId: string) {
    const handler = this.handlers.get(jobId);
    if (!handler) return;

    const channel = supabase
      .channel(`job-response-${jobId}`)
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
          console.log(`📡 [Realtime] Job update received for ${jobId}:`, job);
          
          if (job.status === 'completed' && job.response_payload) {
            if (handler.resolved) {
              console.log(`⚠️ [Realtime] Late response ignored for job ${jobId}`);
              return;
            }

            console.log(`✅ [Realtime] Response received first for job ${jobId}`, job.response_payload);
            handler.resolved = true;
            handler.onResponse(job.response_payload, 'supabase');
            this.unregisterHandler(jobId);
          } else if (job.status === 'error') {
            if (!handler.resolved) {
              console.log(`❌ [Realtime] Job failed for job ${jobId}:`, job.error_message || 'Unknown error');
              handler.resolved = true;
              handler.onResponse({ error: job.error_message || 'Job failed' }, 'supabase');
              this.unregisterHandler(jobId);
            }
          }
        }
      )
      .subscribe();

    handler.channel = channel;
  }

  /**
   * Clean up handler and associated resources
   */
  unregisterHandler(jobId: string) {
    const handler = this.handlers.get(jobId);
    if (!handler) return;

    // Clean up Supabase channel
    if (handler.channel) {
      supabase.removeChannel(handler.channel);
    }

    // Clear timeout
    if (handler.timeoutId) {
      clearTimeout(handler.timeoutId);
    }

    this.handlers.delete(jobId);
    console.log(`[DualResponseHandler] Unregistered handler for job ${jobId}`);
  }

  /**
   * Clean up all handlers
   */
  cleanup() {
    for (const jobId of this.handlers.keys()) {
      this.unregisterHandler(jobId);
    }
  }
}

// Global singleton instance
export const dualResponseHandler = new DualResponseHandler();