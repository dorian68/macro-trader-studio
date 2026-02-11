import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { subscribeToPostgresChanges, unsubscribeChannel } from '@/utils/supabaseRealtimeManager';

interface JobCompletionEvent {
  jobId: string;
  feature: string;
  responsePayload: any;
  instrument: string;
}

interface ResponseInjectorProps {
  onMacroCommentaryResult?: (data: any, jobId: string) => void;
  onTradeSetupResult?: (data: any, jobId: string) => void;
  onReportResult?: (data: any, jobId: string) => void;
}

export function useRealtimeResponseInjector({
  onMacroCommentaryResult,
  onTradeSetupResult,
  onReportResult
}: ResponseInjectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const injectResponse = useCallback((job: JobCompletionEvent) => {
    console.log(`🔄 [ResponseInjector] Processing completed job:`, {
      jobId: job.jobId,
      feature: job.feature,
      instrument: job.instrument
    });

    // Route response to appropriate handler based on feature
    switch (job.feature) {
      case 'macro_commentary':
      case 'Macro Commentary':
        if (onMacroCommentaryResult) {
          console.log('📊 [ResponseInjector] Injecting macro commentary result');
          onMacroCommentaryResult(job.responsePayload, job.jobId);
        } else {
          // Show notification if no handler is available
          toast({
            title: "Macro Analysis Complete",
            description: "Your macro commentary is ready. Navigate to the Macro Analysis page to view it.",
            duration: 10000,
          });
        }
        break;

      case 'ai_trade_setup':
      case 'AI Trade Setup':
        if (onTradeSetupResult) {
          console.log('⚡ [ResponseInjector] Injecting trade setup result');
          onTradeSetupResult(job.responsePayload, job.jobId);
        } else {
          toast({
            title: "Trade Setup Complete",
            description: "Your AI trade setup is ready. Navigate to the Trading Dashboard to view it.",
            duration: 10000,
          });
        }
        break;

      case 'report':
      case 'Report':
      case 'reports':
      case 'Reports':
        if (onReportResult) {
          console.log('📄 [ResponseInjector] Injecting report result');
          onReportResult(job.responsePayload, job.jobId);
        } else {
          toast({
            title: "Report Complete",
            description: "Your report has been generated and is ready for export.",
            duration: 10000,
          });
        }
        break;

      default:
        console.log(`⚠️ [ResponseInjector] Unknown feature: ${job.feature}`);
        toast({
          title: "Analysis Complete",
          description: "Your request has been processed successfully.",
          duration: 10000,
        });
    }
  }, [onMacroCommentaryResult, onTradeSetupResult, onReportResult, toast]);

  // Set up realtime listener for job completions
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 [ResponseInjector] Setting up realtime listener for user:', user.id);

    const channelName = `response-injector-${user.id}`;
    
    const channel = subscribeToPostgresChanges(
      channelName,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        const job = payload.new as any;
        
        if (job.status === 'completed' && job.response_payload) {
          console.log('✅ [ResponseInjector] Job completed:', {
            id: job.id,
            feature: job.feature,
            status: job.status
          });

          const jobEvent: JobCompletionEvent = {
            jobId: job.id,
            feature: job.feature,
            responsePayload: job.response_payload,
            instrument: job.request_payload?.instrument || 'unknown'
          };

          injectResponse(jobEvent);
        }
      }
    );

    return () => {
      console.log('🔄 [ResponseInjector] Cleaning up realtime listener');
      unsubscribeChannel(channelName);
    };
  }, [user?.id, injectResponse]);

  return {
    // Expose method to manually trigger response injection if needed
    triggerResponseInjection: injectResponse
  };
}