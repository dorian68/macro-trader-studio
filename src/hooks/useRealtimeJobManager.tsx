import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCreditManager, CreditType } from "@/hooks/useCreditManager";
import { subscribeToPostgresChanges, initializeRealtimeAuthManager, unsubscribeChannel } from "@/utils/supabaseRealtimeManager";
import { MOCK_PROGRESS_SEQUENCES } from "@/utils/mockProgressMessages";

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

// Map feature to credit type
const getCreditTypeForFeature = (feature?: string): CreditType => {
  const f = (feature || '').toLowerCase();
  if (f.includes('trade') || f.includes('ai_trade_setup')) return 'ideas';
  if (f.includes('macro') || f.includes('commentary')) return 'queries';
  if (f.includes('report')) return 'reports';
  return 'queries'; // fallback
};

export function useRealtimeJobManager() {
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkCredits, decrementCredit } = useCreditManager();
  
  // Track mock simulators state for each job
  const mockSimulatorsActive = useRef<Map<string, boolean>>(new Map());
  const mockTimeouts = useRef<Map<string, NodeJS.Timeout[]>>(new Map());

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
        
        // Handle progress message updates
        if (job.progress_message) {
          console.log('📝 [RealtimeJobManager] Real progress message from backend:', {
            jobId: job.id,
            progressMessage: job.progress_message,
            status: job.status
          });

          // STOP mock simulator when real message arrives
          const wasActive = mockSimulatorsActive.current.get(job.id);
          if (wasActive) {
            console.log(`🛑 [RealtimeJobManager] Stopping mock simulator for job ${job.id} - real backend message received`);
            mockSimulatorsActive.current.set(job.id, false);
          }

          setActiveJobs(prev => prev.map(activeJob => 
            activeJob.id === job.id 
              ? { ...activeJob, progressMessage: job.progress_message }
              : activeJob
          ));

          // Show progress update in toast
          toast({
            title: "Processing...",
            description: job.progress_message,
            duration: 4000,
            className: "fixed top-4 left-4 z-[100] max-w-sm animate-fade-in"
          });
        }
        
        if (job.status === 'completed' && job.response_payload) {
          console.log('✅ [RealtimeJobManager] Job completed:', {
            jobId: job.id,
            feature: job.feature,
            hasResponse: !!job.response_payload
          });

          // Stop mock simulator on completion
          mockSimulatorsActive.current.set(job.id, false);

          // Update the active job with results
          setActiveJobs(prev => prev.map(activeJob => 
            activeJob.id === job.id 
              ? { 
                  ...activeJob, 
                  status: 'completed', 
                  resultData: job.response_payload 
                }
              : activeJob
          ));

          toast({
            title: "Analysis Complete",
            description: "Your request has been processed successfully",
            duration: Infinity, // Reste visible jusqu'au clic
            className: "fixed top-4 left-4 z-[100] max-w-sm"
          });
        } else if (job.status === 'error') {
          console.log('❌ [RealtimeJobManager] Job failed:', {
            jobId: job.id,
            feature: job.feature
          });

          // Stop mock simulator on error
          mockSimulatorsActive.current.set(job.id, false);

          setActiveJobs(prev => prev.map(activeJob => 
            activeJob.id === job.id 
              ? { ...activeJob, status: 'error' }
              : activeJob
          ));

          toast({
            title: "Analysis Failed",
            description: "The request could not be processed",
            variant: "destructive",
            duration: Infinity, // Reste visible jusqu'au clic
            className: "fixed top-4 left-4 z-[100] max-w-sm"
          });
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
      }
    );

    return () => {
      console.log('🔍 [RealtimeJobManager] Cleaning up subscription', { channelName });
      unsubscribeChannel(channelName, 'COMPONENT_UNMOUNT');
      
      // Clean up all mock simulators and timeouts
      mockSimulatorsActive.current.forEach((_, jobId) => {
        const timeouts = mockTimeouts.current.get(jobId) || [];
        timeouts.forEach(id => clearTimeout(id));
        mockTimeouts.current.delete(jobId);
        mockSimulatorsActive.current.set(jobId, false);
      });
      mockSimulatorsActive.current.clear();
    };
  }, [user?.id, toast]);

  // Mock Progress Simulator Effect - runs for all active jobs
  useEffect(() => {
    console.log(`🔄 [MockProgress] useEffect triggered, ${activeJobs.length} active jobs`);
    
    activeJobs.forEach((job) => {
      const isSimulatorActive = mockSimulatorsActive.current.get(job.id) || false;
      const shouldSimulate = (job.status === 'pending' || job.status === 'running') && isSimulatorActive;
      
      console.log(`🔍 [MockProgress] Checking job ${job.id}: status=${job.status}, simulatorActive=${isSimulatorActive}, shouldSimulate=${shouldSimulate}`);
      
      if (!shouldSimulate) {
        // Clean up timeouts if simulator is inactive
        const existingTimeouts = mockTimeouts.current.get(job.id) || [];
        existingTimeouts.forEach(id => clearTimeout(id));
        mockTimeouts.current.delete(job.id);
        return;
      }

      // Check if already running
      if (mockTimeouts.current.has(job.id)) {
        return; // Already running
      }

      const feature = job.feature || mapTypeToFeature(job.type);
      const sequence = MOCK_PROGRESS_SEQUENCES[feature];
      
      if (!sequence) {
        console.warn(`⚠️ [MockProgress] No sequence found for feature: ${feature}`);
        return;
      }

      console.log(`🎬 [MockProgress] Starting simulator for ${feature} (job: ${job.id})`);
      
      const timeouts: NodeJS.Timeout[] = [];
      let messageIndex = 0;
      
      const scheduleNextMessage = () => {
        if (messageIndex >= sequence.messages.length) {
          console.log(`✅ [MockProgress] Sequence completed for job ${job.id}`);
          mockTimeouts.current.delete(job.id);
          return;
        }
        
        const msg = sequence.messages[messageIndex];
        const delay = Math.random() * (msg.maxDelay - msg.minDelay) + msg.minDelay;
        
        console.log(`⏱️ [MockProgress] Scheduling message ${messageIndex + 1}/${sequence.messages.length} in ${Math.round(delay)}ms`);
        
        const timeoutId = setTimeout(() => {
          // Check if simulator is still active
          if (!mockSimulatorsActive.current.get(job.id)) {
            console.log(`🛑 [MockProgress] Simulator stopped for job ${job.id}`);
            return;
          }
          
          console.log(`🔔 [MockProgress] ${feature} (${job.id}) - "${msg.text}"`);
          
          setActiveJobs(prev => prev.map(activeJob => 
            activeJob.id === job.id 
              ? { ...activeJob, progressMessage: msg.text }
              : activeJob
          ));

          toast({
            title: "Processing...",
            description: msg.text,
            duration: 4000,
            className: "fixed top-4 left-4 z-[100] max-w-sm animate-fade-in"
          });
          
          messageIndex++;
          scheduleNextMessage();
        }, delay);
        
        timeouts.push(timeoutId);
      };
      
      scheduleNextMessage();
      mockTimeouts.current.set(job.id, timeouts);
    });

    // Cleanup function
    return () => {
      activeJobs.forEach(job => {
        const timeouts = mockTimeouts.current.get(job.id) || [];
        timeouts.forEach(id => clearTimeout(id));
      });
    };
  }, [activeJobs, toast]);

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

    // CRITICAL: Activate simulator BEFORE adding to state to ensure useEffect sees the flag
    console.log(`🎬 [RealtimeJobManager] Activating mock simulator for feature: ${jobFeature}, jobId: ${jobId}`);
    mockSimulatorsActive.current.set(jobId, true);

    setActiveJobs(prev => [...prev, newJob]);

    console.log(`✅ [RealtimeJobManager] Job added to activeJobs, simulator is active:`, mockSimulatorsActive.current.get(jobId));

    return jobId;
  }, [user?.id, toast]);

  const removeJob = useCallback((jobId: string) => {
    console.log(`🗑️ [RealtimeJobManager] Removing job: ${jobId}`);
    mockSimulatorsActive.current.set(jobId, false);
    mockSimulatorsActive.current.delete(jobId);
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
