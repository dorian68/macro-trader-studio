import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { FlashMessage, FlashMessageData } from './FlashMessage';
import { useCreditManager, CreditType } from '@/hooks/useCreditManager';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { MOCK_PROGRESS_SEQUENCES } from '@/utils/mockProgressMessages';

interface ActiveJob {
  id: string;
  type: string;
  feature: string;
  instrument: string;
  status: 'pending' | 'running';
  createdAt: Date;
  originatingFeature: 'ai-setup' | 'macro-analysis' | 'reports';
  progressMessage?: string;
  userQuery?: string;
}

interface CompletedJob {
  id: string;
  type: string;
  feature: string;
  instrument: string;
  resultData: any;
  completedAt: Date;
  originatingFeature: 'ai-setup' | 'macro-analysis' | 'reports';
  progressMessage?: string;
  userQuery?: string;
}

interface PersistentNotificationContextType {
  activeJobs: ActiveJob[];
  completedJobs: CompletedJob[];
  markJobAsViewed: (jobId: string) => void;
  navigateToResult: (job: CompletedJob) => void;
  flashMessages: FlashMessageData[];
  addFlashMessage: (message: Omit<FlashMessageData, 'id'>) => void;
  removeFlashMessage: (id: string) => void;
}

const PersistentNotificationContext = createContext<PersistentNotificationContextType | undefined>(undefined);

export function usePersistentNotifications() {
  const context = useContext(PersistentNotificationContext);
  if (!context) {
    throw new Error('usePersistentNotifications must be used within a PersistentNotificationProvider');
  }
  return context;
}

interface PersistentNotificationProviderProps {
  children: ReactNode;
}

export function PersistentNotificationProvider({ children }: PersistentNotificationProviderProps) {
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [flashMessages, setFlashMessages] = useState<FlashMessageData[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { decrementCredit } = useCreditManager();
  const { toast } = useToast();
  
  // Mock progress simulator refs
  const mockSimulatorsActive = useRef<Map<string, boolean>>(new Map());
  const mockTimeouts = useRef<Map<string, NodeJS.Timeout[]>>(new Map());

  const addFlashMessage = (message: Omit<FlashMessageData, 'id'>) => {
    const id = `flash-${Date.now()}-${Math.random()}`;
    setFlashMessages(prev => [...prev, { ...message, id }]);
  };

  const removeFlashMessage = (id: string) => {
    setFlashMessages(prev => prev.filter(msg => msg.id !== id));
  };

  // Map job features to originating features
  const mapFeatureToOriginatingFeature = (feature: string): 'ai-setup' | 'macro-analysis' | 'reports' => {
    if (feature === 'AI Trade Setup') return 'ai-setup';
    if (feature === 'Macro Commentary') return 'macro-analysis';
    if (feature === 'Report') return 'reports';
    return 'ai-setup'; // fallback
  };

  // Map feature to credit type
  const getCreditTypeForFeature = (feature: string): CreditType => {
    const f = feature.toLowerCase();
    if (f.includes('trade') || f.includes('ai_trade_setup')) return 'ideas';
    if (f.includes('macro') || f.includes('commentary')) return 'queries';
    if (f.includes('report')) return 'reports';
    return 'queries';
  };

  // Map features to routes
  const mapFeatureToRoute = (feature: 'ai-setup' | 'macro-analysis' | 'reports'): string => {
    switch (feature) {
      case 'ai-setup': return '/ai-setup';
      case 'macro-analysis': return '/macro-analysis';
      case 'reports': return '/reports';
      default: return '/ai-setup';
    }
  };

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('persistent-job-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newJob = payload.new as any;
          
          console.log('📥 [PersistentNotifications] New job INSERT:', newJob);
          
          // Extract real data from request_payload
          const extractInstrument = (job: any): string => {
            if (job.instrument) return job.instrument;
            const payload = job.request_payload;
            if (!payload) return 'Analysis';
            return payload.instrument || payload.ticker || payload.symbol || payload.asset || 'Analysis';
          };
          
          const extractFeature = (job: any): string => {
            if (job.feature) return job.feature;
            const payload = job.request_payload;
            if (!payload || !payload.type) return 'analysis';
            
            // Map type to feature
            const typeMap: Record<string, string> = {
              'ai_trade_setup': 'AI Trade Setup',
              'macro_commentary': 'Macro Commentary',
              'report': 'Report',
              'reports': 'Report'
            };
            return typeMap[payload.type] || payload.type;
          };
          
          const extractUserQuery = (job: any): string | undefined => {
            const payload = job.request_payload;
            if (!payload) return undefined;
            
            return payload.userQuery || 
                   payload.query || 
                   payload.question || 
                   payload.analysis?.query ||
                   undefined;
          };
          
          const activeJob: ActiveJob = {
            id: newJob.id,
            type: extractFeature(newJob),
            feature: extractFeature(newJob),
            instrument: extractInstrument(newJob),
            status: 'pending',
            createdAt: new Date(),
            originatingFeature: mapFeatureToOriginatingFeature(extractFeature(newJob)),
            userQuery: extractUserQuery(newJob)
          };

          setActiveJobs(prev => {
            // Avoid duplicates
            const exists = prev.some(job => job.id === activeJob.id);
            if (exists) {
              console.log('📥 [PersistentNotifications] Job already exists, skipping');
              return prev;
            }
            console.log('📥 [PersistentNotifications] Adding new active job:', activeJob);
            
            // Activate mock simulator for this job
            console.log(`🎬 [PersistentNotifications] Activating mock simulator for job ${activeJob.id}, feature: ${activeJob.feature}`);
            mockSimulatorsActive.current.set(activeJob.id, true);
            
            return [...prev, activeJob];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedJob = payload.new as any;
          
          console.log('🔄 [PersistentNotifications] Job UPDATE:', updatedJob);
          
          if (updatedJob.status === 'running') {
            // Update active job status and progress message
            setActiveJobs(prev => prev.map(job => 
              job.id === updatedJob.id 
                ? { ...job, status: 'running', progressMessage: updatedJob.progress_message }
                : job
            ));
            console.log('🔄 [PersistentNotifications] Job set to running with progress:', updatedJob.progress_message);
          } else if (updatedJob.progress_message) {
            // Stop mock simulator when real backend message arrives
            const wasActive = mockSimulatorsActive.current.get(updatedJob.id);
            if (wasActive) {
              console.log(`🛑 [PersistentNotifications] Stopping mock simulator for job ${updatedJob.id} - real backend message received`);
              mockSimulatorsActive.current.set(updatedJob.id, false);
            }
            
            // Update progress message for pending/running jobs
            setActiveJobs(prev => prev.map(job => 
              job.id === updatedJob.id 
                ? { ...job, progressMessage: updatedJob.progress_message }
                : job
            ));
            console.log('🔄 [PersistentNotifications] Progress message updated:', updatedJob.progress_message);
          } else if (updatedJob.status === 'completed' && updatedJob.response_payload) {
            // Stop mock simulator on completion
            mockSimulatorsActive.current.set(updatedJob.id, false);
            
            // Move from active to completed
            console.log('✅ [PersistentNotifications] Job completed, moving to completed list');
            
            // Extract real data from request_payload for completed job too
            const extractInstrument = (job: any): string => {
              if (job.instrument) return job.instrument;
              const payload = job.request_payload;
              if (!payload) return 'Analysis';
              return payload.instrument || payload.ticker || payload.symbol || payload.asset || 'Analysis';
            };
            
            const extractFeature = (job: any): string => {
              if (job.feature) return job.feature;
              const payload = job.request_payload;
              if (!payload || !payload.type) return 'analysis';
              
              const typeMap: Record<string, string> = {
                'ai_trade_setup': 'AI Trade Setup',
                'macro_commentary': 'Macro Commentary',
                'report': 'Report',
                'reports': 'Report'
              };
              return typeMap[payload.type] || payload.type;
            };
            
            const extractUserQuery = (job: any): string | undefined => {
              const payload = job.request_payload;
              if (!payload) return undefined;
              
              return payload.userQuery || 
                     payload.query || 
                     payload.question || 
                     payload.analysis?.query ||
                     undefined;
            };
            
            setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
            
            const completedJob: CompletedJob = {
              id: updatedJob.id,
              type: extractFeature(updatedJob),
              feature: extractFeature(updatedJob),
              instrument: extractInstrument(updatedJob),
              resultData: updatedJob.response_payload,
              completedAt: new Date(),
              originatingFeature: mapFeatureToOriginatingFeature(extractFeature(updatedJob)),
              userQuery: extractUserQuery(updatedJob)
            };

            // Add flash message for completion
            addFlashMessage({
              type: 'success',
              title: 'Analysis Complete',
              description: `${completedJob.instrument} analysis finished`,
              duration: 3000
            });

            setCompletedJobs(prev => {
              // Avoid duplicates
              const exists = prev.some(job => job.id === completedJob.id);
              if (exists) return prev;
              return [...prev, completedJob];
            });
          } else if (updatedJob.status === 'error') {
            // Stop mock simulator on error
            mockSimulatorsActive.current.set(updatedJob.id, false);
            
            // Remove failed jobs from active
            setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
            
            // Show error toast with retry button
            const originatingFeature = mapFeatureToOriginatingFeature(updatedJob.feature || '');
            const routeMap = {
              'ai-setup': '/ai-setup',
              'macro-analysis': '/macro-analysis',
              'reports': '/reports'
            };
            
            toast({
              title: "Analysis Failed",
              description: `${updatedJob.instrument || 'Unknown'} analysis encountered an error`,
              variant: "destructive",
              duration: Infinity,
              action: (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(routeMap[originatingFeature])}
                  className="border-destructive/30 hover:bg-destructive/10"
                >
                  Retry
                </Button>
              ),
              className: "fixed bottom-4 right-4 z-[100] max-w-sm"
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      
      // Clean up all mock simulators and timeouts
      mockSimulatorsActive.current.forEach((_, jobId) => {
        const timeouts = mockTimeouts.current.get(jobId) || [];
        timeouts.forEach(id => clearTimeout(id));
        mockTimeouts.current.delete(jobId);
        mockSimulatorsActive.current.set(jobId, false);
      });
      mockSimulatorsActive.current.clear();
    };
  }, [user]);

  // Mock Progress Simulator Effect
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

      // Map feature to mock sequence key
      const featureMap: Record<string, string> = {
        'AI Trade Setup': 'ai_trade_setup',
        'Macro Commentary': 'macro_commentary',
        'Report': 'reports'
      };
      
      const sequenceKey = featureMap[job.feature] || job.feature;
      const sequence = MOCK_PROGRESS_SEQUENCES[sequenceKey];
      
      if (!sequence) {
        console.warn(`⚠️ [MockProgress] No sequence found for feature: ${job.feature} (key: ${sequenceKey})`);
        return;
      }

      console.log(`🎬 [MockProgress] Starting simulator for ${job.feature} (job: ${job.id})`);
      
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
          
          console.log(`🔔 [MockProgress] ${job.feature} (${job.id}) - "${msg.text}"`);
          
          // 🔔 Update job with progress message (displayed in DiscreetJobStatus & JobStatusCards)
          setActiveJobs(prev => prev.map(activeJob => 
            activeJob.id === job.id 
              ? { ...activeJob, progressMessage: msg.text }
              : activeJob
          ));
          
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
  }, [activeJobs]);

  const markJobAsViewed = (jobId: string) => {
    setCompletedJobs(prev => prev.filter(job => job.id !== jobId));
    setActiveJobs(prev => prev.filter(job => job.id !== jobId));
  };

  // Normalize feature type for consistent checking in destination pages
  const normalizeFeatureType = (feature: string): string => {
    // Convert "AI Trade Setup" -> "ai_trade_setup"
    // Convert "Macro Commentary" -> "macro_commentary"
    // Convert "Report" -> "report"
    return feature.toLowerCase().replace(/\s+/g, '_');
  };

  const navigateToResult = (job: CompletedJob) => {
    const route = mapFeatureToRoute(job.originatingFeature);
    
    // Store result data in sessionStorage for the target page to pick up
    sessionStorage.setItem('pendingResult', JSON.stringify({
      jobId: job.id,
      type: normalizeFeatureType(job.type), // Normalize the type
      instrument: job.instrument,
      resultData: job.resultData,
      timestamp: job.completedAt.toISOString()
    }));

    navigate(route);
    markJobAsViewed(job.id);
  };

  return (
    <PersistentNotificationContext.Provider 
      value={{ 
        activeJobs, 
        completedJobs, 
        markJobAsViewed, 
        navigateToResult,
        flashMessages,
        addFlashMessage,
        removeFlashMessage
      }}
    >
      {children}
      
      {/* Flash messages are now handled within PersistentToast */}
    </PersistentNotificationContext.Provider>
  );
}