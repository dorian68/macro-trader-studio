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
}

export function BubbleSystem({ instrument, timeframe, onTradeSetupClick }: BubbleSystemProps) {
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
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
          {/* Debug info */}
          <div className="text-xs bg-red-500 text-white p-2 rounded font-mono">
            Active: {activeBubble || "none"}
          </div>
          {bubbles.map((bubble) => {
            const IconComponent = bubble.icon;
            
            return (
              <div key={bubble.id} className="group relative">
                {/* Enhanced Tooltip */}
                <div className="absolute right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none transform group-hover:scale-105">
                  <div className="bg-card/95 backdrop-blur-xl text-card-foreground px-4 py-3 rounded-xl shadow-2xl border border-border/50 text-sm whitespace-nowrap">
                    <div className="font-semibold">{bubble.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{bubble.description}</div>
                    <div className="text-xs text-primary mt-1 font-medium">Click to open widget</div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-8 border-transparent border-l-card/95"></div>
                  </div>
                </div>

                {/* SIMPLIFIED CLICKABLE BUTTON */}
                <button
                  onClick={() => {
                    console.log("🔥 BUBBLE CLICKED:", bubble.id);
                    handleBubbleClick(bubble.id as "macro" | "reports" | "tradesetup");
                  }}
                  className={cn(
                    "h-16 w-16 rounded-full shadow-2xl transition-all duration-300 group-hover:scale-110 cursor-pointer border-2 border-white/20 flex items-center justify-center",
                    bubble.color,
                    bubble.glow,
                    "hover:shadow-3xl hover:border-white/40 relative overflow-hidden"
                  )}
                  type="button"
                >
                  <IconComponent className="h-7 w-7 text-white drop-shadow-lg" />
                  
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </button>

                {/* Enhanced Pulse animation */}
                <div className={cn(
                  "absolute inset-0 rounded-full animate-ping opacity-30 pointer-events-none",
                  bubble.color.split(' ')[0]
                )} />
                
                {/* Secondary pulse */}
                <div className={cn(
                  "absolute inset-0 rounded-full animate-pulse opacity-20 scale-110 pointer-events-none",
                  bubble.color.split(' ')[0]
                )} />
              </div>
            );
          })}

          {/* Enhanced System Status Indicator */}
          <div className="flex items-center justify-center mt-2">
            <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-full px-4 py-2 shadow-xl">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-muted-foreground font-medium">AI Widgets</span>
                <div className="w-1 h-1 bg-primary rounded-full animate-ping" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Specialized Bubbles - 1/3 Page Width Drawers */}
      {/* Debug overlay */}
      {activeBubble && (
        <div className="fixed top-4 right-4 z-[10001] bg-green-500 text-white p-2 rounded text-xs">
          Showing: {activeBubble}
        </div>
      )}
      
      {activeBubble === "tradesetup" && (
        <div className="fixed top-4 right-4 z-[10000] max-w-md w-full">
          <TradeSetupBubble
            instrument={instrument}
            timeframe={timeframe}
            onClose={handleCloseBubble}
          />
        </div>
      )}
      
      {activeBubble === "macro" && (
        <div className="fixed top-4 right-4 z-[10000] max-w-md w-full">
          <MacroCommentaryBubble
            instrument={instrument}
            timeframe={timeframe}
            onClose={handleCloseBubble}
          />
        </div>
      )}
      
      {activeBubble === "reports" && (
        <div className="fixed top-4 right-4 z-[10000] max-w-md w-full">
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