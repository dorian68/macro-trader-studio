import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface CompletedJob {
  id: string;
  type: string;
  instrument: string;
  resultData: any;
  completedAt: Date;
  originatingFeature: 'ai-setup' | 'macro-analysis' | 'reports';
}

interface PersistentNotificationContextType {
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
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedJob = payload.new as any;
          
          if (updatedJob.status === 'completed' && updatedJob.response_payload) {
            const completedJob: CompletedJob = {
              id: updatedJob.id,
              type: updatedJob.type,
              instrument: updatedJob.instrument || 'Unknown',
              resultData: updatedJob.response_payload,
              completedAt: new Date(),
              originatingFeature: mapTypeToFeature(updatedJob.type)
            };

            setCompletedJobs(prev => {
              // Avoid duplicates
              const exists = prev.some(job => job.id === completedJob.id);
              if (exists) return prev;
              return [...prev, completedJob];
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
        completedJobs, 
        markJobAsViewed, 
        navigateToResult 
      }}
    >
      {children}
    </PersistentNotificationContext.Provider>
  );
}