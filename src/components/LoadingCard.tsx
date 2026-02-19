import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Eye, X, Minimize2, Maximize2, Clock, Brain, FileText, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
const {
  useState,
  useEffect
} = React;
interface LoadingRequest {
  id: string;
  type: 'trade_generator' | 'macro_lab' | 'reports';
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
  trade_generator: Zap,
  macro_lab: Brain,
  reports: FileText
};
const REQUEST_LABELS = {
  trade_generator: "Trade Generator",
  macro_lab: "Macro Lab",
  reports: "Reports"
};
const STATUS_COLORS = {
  pending: "text-yellow-600 bg-yellow-50",
  processing: "text-blue-600 bg-blue-50",
  completed: "text-green-600 bg-green-50",
  failed: "text-red-600 bg-red-50"
};
export function LoadingCard({
  request,
  className
}: LoadingCardProps) {
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
        if (request.progress < 30) processingMessages = messages.processing.early;else if (request.progress < 70) processingMessages = messages.processing.mid;else processingMessages = messages.processing.late;
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
    return <Card className={cn("w-72 shadow-lg border-l-4", className, {
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
              <Button variant="ghost" size="sm" onClick={() => setIsMinimized(false)} className="h-6 w-6 p-0">
                <Maximize2 className="h-3 w-3" />
              </Button>
              {request.onRemove && <Button variant="ghost" size="sm" onClick={() => request.onRemove?.(request.id)} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>}
            </div>
          </div>
        </CardContent>
      </Card>;
  }
  const handleCardClick = () => {
    if (request.status === 'completed' && request.onViewResult) {
      request.onViewResult(request.resultData);
    }
  };
  const getCompletionTitle = () => {
    const titles = {
      trade_generator: "Trade Setup Completed",
      macro_lab: "Macro Lab Completed",
      reports: "Report Completed"
    };
    return titles[request.type];
  };
  
  return (
    <Card className={cn(
      "w-72 shadow-lg border-l-4 transition-all",
      className,
      {
        "border-l-yellow-500": request.status === 'pending',
        "border-l-blue-500": request.status === 'processing',
        "border-l-green-500": request.status === 'completed',
        "border-l-red-500": request.status === 'failed'
      }
    )}>
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <IconComponent className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-medium truncate">
                {request.status === 'completed' ? getCompletionTitle() : REQUEST_LABELS[request.type]}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {request.instrument}
              </p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 p-0"
            >
              <Minimize2 className="h-3 w-3" />
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
      </CardHeader>
      
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Status Badge */}
        <Badge className={cn("text-xs", STATUS_COLORS[request.status])}>
          <span className="flex items-center gap-1.5">
            {getStatusIcon()}
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
        </Badge>

        {/* Progress Bar (only for pending/processing) */}
        {(request.status === 'pending' || request.status === 'processing') && (
          <div className="space-y-2">
            <Progress value={request.progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {getProgressMessage()}
            </p>
          </div>
        )}

        {/* Time Info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(timeElapsed)}</span>
          </div>
          {request.estimatedCompletion && request.status === 'processing' && (
            <span>~{Math.ceil((request.estimatedCompletion.getTime() - Date.now()) / 60000)}m left</span>
          )}
        </div>

        {/* View Result Button (only for completed) */}
        {request.status === 'completed' && request.onViewResult && (
          <Button 
            onClick={() => request.onViewResult?.(request.resultData)}
            className="w-full"
            size="sm"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            View Result
          </Button>
        )}

        {/* Error Message (only for failed) */}
        {request.status === 'failed' && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            Analysis failed. Please try again.
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
  return <div className={cn("fixed top-4 right-4 space-y-2 z-50", className)}>
      {requests.map(request => <LoadingCard key={request.id} request={request} className="animate-slide-in-right" />)}
    </div>;
}