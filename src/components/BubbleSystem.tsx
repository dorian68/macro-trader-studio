import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, FileText, MessageCircle, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { TradeSetupBubble } from "./TradeSetupBubble";
import { MacroCommentary } from "./MacroCommentary"; 
import { ReportsBubble } from "./ReportsBubble";

interface BubbleSystemProps {
  instrument: string;
  timeframe?: string;
  onTradeSetupClick?: () => void;
  onTradeLevelsUpdate?: (levels: any) => void;
}

export function BubbleSystem({ instrument, timeframe, onTradeSetupClick, onTradeLevelsUpdate }: BubbleSystemProps) {
  const [activeBubble, setActiveBubble] = useState<"macro" | "reports" | "tradesetup" | null>(null);
  
  // Debug logs
  console.log("BubbleSystem rendering with:", { instrument, timeframe, activeBubble });

  const bubbles = [
    {
      id: "tradesetup",
      icon: Zap,
      label: "AI Trade Setup",
      description: "Generate trade ideas & levels",
      color: "bg-primary hover:bg-primary/90",
      glow: "hover:shadow-primary/25"
    },
    {
      id: "macro",
      icon: Brain,
      label: "Macro Commentary",
      description: "AI market analysis & insights",
      color: "bg-blue-500 hover:bg-blue-600",
      glow: "hover:shadow-blue-500/25"
    },
    {
      id: "reports",
      icon: FileText,
      label: "Reports", 
      description: "Generate trading reports",
      color: "bg-green-500 hover:bg-green-600",
      glow: "hover:shadow-green-500/25"
    }
  ] as const;

  const handleBubbleClick = (bubbleId: "macro" | "reports" | "tradesetup") => {
    console.log("🎯 Bubble clicked:", bubbleId, "Current state:", activeBubble);
    setActiveBubble(bubbleId);
    console.log("🔄 State should change to:", bubbleId);
  };

  const handleCloseBubble = () => {
    console.log("🚪 Closing bubble, was:", activeBubble);
    setActiveBubble(null);
  };

  return (
    <>
      {/* Mobile-optimized Floating Access Bubbles */}
      {!activeBubble && (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3">
          {bubbles.map((bubble) => {
            const IconComponent = bubble.icon;
            
            return (
              <button
                key={bubble.id}
                onClick={() => {
                  console.log("🔥 BUBBLE CLICKED:", bubble.id);
                  handleBubbleClick(bubble.id as "macro" | "reports" | "tradesetup");
                }}
                className={cn(
                  "h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer border-0",
                  "flex items-center justify-center relative overflow-hidden",
                  bubble.color,
                  bubble.glow,
                  "hover:shadow-xl transform hover:-translate-y-1"
                )}
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${bubble.color.includes('primary') ? 'hsl(var(--primary-glow))' : bubble.color.includes('blue') ? '#60a5fa' : '#34d399'}, ${bubble.color.includes('primary') ? 'hsl(var(--primary))' : bubble.color.includes('blue') ? '#3b82f6' : '#10b981'})`
                }}
                type="button"
                title={bubble.label}
                aria-label={bubble.label}
              >
                <IconComponent className="h-5 w-5 text-white drop-shadow-sm relative z-10" />
                
                {/* Circle bubble shine effect */}
                <div className="absolute top-3 left-3 w-3 h-3 bg-white/40 rounded-full blur-sm" />
                <div className="absolute top-2 left-2 w-2 h-2 bg-white/60 rounded-full" />
              </button>
            );
          })}

          {/* Mobile-optimized System Status Indicator */}
          <div className="flex items-center justify-center mt-2">
            <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-full px-3 py-1.5 shadow-xl">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-muted-foreground font-medium">AI</span>
                <div className="w-1 h-1 bg-primary rounded-full animate-ping" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-responsive Active Specialized Bubbles */}
      {activeBubble === "tradesetup" && (
        <div className="fixed inset-x-4 top-4 sm:inset-x-auto sm:right-4 z-[10000] sm:w-auto sm:max-w-md">
          <TradeSetupBubble
            instrument={instrument}
            timeframe={timeframe}
            onClose={handleCloseBubble}
            onTradeLevelsUpdate={onTradeLevelsUpdate}
          />
        </div>
      )}
      
      {activeBubble === "macro" && (
        <div className="fixed bottom-20 right-4 z-[10000] w-80 max-h-[calc(100vh-8rem)]">
          <MacroCommentary
            instrument={instrument}
            timeframe={timeframe}
            onClose={handleCloseBubble}
          />
        </div>
      )}
      
      {activeBubble === "reports" && (
        <div className="fixed inset-x-4 top-4 sm:inset-x-auto sm:right-4 z-[10000] sm:w-auto sm:max-w-md">
          <ReportsBubble
            instrument={instrument}
            timeframe={timeframe}
            onClose={handleCloseBubble}
          />
        </div>
      )}
    </>
  );
}