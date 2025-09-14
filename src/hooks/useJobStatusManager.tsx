import { useState, useCallback } from 'react';
import { JobStatus } from '@/components/JobStatusCard';

export function useJobStatusManager() {
  const [activeJobs, setActiveJobs] = useState<JobStatus[]>([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);

  const addJob = useCallback((job: Omit<JobStatus, 'id' | 'createdAt'>) => {
    const newJob: JobStatus = {
      ...job,
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    
    setActiveJobs(prev => [newJob, ...prev]);
    return newJob.id;
  }, []);

  const updateJob = useCallback((jobId: string, updates: Partial<JobStatus>) => {
    setActiveJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        const updatedJob = { ...job, ...updates };
        
        // If job is completed, increment counter
        if (job.status !== 'completed' && updates.status === 'completed') {
          setCompletedJobsCount(count => count + 1);
        }
        
        return updatedJob;
      }
      return job;
    }));
  }, []);

  const removeJob = useCallback((jobId: string) => {
    setActiveJobs(prev => prev.filter(job => job.id !== jobId));
  }, []);

  const resetCompletedCount = useCallback(() => {
    setCompletedJobsCount(0);
  }, []);

  const getActiveJobs = useCallback(() => {
    return activeJobs.filter(job => 
      job.status === 'pending' || 
      job.status === 'running' || 
      (job.status === 'completed' && Date.now() - job.createdAt.getTime() < 10000) // Show completed for 10 seconds
    );
  }, [activeJobs]);

  return {
    activeJobs: getActiveJobs(),
    completedJobsCount,
    addJob,
    updateJob,
    removeJob,
    resetCompletedCount
  };
}