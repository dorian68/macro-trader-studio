import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface FlashMessageData {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  autoRemove?: boolean;
  duration?: number;
}

interface FlashMessageProps {
  message: FlashMessageData;
  onRemove: (id: string) => void;
  index: number;
}

export function FlashMessage({ message, onRemove, index }: FlashMessageProps) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (message.autoRemove !== false) {
      const duration = message.duration || 4000;
      const timer = setTimeout(() => {
        onRemove(message.id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, onRemove]);

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getTypeStyles = () => {
    switch (message.type) {
      case 'success':
        return 'border-success/20 bg-success/5';
      case 'error':
        return 'border-destructive/20 bg-destructive/5';
      default:
        return 'border-primary/20 bg-primary/5';
    }
  };

  return (
    <Card 
      className={`
        fixed z-[60] shadow-lg border backdrop-blur-sm
        ${getTypeStyles()}
        ${isMobile 
          ? 'top-4 left-4 right-4 mx-auto max-w-sm' 
          : 'top-4 right-6 w-80'
        }
        animate-in slide-in-from-top-2 duration-300
      `}
      style={{
        top: isMobile ? `${16 + index * 60}px` : `${16 + index * 60}px`
      }}
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground">
              {message.title}
            </h4>
            {message.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {message.description}
              </p>
            )}
          </div>

          <button
            onClick={() => onRemove(message.id)}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Card>
  );
}