import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ActiveJob {
  id: string;
  type: string;
  instrument: string;
  status: 'pending' | 'running';
  createdAt: Date;
  originatingFeature: 'ai-setup' | 'macro-analysis' | 'reports';
}

interface CompletedJob {
  id: string;
  type: string;
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
  const { user } = useAuth();
  const navigate = useNavigate();

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
            instrument: newJob.instrument || 'Unknown',
            status: 'pending',
            createdAt: new Date(),
            originatingFeature: mapTypeToFeature(newJob.type || '')
          };

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
              instrument: updatedJob.instrument || 'Unknown',
              resultData: updatedJob.response_payload,
              completedAt: new Date(),
              originatingFeature: mapTypeToFeature(updatedJob.type || '')
            };

            setCompletedJobs(prev => {
              // Avoid duplicates
              const exists = prev.some(job => job.id === completedJob.id);
              if (exists) return prev;
              return [...prev, completedJob];
            });
          } else if (updatedJob.status === 'error') {
            // Remove failed jobs from active
            setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
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
        navigateToResult 
      }}
    >
      {children}
    </PersistentNotificationContext.Provider>
  );
}