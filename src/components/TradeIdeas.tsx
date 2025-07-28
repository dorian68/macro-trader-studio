import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Shield,
  DollarSign,
  BarChart,
  RefreshCw,
  Save,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CandlestickChart } from "./CandlestickChart";

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

const mockTradeIdeas = {
  low: {
    instrument: "EUR/USD",
    direction: "Short",
    setup: "Break below key support level with confirmation",
    entry: "1.0845",
    stopLoss: "1.0895",
    takeProfit: "1.0775",
    riskReward: "1:1.4",
    confidence: 78,
    timeframe: "Short-term",
    reasoning: "Technical breakdown below 1.0850 support, bearish momentum confirmed by RSI divergence and MACD crossover. Fundamental headwinds from ECB dovish stance supporting the move.",
    keyFactors: [
      "Technical breakdown",
      "RSI divergence", 
      "ECB dovish policy",
      "USD strength"
    ]
  },
  medium: {
    instrument: "Gold",
    direction: "Long",
    setup: "Bullish reversal from oversold levels",
    entry: "$1,955",
    stopLoss: "$1,935",
    takeProfit: "$1,995",
    riskReward: "1:2.0",
    confidence: 72,
    timeframe: "Medium-term",
    reasoning: "Gold showing signs of reversal from oversold conditions. Fed pause expectations and geopolitical tensions provide fundamental support. Technical indicators suggest momentum shift.",
    keyFactors: [
      "Oversold bounce",
      "Fed pause expectations",
      "Geopolitical support",
      "Dollar weakness"
    ]
  },
  high: {
    instrument: "Bitcoin",
    direction: "Long", 
    setup: "Breakout above resistance with volume confirmation",
    entry: "$42,500",
    stopLoss: "$40,000",
    takeProfit: "$48,500",
    riskReward: "1:2.4",
    confidence: 65,
    timeframe: "Medium-term",
    reasoning: "BTC breaking above key resistance with strong volume. Institutional adoption narratives and ETF flows providing fundamental support. Risk-on sentiment improving.",
    keyFactors: [
      "Volume breakout",
      "Institutional flows",
      "ETF demand",
      "Risk-on sentiment"
    ]
  }
};

export function TradeIdeas() {
  const [riskLevel, setRiskLevel] = useState("medium");
  const [timeframe, setTimeframe] = useState("short");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIdea, setCurrentIdea] = useState<any>(null);

  const generateTradeIdea = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const idea = mockTradeIdeas[riskLevel as keyof typeof mockTradeIdeas];
      setCurrentIdea(idea);
      setIsGenerating(false);
    }, 1500);
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
          <h2 className="text-3xl font-bold text-foreground">Trade Idea Recommender</h2>
          <p className="text-muted-foreground mt-1">
            Generate AI-powered trade setups with risk management
          </p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          <Target className="h-3 w-3 mr-1" />
          AI Powered
        </Badge>
      </div>

      {/* Live Market View */}
      <CandlestickChart asset="Bitcoin" />

      {/* Configuration Panel */}
      <Card className="gradient-card border-border-light shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Trade Setup Configuration
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
                Generate Trade Idea
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
                  <BarChart className="h-4 w-4 text-warning" />
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