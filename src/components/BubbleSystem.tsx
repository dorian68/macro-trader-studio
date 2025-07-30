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

                {/* BUBBLE STYLE BUTTON */}
                <button
                  onClick={() => {
                    console.log("🔥 BUBBLE CLICKED:", bubble.id);
                    handleBubbleClick(bubble.id as "macro" | "reports" | "tradesetup");
                  }}
                  className={cn(
                    "h-14 w-14 rounded-full shadow-lg transition-all duration-300 group-hover:scale-110 cursor-pointer border-0",
                    "flex items-center justify-center relative overflow-hidden",
                    "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:opacity-90",
                    bubble.color,
                    bubble.glow,
                    "hover:shadow-xl transform hover:-translate-y-1"
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${bubble.color.includes('primary') ? 'hsl(var(--primary))' : bubble.color.includes('blue') ? '#3b82f6' : '#10b981'}, ${bubble.color.includes('primary') ? 'hsl(var(--primary-glow))' : bubble.color.includes('blue') ? '#60a5fa' : '#34d399'})`
                  }}
                  type="button"
                >
                  <IconComponent className="h-6 w-6 text-white drop-shadow-sm relative z-10" />
                  
                  {/* Bubble shine effect */}
                  <div className="absolute top-2 left-2 w-3 h-3 bg-white/30 rounded-full blur-sm" />
                  <div className="absolute top-1 left-1 w-2 h-2 bg-white/50 rounded-full" />
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

      {/* Active Specialized Bubbles */}
      
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