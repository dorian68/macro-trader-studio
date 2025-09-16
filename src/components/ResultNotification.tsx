import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResultNotificationProps {
  show: boolean;
  onDismiss: () => void;
  onViewResult: () => void;
  className?: string;
}

export function ResultNotification({ show, onDismiss, onViewResult, className }: ResultNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      
      // Auto-hide on mobile after 5 seconds unless tapped
      if (isMobile) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, 5000);
        setAutoHideTimer(timer);
      }
    } else {
      setIsVisible(false);
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        setAutoHideTimer(null);
      }
    }

    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
    };
  }, [show, isMobile]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      setAutoHideTimer(null);
    }
    setTimeout(onDismiss, 300); // Allow animation to complete
  };

  const handleViewResult = () => {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      setAutoHideTimer(null);
    }
    onViewResult();
    navigate('/history');
  };

  if (!isVisible) return null;

  // Mobile snackbar style
  if (isMobile) {
    return (
      <div className={cn(
        "fixed top-0 left-0 right-0 z-[100] transform transition-all duration-300 ease-in-out",
        show ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
        className
      )}>
        <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  ✅ Your AI result is ready — tap to view
                </p>
                <p className="text-xs text-primary-foreground/80">
                  Auto-hides in 5s
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 shrink-0 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Tap area to view result */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={handleViewResult}
          onTouchStart={handleViewResult}
        />
      </div>
    );
  }

  // Desktop floating notification
  return (
    <div className={cn(
      "fixed top-16 sm:top-20 right-2 sm:right-4 z-[100] w-[calc(100vw-1rem)] sm:w-80 max-w-[calc(100vw-1rem)]",
      "transform transition-all duration-300 ease-in-out",
      show ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
      className
    )}>
      <Card className="shadow-lg border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  Result Ready
                </Badge>
              </div>
              
              <h4 className="font-medium text-sm mb-1">
                Your AI analysis is complete
              </h4>
              
              <p className="text-xs text-muted-foreground mb-3">
                Click to view your new result in History
              </p>

              <Button
                size="sm"
                onClick={handleViewResult}
                className="h-7 text-xs flex items-center gap-1 w-full sm:w-auto bg-primary hover:bg-primary/90"
              >
                <Eye className="h-3 w-3" />
                <span className="truncate">View Result</span>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 shrink-0 absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}