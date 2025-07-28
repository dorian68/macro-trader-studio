import { useState } from "react";
import { CandlestickChart } from "./CandlestickChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw,
  Eye,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const assets = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", type: "FX" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", type: "FX" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", type: "FX" },
  { symbol: "GOLD", name: "Gold Spot", type: "Commodity" },
  { symbol: "SILVER", name: "Silver Spot", type: "Commodity" },
  { symbol: "CRUDE", name: "Crude Oil WTI", type: "Commodity" },
  { symbol: "BTC", name: "Bitcoin", type: "Crypto" },
  { symbol: "ETH", name: "Ethereum", type: "Crypto" },
];

const mockTechnicalData = {
  "EUR/USD": {
    trend: "Bearish",
    momentum: 35,
    strength: 68,
    volatility: 42,
    signals: [
      { name: "RSI", value: 34, status: "oversold", color: "success" },
      { name: "MACD", value: -0.0015, status: "bearish", color: "danger" },
      { name: "SMA 50", value: 1.0892, status: "below", color: "danger" },
      { name: "SMA 200", value: 1.0945, status: "below", color: "danger" },
    ],
    keyLevels: {
      resistance: ["1.0950", "1.0985", "1.1020"],
      support: ["1.0850", "1.0810", "1.0775"]
    },
    lastUpdate: "2 minutes ago"
  }
};

interface TechnicalIndicator {
  name: string;
  value: number | string;
  status: string;
  color: "success" | "danger" | "warning";
}

interface AssetTechnical {
  trend: string;
  momentum: number;
  strength: number;
  volatility: number;
  signals: TechnicalIndicator[];
  keyLevels: {
    resistance: string[];
    support: string[];
  };
  lastUpdate: string;
}

export function TechnicalAnalysis() {
  const [selectedAsset, setSelectedAsset] = useState("EUR/USD");
  const [isLoading, setIsLoading] = useState(false);
  
  const currentData = mockTechnicalData[selectedAsset as keyof typeof mockTechnicalData] || mockTechnicalData["EUR/USD"];

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case "bullish":
        return <TrendingUp className="h-4 w-4 text-success" />;
      case "bearish":
        return <TrendingDown className="h-4 w-4 text-danger" />;
      default:
        return <Minus className="h-4 w-4 text-warning" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend.toLowerCase()) {
      case "bullish":
        return "text-success";
      case "bearish":
        return "text-danger";
      default:
        return "text-warning";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Technical Analysis</h2>
          <p className="text-muted-foreground mt-1">
            Real-time technical indicators and market signals
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshData}
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Asset Selection */}
      <Card className="gradient-card border-border-light shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Select Asset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {assets.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset.symbol)}
                className={cn(
                  "p-3 rounded-lg border transition-smooth text-left",
                  selectedAsset === asset.symbol
                    ? "bg-primary/10 border-primary/20 text-primary shadow-glow-primary"
                    : "bg-card border-border-light hover:bg-accent/50"
                )}
              >
                <div className="font-medium text-sm">{asset.symbol}</div>
                <div className="text-xs text-muted-foreground">{asset.type}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Technical Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Trend Analysis */}
        <Card className="gradient-card border-border-light shadow-medium">
          <CardHeader>
            <CardTitle className="text-lg">Trend Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current Trend</span>
              <div className="flex items-center gap-2">
                {getTrendIcon(currentData.trend)}
                <span className={cn("font-medium", getTrendColor(currentData.trend))}>
                  {currentData.trend}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Momentum</span>
                  <span>{currentData.momentum}%</span>
                </div>
                <Progress 
                  value={currentData.momentum} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Strength</span>
                  <span>{currentData.strength}%</span>
                </div>
                <Progress 
                  value={currentData.strength} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Volatility</span>
                  <span>{currentData.volatility}%</span>
                </div>
                <Progress 
                  value={currentData.volatility} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Levels */}
        <Card className="gradient-card border-border-light shadow-medium">
          <CardHeader>
            <CardTitle className="text-lg">Key Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-danger mb-2">Resistance Levels</h4>
              <div className="space-y-2">
                {currentData.keyLevels.resistance.map((level, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-danger/5 border border-danger/20 rounded"
                  >
                    <span className="text-sm">R{index + 1}</span>
                    <span className="font-mono text-sm text-danger">{level}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-success mb-2">Support Levels</h4>
              <div className="space-y-2">
                {currentData.keyLevels.support.map((level, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-success/5 border border-success/20 rounded"
                  >
                    <span className="text-sm">S{index + 1}</span>
                    <span className="font-mono text-sm text-success">{level}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Signals */}
        <Card className="gradient-card border-border-light shadow-medium">
          <CardHeader>
            <CardTitle className="text-lg">Technical Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentData.signals.map((signal, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-border-light"
              >
                <div>
                  <div className="font-medium text-sm">{signal.name}</div>
                  <div className="text-xs text-muted-foreground">{signal.status}</div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "font-mono text-sm",
                    signal.color === "success" ? "text-success" :
                    signal.color === "danger" ? "text-danger" : "text-warning"
                  )}>
                    {typeof signal.value === 'number' ? signal.value.toFixed(4) : signal.value}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Live Chart for Selected Asset */}
      <CandlestickChart 
        asset={selectedAsset} 
        title={`Live Chart - ${selectedAsset}`}
        height={350}
      />

      {/* Action Panel */}
      <Card className="gradient-card border-border-light shadow-medium">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div>
                <h4 className="font-medium">Technical Summary for {selectedAsset}</h4>
                <p className="text-sm text-muted-foreground">
                  Last updated: {currentData.lastUpdate}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
                View Chart
              </Button>
              <Button variant="default" size="sm">
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}