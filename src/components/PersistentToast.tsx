import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Minimize2, ChevronLeft, ChevronRight, Maximize2, Eye } from 'lucide-react';
import { usePersistentNotifications } from './PersistentNotificationProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { getFeatureDisplayName } from '@/lib/feature-mapper';
import { MiniProgressBubble } from './MiniProgressBubble';

type ViewMode = 'single' | 'list';

export function PersistentToast() {
  const { activeJobs, completedJobs, flashMessages, removeFlashMessage, markJobAsViewed, navigateToResult } = usePersistentNotifications();
  const isMobile = useIsMobile();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const cardRef = useRef<HTMLDivElement>(null);
  const [showMiniBubble, setShowMiniBubble] = useState<{
    feature: string;
    message: string;
    titleOverride?: string;
  } | null>(null);
  const [jobTimers, setJobTimers] = useState<Record<string, number>>({});

  const totalCount = activeJobs.length + completedJobs.length + flashMessages.length;
  const allJobs = [...activeJobs, ...completedJobs];
  const hasActiveJobs = activeJobs.length > 0;
  const hasCompletedJobs = completedJobs.length > 0;
  
  // Synchronous index clamp — no useEffect lag
  const safeIndex = allJobs.length > 0 
    ? Math.min(selectedJobIndex, allJobs.length - 1) 
    : 0;
  const currentJob = allJobs[safeIndex];
  const isCompleted = currentJob && (
    'resultData' in currentJob || 
    completedJobs.some(j => j.id === currentJob.id)
  );
  const latestFlash = flashMessages.length > 0 ? flashMessages[flashMessages.length - 1] : null;
  
  const goToNextJob = () => { if (allJobs.length > 0) setSelectedJobIndex((prev) => (prev + 1) % allJobs.length); };
  const goToPreviousJob = () => { if (allJobs.length > 0) setSelectedJobIndex((prev) => (prev - 1 + allJobs.length) % allJobs.length); };

  // Individual timers for active jobs
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];
    activeJobs.forEach((job) => {
      const startTime = job.createdAt.getTime();
      const interval = setInterval(() => {
        setJobTimers(prev => ({ ...prev, [job.id]: Date.now() - startTime }));
      }, 1000);
      intervals.push(interval);
    });
    return () => intervals.forEach(clearInterval);
  }, [activeJobs]);

  // Mini bubble when minimized + progress updates
  useEffect(() => {
    if (isMinimized && currentJob && !isCompleted && 'progressMessage' in currentJob && currentJob.progressMessage) {
      setShowMiniBubble({ feature: currentJob.feature || 'unknown', message: currentJob.progressMessage });
    }
  }, [isMinimized, isCompleted, currentJob?.progressMessage]);

  useEffect(() => {
    if (isMinimized && flashMessages.length > 0) {
      const last = flashMessages[flashMessages.length - 1];
      setShowMiniBubble({ feature: 'notification', message: last.description || last.title, titleOverride: last.title });
    }
  }, [isMinimized, flashMessages.length]);
  
  useEffect(() => {
    if (isMinimized && completedJobs.length > 0) {
      const job = completedJobs[completedJobs.length - 1];
      setShowMiniBubble({ feature: job.feature || 'unknown', message: `${getFeatureDisplayName(job.feature)} completed` });
    }
  }, [isMinimized, completedJobs.length]);
  
  const getJobElapsedTime = (job: typeof currentJob) => job ? (jobTimers[job.id] || 0) : 0;
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragOffset({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 0);
      setPosition({
        x: Math.max(0, Math.min(clientX - dragOffset.x, maxX)),
        y: Math.max(0, Math.min(clientY - dragOffset.y, maxY))
      });
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onEnd);
    }
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, dragOffset]);

  // Deterministic guard: no jobs AND no flash → render nothing
  if (allJobs.length === 0 && flashMessages.length === 0) return null;

  // ── Render: Job list item (for list view) ──
  const renderJobListItem = (job: typeof allJobs[0], index: number) => {
    const jobCompleted = 'resultData' in job || completedJobs.some(j => j.id === job.id);
    const isSelected = index === selectedJobIndex;
    
    return (
      <div
        key={job.id}
        className={`
          flex items-center gap-2 p-2 rounded-md transition-colors group/item
          ${isSelected ? 'bg-white/[0.06] ring-1 ring-border' : 'hover:bg-white/[0.06]'}
        `}
      >
        {/* Status icon */}
        <div className="flex-shrink-0">
          {jobCompleted ? (
            <CheckCircle className="h-3.5 w-3.5 text-success" />
          ) : (
            <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedJobIndex(index); setViewMode('single'); }}>
          <p className="text-[11px] font-medium text-foreground truncate">
            {getFeatureDisplayName(job.feature)}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {job.userQuery 
              ? (job.userQuery.length > 35 ? job.userQuery.substring(0, 35) + '...' : job.userQuery)
              : (job.instrument || 'Processing...')}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {jobCompleted ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-primary hover:text-primary bg-white/[0.08] hover:bg-primary/10"
                onClick={(e) => { e.stopPropagation(); navigateToResult(job as any); }}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-70 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); markJobAsViewed(job.id); }}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <span className="text-[9px] text-muted-foreground font-mono tabular-nums">
              {formatTime(getJobElapsedTime(job))}
            </span>
          )}
        </div>
      </div>
    );
  };

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
              ? 'w-14 h-14 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-border/50 bg-card p-0 overflow-visible' 
              : 'w-16 h-16 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-border/50 bg-card p-0 overflow-visible'
            : isMobile 
              ? 'w-[calc(100vw-2rem)] max-w-sm shadow-[0_8px_30px_rgba(0,0,0,0.6)] border-border bg-card/98 backdrop-blur-md' 
              : 'w-80 shadow-[0_8px_30px_rgba(0,0,0,0.6)] border-border bg-card/98 backdrop-blur-md'
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
          // ── Minimized bubble ──
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer group"
            onClick={(e) => {
              if (!isDragging) {
                e.stopPropagation();
                setIsMinimized(false);
              }
            }}
          >
            {!hasActiveJobs && hasCompletedJobs ? (
              <CheckCircle className="h-7 w-7 text-success" />
            ) : (
              <div className="h-7 w-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
            )}
            
            {/* Badge counters */}
            {totalCount > 0 && (
              <div className="absolute -top-1 -right-1 flex gap-0.5 z-10">
                {hasActiveJobs && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-md">
                    {activeJobs.length}
                  </span>
                )}
                {hasCompletedJobs && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-success text-success-foreground text-[10px] font-bold shadow-md">
                    {completedJobs.length}
                  </span>
                )}
              </div>
            )}
            
            {/* Desktop hover preview */}
            {!isMobile && allJobs.length > 0 && (
              <div className="absolute right-full mr-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 pointer-events-auto">
                <Card className="w-64 shadow-[0_8px_30px_rgba(0,0,0,0.6)] border-border bg-card/98 backdrop-blur-md p-2">
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {allJobs.slice(0, 5).map((job) => {
                      const jobCompleted = 'resultData' in job;
                      return (
                        <div 
                          key={job.id}
                          className="p-1.5 rounded-md hover:bg-white/[0.06] cursor-pointer flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (jobCompleted) {
                              navigateToResult(job as any);
                            } else {
                              setIsMinimized(false);
                            }
                          }}
                        >
                          {jobCompleted ? (
                            <CheckCircle className="h-3 w-3 text-success flex-shrink-0" />
                          ) : (
                            <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-medium truncate">{getFeatureDisplayName(job.feature)}</p>
                            <p className="text-[9px] text-muted-foreground truncate">
                              {job.userQuery ? job.userQuery.substring(0, 30) : job.instrument}
                            </p>
                          </div>
                          {jobCompleted && (
                            <span className="text-[9px] text-primary font-medium flex-shrink-0">View</span>
                          )}
                        </div>
                      );
                    })}
                    {allJobs.length > 5 && (
                      <p className="text-[9px] text-muted-foreground text-center py-1">+{allJobs.length - 5} more</p>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>
        ) : (
          // ── Expanded view ──
          <div className="p-3">
            {/* Header with controls */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                {/* Status summary chips */}
                {hasActiveJobs && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                    <div className="h-2 w-2 border border-primary border-t-transparent rounded-full animate-spin" />
                    {activeJobs.length}
                  </span>
                )}
                {hasCompletedJobs && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-medium">
                    <CheckCircle className="h-2.5 w-2.5" />
                    {completedJobs.length}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-0.5">
                {/* Toggle list/single view when multiple jobs */}
                {allJobs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-white/[0.06]"
                    onClick={(e) => { e.stopPropagation(); setViewMode(viewMode === 'list' ? 'single' : 'list'); }}
                    title={viewMode === 'list' ? 'Single view' : 'List view'}
                  >
                    {viewMode === 'list' ? <Maximize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3 rotate-45" />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-white/[0.06]"
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {viewMode === 'list' && allJobs.length > 1 ? (
              // ── LIST VIEW: all jobs at a glance ──
              <div className="space-y-0.5 max-h-52 overflow-y-auto">
                {allJobs.map((job, index) => renderJobListItem(job, index))}
              </div>
            ) : (
              // ── SINGLE VIEW: detailed current job ──
              <>
                {/* Navigation arrows when multiple jobs */}
                {allJobs.length > 1 && (
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/30">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                      onClick={(e) => { e.stopPropagation(); goToPreviousJob(); }}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                      {safeIndex + 1} / {allJobs.length}
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                      onClick={(e) => { e.stopPropagation(); goToNextJob(); }}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                
                {currentJob && (
                  <div className="flex items-start gap-2">
                    {/* Status icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-foreground mb-0.5">
                        {isCompleted ? 'Result Ready' : 'Processing...'}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        {getFeatureDisplayName(currentJob.feature)}
                        {currentJob.userQuery 
                          ? ` — ${currentJob.userQuery.length > 45 ? currentJob.userQuery.substring(0, 45) + '...' : currentJob.userQuery}`
                          : currentJob.instrument && ` — ${currentJob.instrument}`
                        }
                      </p>
                      
                      {/* Timer for active */}
                      {!isCompleted && hasActiveJobs && (
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                          <span>Elapsed</span>
                          <span className="font-mono tabular-nums">{formatTime(getJobElapsedTime(currentJob))}</span>
                        </div>
                      )}
                      
                      {/* Progress message */}
                      {!isCompleted && 'progressMessage' in currentJob && currentJob.progressMessage && hasActiveJobs && (
                        <p key={currentJob.progressMessage} className="text-[11px] text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-200 mb-2">
                          {currentJob.progressMessage}
                        </p>
                      )}
                      
                      {/* Flash notification */}
                      {latestFlash && (
                        <div className="mb-2 rounded-md border border-primary/20 bg-primary/5 p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium truncate">{latestFlash.title}</p>
                              {latestFlash.description && (
                                <p className="text-[10px] text-muted-foreground truncate">{latestFlash.description}</p>
                              )}
                            </div>
                            <button className="opacity-70 hover:opacity-100" onClick={(e) => { e.stopPropagation(); removeFlashMessage(latestFlash.id); }}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-1.5">
                        {isCompleted && (
                          <Button 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); navigateToResult(currentJob as any); }}
                            className="text-[11px] h-7 flex-1 bg-white text-black hover:bg-white/90 font-medium border-0 shadow-none"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Result
                          </Button>
                        )}
                        {!isCompleted && hasCompletedJobs && (
                          <Button 
                            size="sm" variant="outline"
                            onClick={(e) => { e.stopPropagation(); navigateToResult(completedJobs[0]); }}
                            className="text-[11px] h-7 flex-1"
                          >
                            View {completedJobs.length} Completed
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Close current job only */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-white/[0.06] flex-shrink-0 opacity-70 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        markJobAsViewed(currentJob.id);
                        if (allJobs.length > 1 && selectedJobIndex >= allJobs.length - 1) {
                          setSelectedJobIndex(Math.max(0, selectedJobIndex - 1));
                        }
                      }}
                      title="Dismiss this job"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
