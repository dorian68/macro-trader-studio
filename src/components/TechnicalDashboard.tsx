import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  ExternalLink,
  RefreshCw,
  Signal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface TechnicalSignal {
  name: string;
  value: string;
  signal: "BUY" | "SELL" | "NEUTRAL";
  strength: "STRONG" | "WEAK";
}

interface TechnicalIndicator {
  name: string;
  value: number;
  signal: "BUY" | "SELL" | "NEUTRAL";
}

interface AssetInfo {
  symbol: string;
  display: string;
  market: "FX" | "CRYPTO";
  tradingViewSymbol: string;
}

interface TechnicalDashboardProps {
  selectedAsset: AssetInfo;
}

export function TechnicalDashboard({ selectedAsset }: TechnicalDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [indicators, setIndicators] = useState<TechnicalIndicator[]>([]);
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [summary, setSummary] = useState<"BUY" | "SELL" | "NEUTRAL">("NEUTRAL");

  const fetchTechnicalData = async () => {
    setIsLoading(true);
    try {
      // For now, generate mock data since table access is restricted
      generateMockData();
    } catch (error) {
      console.error('Error:', error);
      generateMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const getSignalFromRSI = (rsi: number): "BUY" | "SELL" | "NEUTRAL" => {
    if (rsi < 30) return "BUY";
    if (rsi > 70) return "SELL";
    return "NEUTRAL";
  };

  const getSignalFromADX = (adx: number): "BUY" | "SELL" | "NEUTRAL" => {
    if (adx > 25) return "BUY"; // Strong trend
    return "NEUTRAL";
  };

  const generateSignalsFromIndicators = (indicators: TechnicalIndicator[]) => {
    const newSignals: TechnicalSignal[] = [
      {
        name: "Moving Averages",
        value: "Bullish",
        signal: "BUY",
        strength: "WEAK"
      },
      {
        name: "Technical Indicators", 
        value: indicators[0]?.signal === "BUY" ? "Bullish" : 
               indicators[0]?.signal === "SELL" ? "Bearish" : "Neutral",
        signal: indicators[0]?.signal || "NEUTRAL",
        strength: "WEAK"
      },
      {
        name: "Summary",
        value: "Buy",
        signal: "BUY", 
        strength: "WEAK"
      }
    ];

    setSignals(newSignals);
    
    // Calculate overall summary
    const buyCount = newSignals.filter(s => s.signal === "BUY").length;
    const sellCount = newSignals.filter(s => s.signal === "SELL").length;
    
    if (buyCount > sellCount) setSummary("BUY");
    else if (sellCount > buyCount) setSummary("SELL");
    else setSummary("NEUTRAL");
  };

  const generateMockData = () => {
    const mockIndicators: TechnicalIndicator[] = [
      { name: "RSI(14)", value: 45.7, signal: "NEUTRAL" },
      { name: "ATR(14)", value: 0.0012, signal: "NEUTRAL" },
      { name: "ADX(14)", value: 28.3, signal: "BUY" }
    ];

    const mockSignals: TechnicalSignal[] = [
      { name: "Moving Averages", value: "Bullish", signal: "BUY", strength: "WEAK" },
      { name: "Technical Indicators", value: "Neutral", signal: "NEUTRAL", strength: "WEAK" },
      { name: "Summary", value: "Buy", signal: "BUY", strength: "WEAK" }
    ];

    setIndicators(mockIndicators);
    setSignals(mockSignals);
    setSummary("BUY");
  };

  useEffect(() => {
    fetchTechnicalData();
  }, [selectedAsset.symbol]);

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "BUY": return "text-green-600 bg-green-50 border-green-200";
      case "SELL": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-yellow-600 bg-yellow-50 border-yellow-200";
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case "BUY": return <TrendingUp className="h-4 w-4" />;
      case "SELL": return <TrendingDown className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTradingViewUrl = () => {
    const exchange = selectedAsset.market === "FX" ? "FX" : "BINANCE";
    return `https://www.tradingview.com/symbols/${selectedAsset.tradingViewSymbol}/technicals/?exchange=${exchange}`;
  };

  return (
    <div className="space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Technical Analysis</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTechnicalData}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Card */}
      <Card className={cn("border-2", getSignalColor(summary))}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSignalIcon(summary)}
              <div>
                <p className="font-semibold">Overall Signal</p>
                <p className="text-sm opacity-80">{selectedAsset.display}</p>
              </div>
            </div>
            <Badge variant="outline" className={getSignalColor(summary)}>
              {summary}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Technical Indicators */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Signal className="h-4 w-4" />
            Technical Indicators
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {indicators.map((indicator, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
              <span className="font-medium text-sm">{indicator.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{indicator.value.toFixed(indicator.name.includes("ATR") ? 4 : 1)}</span>
                <Badge variant="outline" className={getSignalColor(indicator.signal)}>
                  {indicator.signal}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Signals Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Signals Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {signals.map((signal, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="font-medium text-sm">{signal.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{signal.strength}</span>
                <Badge variant="outline" className={getSignalColor(signal.signal)}>
                  {signal.value}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* TradingView Link */}
      <Button
        variant="outline"
        onClick={() => window.open(getTradingViewUrl(), '_blank')}
        className="w-full"
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        View Full Analysis on TradingView
      </Button>
    </div>
  );
}