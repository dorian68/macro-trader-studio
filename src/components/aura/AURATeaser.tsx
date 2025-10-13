import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AURATeaser as TeaserType } from '@/lib/auraMessages';

interface AURATeaserProps {
  teaser: TeaserType;
  onCTAClick: (query: string) => void;
  onDismiss: () => void;
  isVisible: boolean;
}

export function AURATeaser({ teaser, onCTAClick, onDismiss, isVisible }: AURATeaserProps) {
  return (
    <div
      className={cn(
        "absolute bottom-20 right-6 max-w-xs transition-all duration-300",
        isVisible ? "animate-fade-in-up opacity-100" : "animate-fade-out-down opacity-0 pointer-events-none"
      )}
    >
      {/* Speech bubble tail */}
      <div className="absolute -bottom-2 right-8 w-4 h-4 bg-card border-r border-b border-border rotate-45 transform origin-center" />
      
      {/* Speech bubble content */}
      <div className="relative bg-card border border-border rounded-2xl shadow-xl p-4 animate-breathing">
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-muted rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
        
        <p className="text-sm mb-3 pr-6 text-foreground">{teaser.text}</p>
        
        <Button
          onClick={() => onCTAClick(teaser.query)}
          size="sm"
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
        >
          {teaser.cta}
        </Button>
      </div>
    </div>
  );
}
