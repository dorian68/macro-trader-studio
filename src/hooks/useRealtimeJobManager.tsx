import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToPostgresChanges, initializeRealtimeAuthManager, unsubscribeChannel } from "@/utils/supabaseRealtimeManager";


const { useState, useCallback, useEffect, useRef } = React;

interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  request_payload: any;
  response_payload?: any;
  created_at: string;
  updated_at: string;
  feature?: string;
  user_id: string;
  progress_message?: string;
}

interface ActiveJob {
  id: string;
  type: string;
  instrument: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime: Date;
  resultData?: any;
  progressMessage?: string;
  feature?: string;
}

// Map job types to features for backward compatibility
const mapTypeToFeature = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'macro_commentary':
    case 'macro-commentary':
    case 'macro_analysis':
      return 'macro_commentary';
    case 'trade_setup':
    case 'tradesetup':
    case 'ai_trade_setup':
      return 'ai_trade_setup';
    case 'reports':
    case 'report':
      return 'report';
    default:
      return 'macro_commentary'; // Default fallback
  }
};

export function useRealtimeJobManager() {
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const { user } = useAuth();

  // Initialize realtime auth manager once
  useEffect(() => {
    initializeRealtimeAuthManager();
  }, []);

  // Subscribe to realtime updates for jobs table
  useEffect(() => {
    if (!user?.id) {
      console.log('🔍 [RealtimeJobManager] No user, skipping subscription');
      return;
    }

    console.log('🔍 [RealtimeJobManager] Setting up subscription for user:', user.id);

    const channelName = `jobs-changes-${user.id}`;
    
    const channel = subscribeToPostgresChanges(
      channelName,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        const job = payload.new as JobStatus;
        
        console.log('🔍 [RealtimeJobManager] Received realtime event:', {
          eventType: payload.eventType,
          jobId: job.id,
          channelName,
          old: payload.old,
          new: payload.new,
          timestamp: new Date().toISOString(),
          jobCorrelation: {
            jobId: job.id,
            status: job.status,
            feature: job.feature,
            hasProgressMessage: !!job.progress_message
          }
        });
        
        try {
          // Handle progress message updates
          if (job.progress_message) {
            console.log('📝 [RealtimeJobManager] Real progress message from backend:', {
              jobId: job.id,
              progressMessage: job.progress_message,
              status: job.status
            });

            setActiveJobs(prev => prev.map(activeJob => 
              activeJob.id === job.id 
                ? { ...activeJob, progressMessage: job.progress_message }
                : activeJob
            ));
          }
          
          if (job.status === 'completed' && job.response_payload) {
            console.log('✅ [RealtimeJobManager] Job completed:', {
              jobId: job.id,
              feature: job.feature,
              hasResponse: !!job.response_payload
            });

            setActiveJobs(prev => prev.map(activeJob => 
              activeJob.id === job.id 
                ? { 
                    ...activeJob, 
                    status: 'completed', 
                    resultData: job.response_payload 
                  }
                : activeJob
            ));
          } else if (job.status === 'error') {
            console.log('❌ [RealtimeJobManager] Job failed:', {
              jobId: job.id,
              feature: job.feature
            });

            setActiveJobs(prev => prev.map(activeJob => 
              activeJob.id === job.id 
                ? { ...activeJob, status: 'error' }
                : activeJob
            ));
          } else if (job.status === 'running') {
            console.log('🔄 [RealtimeJobManager] Job running:', {
              jobId: job.id,
              feature: job.feature
            });

            setActiveJobs(prev => prev.map(activeJob => 
              activeJob.id === job.id 
                ? { ...activeJob, status: 'running' }
                : activeJob
            ));
          } else {
            console.log('ℹ️ [RealtimeJobManager] Job status update:', {
              jobId: job.id,
              status: job.status,
              hasResponse: !!job.response_payload
            });
          }
        } catch (err) {
          console.error('[RealtimeJobManager] Error processing job update:', err);
        }
        
        // Note: Credit release is now handled by the auto_manage_credits trigger
        // No frontend release needed to avoid double-processing
      }
    );

    return () => {
      console.log('🔍 [RealtimeJobManager] Cleaning up subscription', { channelName });
      unsubscribeChannel(channelName, 'COMPONENT_UNMOUNT');
    };
  }, [user?.id]);

  const createJob = useCallback(async (
    type: string,
    instrument: string,
    requestPayload: any,
    feature?: string
  ): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const jobId = uuidv4();

    // Map type to feature if not explicitly provided
    const jobFeature = feature || mapTypeToFeature(type);

    // Create job in database with feature field
    const { error } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        status: 'pending',
        request_payload: requestPayload,
        user_id: user.id,
        feature: jobFeature
      });

    if (error) {
      console.error('Error creating job:', error);
      throw new Error('Failed to create job');
    }

    // Add to local state
    const newJob: ActiveJob = {
      id: jobId,
      type,
      instrument,
      status: 'pending',
      startTime: new Date(),
      feature: jobFeature
    };

    setActiveJobs(prev => [...prev, newJob]);

    console.log(`✅ [RealtimeJobManager] Job created: ${jobId}, feature: ${jobFeature}`);

    return jobId;
  }, [user?.id]);

  const removeJob = useCallback((jobId: string) => {
    console.log(`🗑️ [RealtimeJobManager] Removing job: ${jobId}`);
    setActiveJobs(prev => prev.filter(job => job.id !== jobId));
  }, []);

  const getActiveJobs = useCallback(() => {
    return activeJobs.filter(job => 
      job.status === 'pending' || job.status === 'running'
    );
  }, [activeJobs]);

  const getCompletedJobs = useCallback(() => {
    return activeJobs.filter(job => job.status === 'completed');
  }, [activeJobs]);

  return {
    activeJobs,
    createJob,
    removeJob,
    getActiveJobs,
    getCompletedJobs
  };
}
