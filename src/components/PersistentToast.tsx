import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePersistentNotifications } from './PersistentNotificationProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { getFeatureDisplayName } from '@/lib/feature-mapper';
import { MiniProgressBubble } from './MiniProgressBubble';
import { ScrollArea } from '@/components/ui/scroll-area';

export function PersistentToast() {
  const { activeJobs, completedJobs, flashMessages, removeFlashMessage, markJobAsViewed, navigateToResult } = usePersistentNotifications();
  const isMobile = useIsMobile();
  
  // All hooks MUST be called before any conditional returns
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [showMiniBubble, setShowMiniBubble] = useState<{
    feature: string;
    message: string;
    titleOverride?: string;
  } | null>(null);
  const [jobTimers, setJobTimers] = useState<Record<string, number>>({});

  const totalCount = activeJobs.length + completedJobs.length + flashMessages.length;
  const allJobs = [...activeJobs, ...completedJobs];
  
  // Auto-select most recent job when jobs change
  useEffect(() => {
    if (allJobs.length > 0 && selectedJobIndex >= allJobs.length) {
      setSelectedJobIndex(allJobs.length - 1);
    }
  }, [allJobs.length]);
  
  const currentJob = allJobs[selectedJobIndex];
  const isCompleted = currentJob && 'result' in currentJob;
  const latestFlash = flashMessages.length > 0 ? flashMessages[flashMessages.length - 1] : null;
  
  // Navigation functions
  const goToNextJob = () => {
    setSelectedJobIndex((prev) => (prev + 1) % allJobs.length);
  };
  
  const goToPreviousJob = () => {
    setSelectedJobIndex((prev) => (prev - 1 + allJobs.length) % allJobs.length);
  };
  // Individual timers for all active jobs
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];
    
    activeJobs.forEach((job) => {
      const startTime = job.createdAt.getTime();
      const interval = setInterval(() => {
        setJobTimers(prev => ({
          ...prev,
          [job.id]: Date.now() - startTime
        }));
      }, 1000);
      intervals.push(interval);
    });
    
    return () => intervals.forEach(clearInterval);
  }, [activeJobs]);

  // Show mini bubble when minimized and progress message updates
  useEffect(() => {
    if (isMinimized && currentJob && !isCompleted && 'progressMessage' in currentJob && currentJob.progressMessage) {
      setShowMiniBubble({
        feature: currentJob.feature || 'unknown',
        message: currentJob.progressMessage
      });
    }
  }, [isMinimized, isCompleted, currentJob?.progressMessage]);

  // Show mini bubble for flash messages when minimized
  useEffect(() => {
    if (isMinimized && flashMessages.length > 0) {
      const last = flashMessages[flashMessages.length - 1];
      setShowMiniBubble({
        feature: 'notification',
        message: last.description || last.title,
        titleOverride: last.title
      });
    }
  }, [isMinimized, flashMessages.length]);
  
  // Show mini bubble when a job completes (when minimized)
  useEffect(() => {
    if (isMinimized && completedJobs.length > 0) {
      const job = completedJobs[completedJobs.length - 1];
      setShowMiniBubble({
        feature: job.feature || 'unknown',
        message: `${getFeatureDisplayName(job.feature)} completed`
      });
    }
  }, [isMinimized, completedJobs.length]);
  
  // Get elapsed time for a specific job
  const getJobElapsedTime = (job: typeof currentJob) => {
    if (!job) return 0;
    return jobTimers[job.id] || 0;
  };
  
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
  if (totalCount === 0) return null;

  return (
    <>
      {/* Mini Progress Bubble (when minimized) */}
      {showMiniBubble && isMinimized && (
        <MiniProgressBubble
          feature={showMiniBubble.feature}
          message={showMiniBubble.message}
          titleOverride={showMiniBubble.titleOverride}
          onDismiss={() => setShowMiniBubble(null)}
        />
      )}

      {/* Main Toast Card */}
      <Card
      ref={cardRef}
      className={`
        fixed z-50 transition-all duration-300
        ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'}
        ${isMinimized 
          ? isMobile 
            ? 'w-14 h-14 rounded-full shadow-lg border-0 bg-card p-0 overflow-visible' 
            : 'w-16 h-16 rounded-full shadow-lg border-0 bg-card p-0 overflow-visible'
          : isMobile 
            ? 'w-[calc(100vw-2rem)] max-w-sm shadow-elegant border-primary/20 bg-card/95 backdrop-blur-sm' 
            : 'w-80 shadow-elegant border-primary/20 bg-card/95 backdrop-blur-sm'
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
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer group"
          onClick={(e) => {
            if (!isDragging) {
              e.stopPropagation();
              setIsMinimized(false);
            }
          }}
        >
          {isCompleted ? (
            <CheckCircle className="h-7 w-7 text-success" />
          ) : (
            <div className="h-7 w-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          )}
          {totalCount > 1 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-md z-10">
              {totalCount}
            </span>
          )}
          
          {/* Desktop hover preview - Jobs list */}
          {!isMobile && allJobs.length > 0 && (
            <div className="absolute right-full mr-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50">
              <Card className="w-64 shadow-elegant border-primary/20 bg-card/95 backdrop-blur-sm">
                <ScrollArea className="max-h-64">
                  <div className="p-2">
                    {allJobs.map((job, index) => {
                      const jobCompleted = 'result' in job;
                      const isSelected = index === selectedJobIndex;
                      return (
                        <div 
                          key={job.id}
                          className={`
                            p-2 rounded-md mb-1 last:mb-0 transition-colors
                            ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'}
                          `}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 mt-0.5">
                              {jobCompleted ? (
                                <CheckCircle className="h-3.5 w-3.5 text-success" />
                              ) : (
                                <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-foreground truncate">
                                {getFeatureDisplayName(job.feature)}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {job.instrument || 'Processing...'}
                              </p>
                              {!jobCompleted && (
                                <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                                  {formatTime(getJobElapsedTime(job))}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          )}
        </div>
      ) : (
        // Expanded view with navigation
        <div className="p-3">
          {/* Navigation header */}
          {allJobs.length > 1 && (
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPreviousJob();
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              
              <span className="text-[10px] text-muted-foreground font-medium">
                Job {selectedJobIndex + 1} / {allJobs.length}
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextJob();
                }}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          
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
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {currentJob && getFeatureDisplayName(currentJob.feature)}
                {currentJob?.instrument && ` - ${currentJob.instrument}`}
              </p>
              
              {/* Timer for active jobs */}
              {!isCompleted && currentJob && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Elapsed time</span>
                    <span className="font-mono">{formatTime(getJobElapsedTime(currentJob))}</span>
                  </div>
                </div>
              )}
              
              {/* Progress message for active jobs */}
              {!isCompleted && currentJob && 'progressMessage' in currentJob && currentJob.progressMessage && (
                <p key={currentJob.progressMessage} className="text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-200 mb-2">
                  {currentJob.progressMessage}
                </p>
              )}
              
              {/* Latest flash notification */}
              {latestFlash && (
                <div className="mb-2 rounded-md border border-primary/20 bg-primary/5 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{latestFlash.title}</p>
                      {latestFlash.description && (
                        <p className="text-[11px] text-muted-foreground truncate">{latestFlash.description}</p>
                      )}
                    </div>
                    <button
                      className="opacity-70 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFlashMessage(latestFlash.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {isCompleted && currentJob && (
                <Button 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToResult(currentJob as any);
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
                  if (currentJob) {
                    markJobAsViewed(currentJob.id);
                    if (allJobs.length > 1 && selectedJobIndex > 0) {
                      setSelectedJobIndex(selectedJobIndex - 1);
                    }
                  }
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
      </Card>
    </>
  );
}