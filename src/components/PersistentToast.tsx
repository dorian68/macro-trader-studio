import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import { usePersistentNotifications } from './PersistentNotificationProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { getFeatureDisplayName } from '@/lib/feature-mapper';

export function PersistentToast() {
  const { activeJobs, completedJobs, markJobAsViewed, navigateToResult } = usePersistentNotifications();
  const isMobile = useIsMobile();
  
  // All hooks MUST be called before any conditional returns
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [elapsedTime, setElapsedTime] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const totalJobs = activeJobs.length + completedJobs.length;
  
  // Show the most recent job (prioritize completed over active)
  const isCompleted = completedJobs.length > 0;
  const mostRecentJob = isCompleted 
    ? completedJobs[completedJobs.length - 1]
    : activeJobs[activeJobs.length - 1];

  // Timer for active jobs
  useEffect(() => {
    if (!isCompleted && activeJobs.length > 0) {
      const startTime = activeJobs[activeJobs.length - 1].createdAt.getTime();
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isCompleted, activeJobs]);

  // Format elapsed time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragOffset({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 0);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;
      
      const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 0);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset]);

  // Early return AFTER all hooks have been called
  if (totalJobs === 0) return null;

  return (
    <Card 
      ref={cardRef}
      className={`
        fixed z-50 shadow-elegant border-primary/20 bg-card/95 backdrop-blur-sm
        transition-all duration-300
        ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'}
        ${isMinimized 
          ? isMobile 
            ? 'w-14 h-14 rounded-full' 
            : 'w-16 h-16 rounded-full'
          : isMobile 
            ? 'w-[calc(100vw-2rem)] max-w-sm' 
            : 'w-80'
        }
      `}
      style={{
        left: position.x || (isMobile ? '1rem' : 'auto'),
        right: position.x === 0 && !isMobile ? '1.5rem' : 'auto',
        top: position.y || (isMobile ? '5rem' : '1.5rem'),
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {isMinimized ? (
        // Minimized bubble view (Messenger-style)
        <div className="w-full h-full flex items-center justify-center relative group">
          {isCompleted ? (
            <CheckCircle className="h-6 w-6 text-success" />
          ) : (
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
          {totalJobs > 1 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {totalJobs}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="absolute -top-1 -left-1 h-5 w-5 p-0 rounded-full bg-background hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          
          {/* Desktop hover preview */}
          {!isMobile && (
            <div className="absolute left-full ml-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50">
              <Card className="w-60 shadow-elegant border-primary/20 bg-card/95 backdrop-blur-sm">
                <div className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-foreground mb-1">
                        {isCompleted ? 'Result Ready' : 'Processing...'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {isCompleted 
                          ? `${getFeatureDisplayName(mostRecentJob.feature)} completed`
                          : `${getFeatureDisplayName(mostRecentJob.feature)} in progress`
                        }
                      </p>
                      {!isCompleted && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Elapsed time</span>
                            <span className="font-mono">{formatTime(elapsedTime)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : (
        // Expanded view
        <div className="p-3">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              {isCompleted ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-xs font-medium text-foreground">
                  {isCompleted ? 'Result Ready' : 'Processing...'}
                </h4>
                {totalJobs > 1 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary">
                    +{totalJobs - 1}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {isCompleted 
                  ? `${getFeatureDisplayName(mostRecentJob.feature)} completed`
                  : `${getFeatureDisplayName(mostRecentJob.feature)} in progress`
                }
              </p>
              
              {/* Timer for active jobs */}
              {!isCompleted && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Elapsed time</span>
                    <span className="font-mono">{formatTime(elapsedTime)}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary animate-pulse"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}
              
              {isCompleted && (
                <Button 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToResult(completedJobs[completedJobs.length - 1]);
                  }}
                  className="text-xs h-6 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  View Result
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(true);
                }}
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  markJobAsViewed(mostRecentJob.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}