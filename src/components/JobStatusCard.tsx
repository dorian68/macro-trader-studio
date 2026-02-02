import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Loader2, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface JobStatus {
  id: string;
  type: 'ai_setup' | 'macro_commentary' | 'report';
  status: 'pending' | 'running' | 'completed' | 'failed';
  title: string;
  progress?: number;
  result?: any;
  error?: string;
  createdAt: Date;
}

interface JobStatusCardProps {
  jobs: JobStatus[];
  onViewResult?: (job: JobStatus) => void;
  onDismiss?: (jobId: string) => void;
  className?: string;
}

const JOB_TYPE_LABELS = {
  ai_setup: 'AI Trade Setup',
  macro_commentary: 'Macro Commentary',
  report: 'Report Generation'
};

const JOB_TYPE_COLORS = {
  ai_setup: 'bg-blue-100 text-blue-800',
  macro_commentary: 'bg-green-100 text-green-800',
  report: 'bg-purple-100 text-purple-800'
};

export function JobStatusCard({ jobs, onViewResult, onDismiss, className }: JobStatusCardProps) {
  if (jobs.length === 0) return null;

  // Show only the most recent job
  const currentJob = jobs[0];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Queued';
      case 'running':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  return (
    <div className={cn(
      "fixed top-16 sm:top-20 left-2 sm:left-4 z-50 w-[calc(100vw-1rem)] sm:w-80 max-w-[calc(100vw-1rem)]",
      className
    )}>
      <Card className="shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(currentJob.status)}
                <Badge className={JOB_TYPE_COLORS[currentJob.type]}>
                  {JOB_TYPE_LABELS[currentJob.type]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getStatusText(currentJob.status)}
                </Badge>
              </div>

              <h4 className="font-medium text-sm mb-1 truncate">
                {currentJob.title}
              </h4>

              <p className="text-xs text-muted-foreground">
                {currentJob.status === 'completed'
                  ? 'Click to view result'
                  : currentJob.status === 'failed'
                    ? currentJob.error || 'Processing failed'
                    : 'Processing your request...'}
              </p>

              {(currentJob.status === 'running' || currentJob.status === 'pending') && (
                <div className="mt-2">
                  <Progress
                    value={currentJob.progress || 10}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(currentJob.progress || 10)}% complete
                  </p>
                </div>
              )}

              {currentJob.status === 'completed' && (
                <Button
                  size="sm"
                  onClick={() => onViewResult?.(currentJob)}
                  className="mt-2 h-7 text-xs flex items-center gap-1 w-full sm:w-auto bg-black text-white hover:bg-accent hover:text-white border-0 transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  <span className="truncate">View Result</span>
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss?.(currentJob.id)}
              className="h-6 w-6 p-0 shrink-0 absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {jobs.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                +{jobs.length - 1} more job{jobs.length - 1 === 1 ? '' : 's'} in queue
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}