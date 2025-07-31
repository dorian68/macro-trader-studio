import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Zap, Target, Loader2, MessageCircle, Brain, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CandlestickChart } from "./CandlestickChart";
import { BubbleSystem } from "./BubbleSystem";

const assets = ["EUR/USD", "GBP/USD", "USD/JPY", "GOLD", "SILVER", "CRUDE", "BTC", "ETH"];
const timeframes = ["1h", "4h", "1d"];

interface TradeIdea {
  instrument: string;
  direction: "buy" | "sell";
  reasoning: string;
  confidence: number;
  risk_reward: number;
}


export function TradingDashboard() {
  const [selectedAsset, setSelectedAsset] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("4h");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tradeIdea, setTradeIdea] = useState<TradeIdea | null>(null);
  const [tradeLevels, setTradeLevels] = useState<any>(null);
  const [showLevels, setShowLevels] = useState(false);
  const [isGeneratingLevels, setIsGeneratingLevels] = useState(false);

  const generateTradeIdea = () => {
    setIsGenerating(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const directions: ("buy" | "sell")[] = ["buy", "sell"];
      const direction = directions[Math.floor(Math.random() * directions.length)];
      
      const mockIdea: TradeIdea = {
        instrument: selectedAsset,
        direction,
        reasoning: `AI analysis suggests a ${direction} opportunity based on technical indicators and market sentiment for ${selectedAsset}.`,
        confidence: Math.floor(Math.random() * 20) + 70, // 70-90%
        risk_reward: parseFloat((Math.random() * 2 + 1.5).toFixed(1)) // 1.5-3.5
      };
      
      setTradeIdea(mockIdea);
      setIsGenerating(false);
    }, 2000);
  };

  const generateTechnicalLevels = () => {
    setIsGeneratingLevels(true);
    
    // Simulate API call delay
    setTimeout(() => {
      if (!tradeIdea) return;
      
      const basePrice = 1.0900; // Mock current price
      const direction = tradeIdea.direction;
      
      let entry, stopLoss, takeProfit;
      
      if (direction === "buy") {
        entry = basePrice * 0.998;
        stopLoss = entry * 0.985;
        takeProfit = entry * 1.045;
      } else {
        entry = basePrice * 1.002;
        stopLoss = entry * 1.015;
        takeProfit = entry * 0.955;
      }
      
      const riskReward = Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss);
      
      const levels = {
        entry: parseFloat(entry.toFixed(4)),
        stopLoss: parseFloat(stopLoss.toFixed(4)),
        takeProfit: parseFloat(takeProfit.toFixed(4)),
        riskReward: parseFloat(riskReward.toFixed(2)),
        taSummary: "Technical analysis shows strong momentum with key level confirmation.",
        direction
      };
      
      setTradeLevels(levels);
      setShowLevels(true);
      setIsGeneratingLevels(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 relative">
      {/* Header with Market Selection */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trading Dashboard</h1>
          <p className="text-muted-foreground">AI-powered trade analysis and execution with integrated insights</p>
        </div>
        
        {/* Compact Market Selection */}
        <div className="flex gap-3">
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Asset" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((asset) => (
                <SelectItem key={asset} value={asset}>
                  {asset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1H</SelectItem>
              <SelectItem value="4h">4H</SelectItem>
              <SelectItem value="1d">1D</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Layout - Chart Focused */}
      <div className="w-full">
        {/* Live Chart - Full Width */}
        <Card className="h-[700px]">
          <CardHeader>
            <CardTitle className="text-xl">Live Chart - {selectedAsset}</CardTitle>
          </CardHeader>
          <CardContent className="h-full p-0">
            <CandlestickChart 
              asset={selectedAsset} 
              tradeLevels={showLevels ? tradeLevels : undefined}
            />
          </CardContent>
        </Card>
      </div>

      {/* Technical Analysis Section */}
      {showLevels && tradeLevels && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Target className="h-5 w-5" />
              Technical Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Entry</Label>
                <p className="text-2xl font-bold text-blue-600 mt-1">{tradeLevels.entry}</p>
              </div>
              <div className="text-center">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Stop Loss</Label>
                <p className="text-2xl font-bold text-red-600 mt-1">{tradeLevels.stopLoss}</p>
              </div>
              <div className="text-center">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Take Profit</Label>
                <p className="text-2xl font-bold text-green-600 mt-1">{tradeLevels.takeProfit}</p>
              </div>
              <div className="text-center">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Risk/Reward</Label>
                <p className="text-2xl font-bold text-orange-600 mt-1">{tradeLevels.riskReward}</p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-white/70 rounded-lg border">
              <h4 className="font-semibold text-green-800 mb-2">Analysis Summary</h4>
              <p className="text-sm leading-relaxed">{tradeLevels.taSummary}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}