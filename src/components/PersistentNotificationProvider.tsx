import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { FlashMessage, FlashMessageData } from './FlashMessage';

interface ActiveJob {
  id: string;
  type: string;
  feature: string;
  instrument: string;
  status: 'pending' | 'running';
  createdAt: Date;
  originatingFeature: 'ai-setup' | 'macro-analysis' | 'reports';
}

interface CompletedJob {
  id: string;
  type: string;
  feature: string;
  instrument: string;
  resultData: any;
  completedAt: Date;
  originatingFeature: 'ai-setup' | 'macro-analysis' | 'reports';
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

  const addFlashMessage = (message: Omit<FlashMessageData, 'id'>) => {
    const id = `flash-${Date.now()}-${Math.random()}`;
    setFlashMessages(prev => [...prev, { ...message, id }]);
  };

  const removeFlashMessage = (id: string) => {
    setFlashMessages(prev => prev.filter(msg => msg.id !== id));
  };

  // Map job types to originating features
  const mapTypeToFeature = (type: string): 'ai-setup' | 'macro-analysis' | 'reports' => {
    if (type.includes('trade_setup') || type.includes('ai_trade_setup')) return 'ai-setup';
    if (type.includes('macro') || type.includes('commentary')) return 'macro-analysis';
    if (type.includes('report')) return 'reports';
    return 'ai-setup'; // fallback
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
          
          const activeJob: ActiveJob = {
            id: newJob.id,
            type: newJob.type || 'Unknown',
            feature: newJob.feature || newJob.type || 'analysis',
            instrument: newJob.instrument || 'Unknown',
            status: 'pending',
            createdAt: new Date(),
            originatingFeature: mapTypeToFeature(newJob.type || '')
          };

          // Add flash message for job start
          addFlashMessage({
            type: 'info',
            title: 'Analysis Started',
            description: `${activeJob.instrument} analysis has begun`,
            duration: 3000
          });

          setActiveJobs(prev => {
            // Avoid duplicates
            const exists = prev.some(job => job.id === activeJob.id);
            if (exists) return prev;
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
          
          if (updatedJob.status === 'running') {
            // Update active job status
            setActiveJobs(prev => prev.map(job => 
              job.id === updatedJob.id 
                ? { ...job, status: 'running' }
                : job
            ));
          } else if (updatedJob.status === 'completed' && updatedJob.response_payload) {
            // Move from active to completed
            setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
            
            const completedJob: CompletedJob = {
              id: updatedJob.id,
              type: updatedJob.type || 'Unknown',
              feature: updatedJob.feature || updatedJob.type || 'analysis',
              instrument: updatedJob.instrument || 'Unknown',
              resultData: updatedJob.response_payload,
              completedAt: new Date(),
              originatingFeature: mapTypeToFeature(updatedJob.type || '')
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
            // Remove failed jobs from active
            setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
            
            // Add flash message for failure
            addFlashMessage({
              type: 'error',
              title: 'Analysis Failed',
              description: `${updatedJob.instrument || 'Unknown'} analysis encountered an error`,
              duration: 5000
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const markJobAsViewed = (jobId: string) => {
    setCompletedJobs(prev => prev.filter(job => job.id !== jobId));
    setActiveJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const navigateToResult = (job: CompletedJob) => {
    const route = mapFeatureToRoute(job.originatingFeature);
    
    // Store result data in sessionStorage for the target page to pick up
    sessionStorage.setItem('pendingResult', JSON.stringify({
      jobId: job.id,
      type: job.type,
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
      
      {/* Render flash messages */}
      {flashMessages.map((message, index) => (
        <FlashMessage
          key={message.id}
          message={message}
          onRemove={removeFlashMessage}
          index={index}
        />
      ))}
    </PersistentNotificationContext.Provider>
  );
}