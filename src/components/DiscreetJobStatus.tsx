import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscreetJobStatusProps {
  activeJobsCount: number;
  latestMessage?: string;
  className?: string;
}

export function DiscreetJobStatus({ activeJobsCount, latestMessage, className }: DiscreetJobStatusProps) {
  if (activeJobsCount === 0) return null;

  return (
    <div className={cn(
      "fixed top-14 sm:top-16 left-1/2 transform -translate-x-1/2 z-30",
      "transition-all duration-300 ease-in-out",
      className
    )}>
      <Badge 
        variant="outline" 
        className="bg-muted/80 backdrop-blur-sm border-border/50 text-muted-foreground hover:bg-muted/90 transition-colors max-w-xs sm:max-w-md"
      >
        <Loader2 className="h-3 w-3 animate-spin mr-1.5 shrink-0" />
        <span className="text-xs truncate">
          {latestMessage || (activeJobsCount === 1 
            ? 'AI processing...' 
            : `${activeJobsCount} AI jobs running...`
          )}
        </span>
      </Badge>
      {latestMessage && (
        <div 
          key={latestMessage}
          className="absolute inset-0 bg-primary/10 rounded-full animate-in fade-in slide-in-from-left-2 duration-500"
        />
      )}
    </div>
  );
}