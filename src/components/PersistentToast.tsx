import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';
import { usePersistentNotifications } from './PersistentNotificationProvider';
import { useIsMobile } from '@/hooks/use-mobile';

export function PersistentToast() {
  const { completedJobs, markJobAsViewed, navigateToResult } = usePersistentNotifications();
  const isMobile = useIsMobile();

  if (completedJobs.length === 0) return null;

  // Show the most recent completed job
  const mostRecentJob = completedJobs[completedJobs.length - 1];

  return (
    <Card className={`
      fixed z-50 shadow-elegant border-primary/20 bg-card/95 backdrop-blur-sm
      ${isMobile 
        ? 'bottom-4 left-4 right-4 mx-auto max-w-sm' 
        : 'bottom-6 right-6 w-80'
      }
      animate-in slide-in-from-bottom-4 duration-300
    `}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-foreground">
                Result Ready
              </h4>
              {completedJobs.length > 1 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                  +{completedJobs.length - 1} more
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {mostRecentJob.instrument} analysis completed — click to view result
            </p>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => navigateToResult(mostRecentJob)}
                className="text-xs h-7 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
              >
                View Result
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-6 w-6 p-0 hover:bg-muted"
            onClick={() => markJobAsViewed(mostRecentJob.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}