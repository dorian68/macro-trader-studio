import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Eye,
  X,
  Minimize2,
  Maximize2,
  Clock,
  Brain,
  FileText,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const { useState, useEffect } = React;

interface LoadingRequest {
  id: string;
  type: 'ai_trade_setup' | 'macro_commentary' | 'reports';
  instrument: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  estimatedCompletion?: Date;
  resultData?: any;
  onViewResult?: (data: any) => void;
  onRemove?: (id: string) => void;
}

interface LoadingCardProps {
  request: LoadingRequest;
  className?: string;
}

const REQUEST_ICONS = {
  ai_trade_setup: Zap,
  macro_commentary: Brain,
  reports: FileText
};

const REQUEST_LABELS = {
  ai_trade_setup: "AI Trade Setup",
  macro_commentary: "Macro Commentary", 
  reports: "Reports"
};

const STATUS_COLORS = {
  pending: "text-yellow-600 bg-yellow-50",
  processing: "text-blue-600 bg-blue-50",
  completed: "text-green-600 bg-green-50",
  failed: "text-red-600 bg-red-50"
};

export function LoadingCard({ request, className }: LoadingCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const IconComponent = REQUEST_ICONS[request.type];

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - request.startTime.getTime()) / 1000);
      setTimeElapsed(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [request.startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressMessage = () => {
    const messages = {
      pending: ['Queued for processing...', 'Preparing analysis...', 'Initializing AI models...'],
      processing: {
        early: ['Generating your scenario...', 'Analyzing market data...', 'Processing market conditions...'],
        mid: ['Processing with AI models...', 'Applying trading algorithms...', 'Evaluating risk factors...'],
        late: ['Generating insights...', 'Finalizing recommendations...', 'Preparing results...']
      },
      completed: 'Analysis completed successfully',
      failed: 'Analysis failed - please try again'
    };

    switch (request.status) {
      case 'pending':
        const pendingIndex = Math.floor(timeElapsed / 3) % messages.pending.length;
        return messages.pending[pendingIndex];
      case 'processing':
        let processingMessages;
        if (request.progress < 30) processingMessages = messages.processing.early;
        else if (request.progress < 70) processingMessages = messages.processing.mid;
        else processingMessages = messages.processing.late;
        
        const processIndex = Math.floor(timeElapsed / 4) % processingMessages.length;
        return processingMessages[processIndex];
      case 'completed':
        return messages.completed;
      case 'failed':
        return messages.failed;
      default:
        return 'Processing...';
    }
  };

  const getStatusIcon = () => {
    switch (request.status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  if (isMinimized) {
    return (
      <Card className={cn("w-72 shadow-lg border-l-4", className, {
        "border-l-yellow-500": request.status === 'pending',
        "border-l-blue-500": request.status === 'processing', 
        "border-l-green-500": request.status === 'completed',
        "border-l-red-500": request.status === 'failed'
      })}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconComponent className="h-4 w-4" />
              <span className="text-sm font-medium">{REQUEST_LABELS[request.type]}</span>
              {getStatusIcon()}
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsMinimized(false)}
                className="h-6 w-6 p-0"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              {request.onRemove && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => request.onRemove?.(request.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCardClick = () => {
    if (request.status === 'completed' && request.onViewResult) {
      request.onViewResult(request.resultData);
    }
  };

  const getCompletionTitle = () => {
    const titles = {
      ai_trade_setup: "Trade Setup Completed",
      macro_commentary: "Macro Commentary Completed",
      reports: "Report Completed"
    };
    return titles[request.type];
  };

  return (
    <Card 
      className={cn("w-80 shadow-lg border-l-4 transition-all duration-200", className, {
        "border-l-yellow-500": request.status === 'pending',
        "border-l-blue-500": request.status === 'processing',
        "border-l-green-500": request.status === 'completed', 
        "border-l-red-500": request.status === 'failed',
        "cursor-pointer hover:shadow-xl hover:scale-[1.02]": request.status === 'completed' && request.onViewResult
      })}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            {request.status === 'completed' ? getCompletionTitle() : REQUEST_LABELS[request.type]}
          </CardTitle>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(true);
              }}
              className="h-6 w-6 p-0"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            {request.onRemove && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  request.onRemove?.(request.id);
                }}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {request.instrument}
          </Badge>
          <Badge className={cn("text-xs", STATUS_COLORS[request.status])}>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              {request.status}
            </div>
          </Badge>
        </div>
        {request.status === 'completed' && request.onViewResult && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Eye className="h-3 w-3" />
            Click to view results
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {(request.status === 'pending' || request.status === 'processing') && (
          <div className="space-y-2">
            <Progress value={request.progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{getProgressMessage()}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Elapsed: {formatTime(timeElapsed)}</span>
              </div>
              {request.estimatedCompletion && (
                <span>ETA: {formatTime(Math.max(0, Math.floor((request.estimatedCompletion.getTime() - Date.now()) / 1000)))}</span>
              )}
            </div>
          </div>
        )}

        {request.status === 'completed' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Analysis completed in {formatTime(timeElapsed)}</span>
            </div>
            <div className="text-sm text-muted-foreground bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 font-medium text-green-700 mb-1">
                <Eye className="h-4 w-4" />
                Ready to view
              </div>
              <p>Your {REQUEST_LABELS[request.type].toLowerCase()} for {request.instrument} is ready. Click anywhere on this card to open the results.</p>
            </div>
          </div>
        )}

        {request.status === 'failed' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4" />
              <span>Analysis failed after {formatTime(timeElapsed)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Global Loading Cards Manager Component
interface LoadingCardsManagerProps {
  requests: LoadingRequest[];
  onRequestUpdate: (id: string, updates: Partial<LoadingRequest>) => void;
  onRequestRemove: (id: string) => void;
  className?: string;
}

export function LoadingCardsManager({ 
  requests, 
  onRequestUpdate, 
  onRequestRemove,
  className 
}: LoadingCardsManagerProps) {
  if (requests.length === 0) return null;

  return (
    <div className={cn("fixed top-4 right-4 space-y-2 z-50", className)}>
      {requests.map((request) => (
        <LoadingCard
          key={request.id}
          request={request}
          className="animate-slide-in-right"
        />
      ))}
    </div>
  );
}