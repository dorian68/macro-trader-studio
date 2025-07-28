import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw,
  Eye,
  AlertCircle,
  Target,
  Shield,
  DollarSign,
  Clock,
  Save,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CandlestickChart } from "./CandlestickChart";

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

const riskLevels = [
  { value: "low", label: "Low Risk (1-2%)", color: "success" },
  { value: "medium", label: "Medium Risk (2-3%)", color: "warning" },
  { value: "high", label: "High Risk (3-5%)", color: "danger" },
];

const timeframes = [
  { value: "intraday", label: "Intraday (1-4 hours)" },
  { value: "short", label: "Short-term (1-3 days)" },
  { value: "medium", label: "Medium-term (1-2 weeks)" },
  { value: "long", label: "Long-term (1+ months)" },
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
  },
  "BTC": {
    trend: "Bullish",
    momentum: 78,
    strength: 85,
    volatility: 65,
    signals: [
      { name: "RSI", value: 68, status: "bullish", color: "success" },
      { name: "MACD", value: 1250.5, status: "bullish", color: "success" },
      { name: "SMA 50", value: 41200, status: "above", color: "success" },
      { name: "SMA 200", value: 39800, status: "above", color: "success" },
    ],
    keyLevels: {
      resistance: ["43500", "45000", "47500"],
      support: ["41000", "39500", "38000"]
    },
    lastUpdate: "1 minute ago"
  }
};

const mockTradeIdeas = {
  "EUR/USD": {
    instrument: "EUR/USD",
    direction: "Short",
    setup: "Break below key support level with confirmation",
    entry: "1.0845",
    stopLoss: "1.0895",
    takeProfit: "1.0775",
    riskReward: "1:1.4",
    confidence: 78,
    timeframe: "Short-term",
    reasoning: "Technical breakdown below 1.0850 support, bearish momentum confirmed by RSI divergence and MACD crossover.",
    keyFactors: ["Technical breakdown", "RSI divergence", "ECB dovish policy", "USD strength"]
  },
  "BTC": {
    instrument: "Bitcoin",
    direction: "Long", 
    setup: "Breakout above resistance with volume confirmation",
    entry: "$42,500",
    stopLoss: "$40,000",
    takeProfit: "$48,500",
    riskReward: "1:2.4",
    confidence: 85,
    timeframe: "Medium-term",
    reasoning: "BTC breaking above key resistance with strong volume. Institutional adoption and risk-on sentiment improving.",
    keyFactors: ["Volume breakout", "Institutional flows", "ETF demand", "Risk-on sentiment"]
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

export function TradingDashboard() {
  const [selectedAsset, setSelectedAsset] = useState("EUR/USD");
  const [isLoading, setIsLoading] = useState(false);
  const [riskLevel, setRiskLevel] = useState("medium");
  const [timeframe, setTimeframe] = useState("short");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIdea, setCurrentIdea] = useState<any>(null);
  
  const currentData = mockTechnicalData[selectedAsset as keyof typeof mockTechnicalData] || mockTechnicalData["EUR/USD"];

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const generateTradeIdea = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const idea = mockTradeIdeas[selectedAsset as keyof typeof mockTradeIdeas] || mockTradeIdeas["EUR/USD"];
      setCurrentIdea(idea);
      setIsGenerating(false);
    }, 1500);
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

  const getDirectionColor = (direction: string) => {
    return direction.toLowerCase() === "long" ? "text-success" : "text-danger";
  };

  const getDirectionIcon = (direction: string) => {
    return direction.toLowerCase() === "long" ? 
      <TrendingUp className="h-4 w-4" /> : 
      <TrendingDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Trading Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Real-time technical analysis and AI-powered trade recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            <Target className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
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

      {/* Live Chart */}
      <CandlestickChart 
        asset={selectedAsset} 
        title={`Live Chart - ${selectedAsset}`}
        height={400}
      />

      {/* Technical Analysis */}
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

      {/* Trade Idea Generator */}
      <Card className="gradient-card border-border-light shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            AI Trade Idea Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Risk Preference
              </label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger className="bg-background/50 border-border-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {riskLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          level.color === "success" ? "bg-success" :
                          level.color === "warning" ? "bg-warning" : "bg-danger"
                        )} />
                        {level.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Time Horizon
              </label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="bg-background/50 border-border-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeframes.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={generateTradeIdea}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Generating Trade Idea...
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                Generate Trade Idea for {selectedAsset}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Trade Card */}
      {currentIdea && (
        <Card className="gradient-card border-border-light shadow-strong">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  currentIdea.direction.toLowerCase() === "long" 
                    ? "bg-success/10 text-success" 
                    : "bg-danger/10 text-danger"
                )}>
                  {getDirectionIcon(currentIdea.direction)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{currentIdea.instrument}</span>
                    <Badge 
                      variant="secondary"
                      className={cn(
                        currentIdea.direction.toLowerCase() === "long"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-danger/10 text-danger border-danger/20"
                      )}
                    >
                      {currentIdea.direction}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentIdea.setup}
                  </p>
                </div>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-accent/30 rounded-lg p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Entry</span>
                </div>
                <p className="font-mono text-lg font-bold text-foreground">
                  {currentIdea.entry}
                </p>
              </div>

              <div className="bg-accent/30 rounded-lg p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-danger" />
                  <span className="text-xs text-muted-foreground">Stop Loss</span>
                </div>
                <p className="font-mono text-lg font-bold text-danger">
                  {currentIdea.stopLoss}
                </p>
              </div>

              <div className="bg-accent/30 rounded-lg p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-success" />
                  <span className="text-xs text-muted-foreground">Take Profit</span>
                </div>
                <p className="font-mono text-lg font-bold text-success">
                  {currentIdea.takeProfit}
                </p>
              </div>

              <div className="bg-accent/30 rounded-lg p-4 border border-border-light">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-warning" />
                  <span className="text-xs text-muted-foreground">R:R Ratio</span>
                </div>
                <p className="font-mono text-lg font-bold text-warning">
                  {currentIdea.riskReward}
                </p>
              </div>
            </div>

            <Separator className="bg-border-light" />

            {/* Analysis */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">Trade Analysis</h4>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {currentIdea.timeframe}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <Badge variant="outline" className="border-primary/20 text-primary">
                      {currentIdea.confidence}%
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                {currentIdea.reasoning}
              </p>

              <div>
                <h5 className="font-medium text-foreground mb-2">Key Factors</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {currentIdea.keyFactors.map((factor: string, index: number) => (
                    <div 
                      key={index}
                      className="bg-primary/5 border border-primary/20 rounded-lg p-2"
                    >
                      <span className="text-xs text-primary font-medium">
                        {factor}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator className="bg-border-light" />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button variant="default" className="flex-1 min-w-[120px]">
                Execute Trade
              </Button>
              <Button variant="outline" className="flex-1 min-w-[120px]">
                Add to Watchlist
              </Button>
              <Button variant="premium" className="flex-1 min-w-[120px]">
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}