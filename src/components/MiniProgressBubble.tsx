import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { getFeatureDisplayName } from '@/lib/feature-mapper';

interface MiniProgressBubbleProps {
  feature: string;
  message: string;
  onDismiss: () => void;
}

export function MiniProgressBubble({ feature, message, onDismiss }: MiniProgressBubbleProps) {
  useEffect(() => {
    console.log(`💬 [MiniProgressBubble] Showing bubble: ${feature} - ${message}`);
    const timer = setTimeout(() => {
      console.log(`💬 [MiniProgressBubble] Auto-dismissing bubble`);
      onDismiss();
    }, 3500);
    
    return () => clearTimeout(timer);
  }, [onDismiss, feature, message]);
  
  return (
    <div className="fixed bottom-20 right-4 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="w-64 shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm p-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">
              {getFeatureDisplayName(feature)}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {message}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
