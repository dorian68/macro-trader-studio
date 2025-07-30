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
    console.log("Bubble clicked:", bubbleId);
    setActiveBubble(bubbleId);
  };

  const handleCloseBubble = () => {
    setActiveBubble(null);
  };

  return (
    <>
      {/* Floating Access Bubbles */}
      {!activeBubble && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
          {bubbles.map((bubble) => {
            const IconComponent = bubble.icon;
            
            return (
              <div key={bubble.id} className="group relative">
                {/* Tooltip */}
                <div className="absolute right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                  <div className="bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg border text-sm whitespace-nowrap">
                    <div className="font-medium">{bubble.label}</div>
                    <div className="text-xs text-muted-foreground">{bubble.description}</div>
                    {/* Arrow */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-4 border-transparent border-l-popover"></div>
                  </div>
                </div>

                {/* Bubble Button */}
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Button clicked!", bubble.id);
                    handleBubbleClick(bubble.id as "macro" | "reports" | "tradesetup");
                  }}
                  className={cn(
                    "h-14 w-14 rounded-full shadow-xl transition-all duration-300 group-hover:scale-110 cursor-pointer",
                    bubble.color,
                    bubble.glow,
                    "hover:shadow-2xl"
                  )}
                  type="button"
                >
                  <IconComponent className="h-6 w-6 text-white" />
                </Button>

                {/* Pulse animation for engagement */}
                <div className={cn(
                  "absolute inset-0 rounded-full animate-ping opacity-20",
                  bubble.color.split(' ')[0]
                )} />
              </div>
            );
          })}

          {/* System Status Indicator */}
          <div className="flex items-center justify-center">
            <div className="bg-background/95 backdrop-blur-sm border rounded-full px-3 py-1 shadow-lg">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-muted-foreground font-medium">AI Ready</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Specialized Bubbles */}
      {activeBubble === "tradesetup" && (
        <TradeSetupBubble
          instrument={instrument}
          timeframe={timeframe}
          onClose={handleCloseBubble}
        />
      )}
      
      {activeBubble === "macro" && (
        <MacroCommentaryBubble
          instrument={instrument}
          timeframe={timeframe}
          onClose={handleCloseBubble}
        />
      )}
      
      {activeBubble === "reports" && (
        <ReportsBubble
          instrument={instrument}
          timeframe={timeframe}
          onClose={handleCloseBubble}
        />
      )}
    </>
  );
}