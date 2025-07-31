import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, FileText, MessageCircle, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { TradeSetupBubble } from "./TradeSetupBubble";
import { MacroCommentaryBubble } from "./MacroCommentaryBubble"; 
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
      {/* Floating Access Bubbles - Always visible */}
      {!activeBubble && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-2 sm:gap-3">
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
                  "h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full shadow-lg transition-all duration-300 hover:scale-110 cursor-pointer border-0",
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
              >
                <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white drop-shadow-sm relative z-10" />
                
                {/* Circle bubble shine */}
                <div className="absolute top-3 left-3 w-3 h-3 bg-white/40 rounded-full blur-sm" />
                <div className="absolute top-2 left-2 w-2 h-2 bg-white/60 rounded-full" />
              </button>
            );
          })}

          {/* Enhanced System Status Indicator */}
          <div className="flex items-center justify-center mt-2">
            <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-full px-2 sm:px-4 py-1 sm:py-2 shadow-xl">
              <div className="flex items-center gap-1 sm:gap-2 text-xs">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-muted-foreground font-medium hidden sm:inline">AI Widgets</span>
                <span className="text-muted-foreground font-medium sm:hidden">AI</span>
                <div className="w-1 h-1 bg-primary rounded-full animate-ping" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Specialized Bubbles */}
      {activeBubble === "tradesetup" && (
        <div className="fixed top-4 right-4 z-[10000] w-[calc(100vw-2rem)] sm:w-auto sm:max-w-md">
          <TradeSetupBubble
            instrument={instrument}
            timeframe={timeframe}
            onClose={handleCloseBubble}
            onTradeLevelsUpdate={onTradeLevelsUpdate}
          />
        </div>
      )}
      
      {activeBubble === "macro" && (
        <div className="fixed top-4 right-4 z-[10000] w-[calc(100vw-2rem)] sm:w-auto sm:max-w-md">
          <MacroCommentaryBubble
            instrument={instrument}
            timeframe={timeframe}
            onClose={handleCloseBubble}
          />
        </div>
      )}
      
      {activeBubble === "reports" && (
        <div className="fixed top-4 right-4 z-[10000] w-[calc(100vw-2rem)] sm:w-auto sm:max-w-md">
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