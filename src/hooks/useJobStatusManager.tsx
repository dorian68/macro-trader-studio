import { useState, useCallback } from 'react';
import { JobStatus } from '@/components/JobStatusCard';

export function useJobStatusManager() {
  const [activeJobs, setActiveJobs] = useState<JobStatus[]>([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);

  const addJob = useCallback((job: Omit<JobStatus, 'id' | 'createdAt'>) => {
    const newJob: JobStatus = {
      ...job,
      progress: job.status === 'running' ? 10 : 0,
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
        
        // If job is completed, set progress to 100 and increment counter
        if (job.status !== 'completed' && updates.status === 'completed') {
          updatedJob.progress = 100;
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

  const simulateProgress = useCallback((jobId: string) => {
    const intervals = [25, 40, 55, 70, 85]; // Progress milestones
    const delays = [800, 1200, 900, 1100, 800]; // Varying delays for realistic feel
    
    intervals.forEach((progress, index) => {
      setTimeout(() => {
        updateJob(jobId, { progress });
      }, delays.slice(0, index + 1).reduce((sum, delay) => sum + delay, 0));
    });
  }, [updateJob]);

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
    resetCompletedCount,
    simulateProgress
  };
}