import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, FileText, MessageCircle, Sparkles, Zap, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { TradeSetupBubble } from "./TradeSetupBubble";
import { MacroCommentary } from "./MacroCommentary";
import { ReportsBubble } from "./ReportsBubble";
import { useNavigate } from "react-router-dom";
interface BubbleSystemProps {
  instrument: string;
  timeframe?: string;
  onTradeSetupClick?: () => void;
  onTradeLevelsUpdate?: (levels: any) => void;
}
export function BubbleSystem({
  instrument,
  timeframe,
  onTradeSetupClick,
  onTradeLevelsUpdate
}: BubbleSystemProps) {
  const navigate = useNavigate();
  const [activeBubble, setActiveBubble] = useState<"macro" | "reports" | "tradesetup" | null>(null);

  // Debug logs
  console.log("BubbleSystem rendering with:", {
    instrument,
    timeframe,
    activeBubble
  });
  const bubbles = [{
    id: "tradesetup",
    icon: Zap,
    label: "AI Trade Setup",
    description: "Generate trade ideas & levels",
    color: "bg-primary hover:bg-primary/90",
    glow: "hover:shadow-primary/25"
  }, {
    id: "macro",
    icon: Brain,
    label: "Macro Commentary",
    description: "AI market analysis & insights",
    color: "bg-blue-500 hover:bg-blue-600",
    glow: "hover:shadow-blue-500/25"
  }, {
    id: "reports",
    icon: FileText,
    label: "Reports",
    description: "Generate trading reports",
    color: "bg-green-500 hover:bg-green-600",
    glow: "hover:shadow-green-500/25"
  }] as const;
  const handleBubbleClick = (bubbleId: "macro" | "reports" | "tradesetup") => {
    console.log("🎯 Bubble clicked:", bubbleId, "Current state:", activeBubble);
    setActiveBubble(bubbleId);
    console.log("🔄 State should change to:", bubbleId);
  };
  const handleCloseBubble = () => {
    console.log("🚪 Closing bubble, was:", activeBubble);
    setActiveBubble(null);
  };
  return <>
      {/* Mobile-optimized Floating Access Bubbles */}
      {!activeBubble}

      {/* Mobile-responsive Active Specialized Bubbles */}
      {activeBubble === "tradesetup" && <div className="fixed inset-x-3 top-4 sm:inset-x-auto sm:right-4 sm:top-20 z-[10000] sm:w-auto sm:max-w-md mobile-fade-in safe-top">
          <TradeSetupBubble instrument={instrument} timeframe={timeframe} onClose={handleCloseBubble} onTradeLevelsUpdate={onTradeLevelsUpdate} />
        </div>}
      
      {activeBubble === "macro" && <div className="fixed inset-x-3 bottom-4 top-4 sm:inset-x-auto sm:right-4 sm:top-20 z-[10000] max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-6rem)] mobile-fade-in safe-top safe-bottom">
          <MacroCommentary instrument={instrument} timeframe={timeframe} onClose={handleCloseBubble} />
        </div>}
      
      {activeBubble === "reports" && <div className="fixed inset-x-3 top-4 sm:inset-x-auto sm:right-4 sm:top-20 z-[10000] sm:w-auto sm:max-w-md mobile-fade-in safe-top">
          <ReportsBubble instrument={instrument} timeframe={timeframe} onClose={handleCloseBubble} />
        </div>}
    </>;
}