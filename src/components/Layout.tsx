import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { BubbleSystem } from "./BubbleSystem";

interface LayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onModuleChange: (module: string) => void;
}


export function Layout({ children, activeModule, onModuleChange }: LayoutProps) {
  const [selectedAsset, setSelectedAsset] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("4h");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      {/* Simplified Header */}
      <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="h-full px-4 lg:px-6">
          <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
            <button
              onClick={() => onModuleChange("welcome")}
              className="flex items-center gap-3 hover:opacity-90 transition-all duration-200 group"
            >
              <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">directionAI</h1>
                <p className="text-xs text-muted-foreground">AI Trading Assistant</p>
              </div>
            </button>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-card/50 px-3 py-1.5 rounded-full border border-border/50">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                Live Markets
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            {children}
          </div>
        </div>
      </main>

      {/* Global Floating Bubble System */}
      <BubbleSystem 
        instrument={selectedAsset} 
        timeframe={timeframe} 
        onTradeSetupClick={() => onModuleChange("trading")}
      />
    </div>
  );
}