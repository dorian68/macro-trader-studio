import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscreetJobStatusProps {
  activeJobsCount: number;
  className?: string;
}

export function DiscreetJobStatus({ activeJobsCount, className }: DiscreetJobStatusProps) {
  if (activeJobsCount === 0) return null;

  return (
    <div className={cn(
      "fixed top-14 sm:top-16 left-1/2 transform -translate-x-1/2 z-30",
      "transition-all duration-300 ease-in-out",
      className
    )}>
      <Badge 
        variant="outline" 
        className="bg-muted/80 backdrop-blur-sm border-border/50 text-muted-foreground hover:bg-muted/90 transition-colors"
      >
        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
        <span className="text-xs">
          {activeJobsCount === 1 
            ? 'AI processing...' 
            : `${activeJobsCount} AI jobs running...`
          }
        </span>
      </Badge>
    </div>
  );
}