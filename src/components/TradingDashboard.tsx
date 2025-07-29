import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { BarChart3, TrendingUp, TrendingDown, Minus, RefreshCw, Eye, AlertCircle, Target, Shield, DollarSign, Clock, Save, Share2, Brain, PieChart, Calculator, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { CandlestickChart } from "./CandlestickChart";
const assets = [{
  symbol: "EUR/USD",
  name: "Euro / US Dollar",
  type: "FX"
}, {
  symbol: "GBP/USD",
  name: "British Pound / US Dollar",
  type: "FX"
}, {
  symbol: "USD/JPY",
  name: "US Dollar / Japanese Yen",
  type: "FX"
}, {
  symbol: "GOLD",
  name: "Gold Spot",
  type: "Commodity"
}, {
  symbol: "SILVER",
  name: "Silver Spot",
  type: "Commodity"
}, {
  symbol: "CRUDE",
  name: "Crude Oil WTI",
  type: "Commodity"
}, {
  symbol: "BTC",
  name: "Bitcoin",
  type: "Crypto"
}, {
  symbol: "ETH",
  name: "Ethereum",
  type: "Crypto"
}];
const riskLevels = [{
  value: "low",
  label: "Low Risk (1-2%)",
  color: "success"
}, {
  value: "medium",
  label: "Medium Risk (2-3%)",
  color: "warning"
}, {
  value: "high",
  label: "High Risk (3-5%)",
  color: "danger"
}];
const timeframes = [{
  value: "intraday",
  label: "Intraday (1-4 hours)"
}, {
  value: "short",
  label: "Short-term (1-3 days)"
}, {
  value: "medium",
  label: "Medium-term (1-2 weeks)"
}, {
  value: "long",
  label: "Long-term (1+ months)"
}];

const tradeSizes = [{
  value: "small",
  label: "Small ($1K - $5K)",
  multiplier: 0.5
}, {
  value: "medium", 
  label: "Medium ($5K - $25K)",
  multiplier: 1
}, {
  value: "large",
  label: "Large ($25K+)",
  multiplier: 2
}, {
  value: "custom",
  label: "Custom Amount",
  multiplier: 1
}];
const mockTechnicalData = {
  "EUR/USD": {
    trend: "Bearish",
    momentum: 35,
    strength: 68,
    volatility: 42,
    signals: [{
      name: "RSI",
      value: 34,
      status: "oversold",
      color: "success"
    }, {
      name: "MACD",
      value: -0.0015,
      status: "bearish",
      color: "danger"
    }, {
      name: "SMA 50",
      value: 1.0892,
      status: "below",
      color: "danger"
    }, {
      name: "SMA 200",
      value: 1.0945,
      status: "below",
      color: "danger"
    }],
    keyLevels: {
      resistance: ["1.0950", "1.0985", "1.1020"],
      support: ["1.0850", "1.0810", "1.0775"]
    },
    lastUpdate: "2 minutes ago"
  },
  "GBP/USD": {
    trend: "Bearish",
    momentum: 28,
    strength: 62,
    volatility: 58,
    signals: [{
      name: "RSI",
      value: 31,
      status: "oversold",
      color: "success"
    }, {
      name: "MACD",
      value: -0.0022,
      status: "bearish",
      color: "danger"
    }, {
      name: "SMA 50",
      value: 1.2654,
      status: "below",
      color: "danger"
    }, {
      name: "SMA 200",
      value: 1.2789,
      status: "below",
      color: "danger"
    }],
    keyLevels: {
      resistance: ["1.2650", "1.2700", "1.2780"],
      support: ["1.2580", "1.2520", "1.2450"]
    },
    lastUpdate: "3 minutes ago"
  },
  "USD/JPY": {
    trend: "Bullish",
    momentum: 72,
    strength: 81,
    volatility: 45,
    signals: [{
      name: "RSI",
      value: 68,
      status: "bullish",
      color: "success"
    }, {
      name: "MACD",
      value: 0.85,
      status: "bullish",
      color: "success"
    }, {
      name: "SMA 50",
      value: 148.25,
      status: "above",
      color: "success"
    }, {
      name: "SMA 200",
      value: 146.80,
      status: "above",
      color: "success"
    }],
    keyLevels: {
      resistance: ["150.50", "152.00", "154.25"],
      support: ["148.00", "146.50", "144.80"]
    },
    lastUpdate: "1 minute ago"
  },
  "GOLD": {
    trend: "Bullish",
    momentum: 65,
    strength: 74,
    volatility: 38,
    signals: [{
      name: "RSI",
      value: 62,
      status: "bullish",
      color: "success"
    }, {
      name: "MACD",
      value: 12.5,
      status: "bullish",
      color: "success"
    }, {
      name: "SMA 50",
      value: 2045.20,
      status: "above",
      color: "success"
    }, {
      name: "SMA 200",
      value: 2015.80,
      status: "above",
      color: "success"
    }],
    keyLevels: {
      resistance: ["2080.00", "2095.00", "2110.00"],
      support: ["2045.00", "2025.00", "2000.00"]
    },
    lastUpdate: "2 minutes ago"
  },
  "SILVER": {
    trend: "Bullish",
    momentum: 58,
    strength: 69,
    volatility: 52,
    signals: [{
      name: "RSI",
      value: 59,
      status: "neutral",
      color: "warning"
    }, {
      name: "MACD",
      value: 0.35,
      status: "bullish",
      color: "success"
    }, {
      name: "SMA 50",
      value: 25.45,
      status: "above",
      color: "success"
    }, {
      name: "SMA 200",
      value: 24.80,
      status: "above",
      color: "success"
    }],
    keyLevels: {
      resistance: ["26.50", "27.20", "28.00"],
      support: ["25.20", "24.60", "23.80"]
    },
    lastUpdate: "4 minutes ago"
  },
  "CRUDE": {
    trend: "Neutral",
    momentum: 45,
    strength: 56,
    volatility: 48,
    signals: [{
      name: "RSI",
      value: 48,
      status: "neutral",
      color: "warning"
    }, {
      name: "MACD",
      value: -0.25,
      status: "bearish",
      color: "danger"
    }, {
      name: "SMA 50",
      value: 78.50,
      status: "below",
      color: "danger"
    }, {
      name: "SMA 200",
      value: 82.20,
      status: "below",
      color: "danger"
    }],
    keyLevels: {
      resistance: ["82.00", "85.50", "88.00"],
      support: ["75.00", "72.50", "69.80"]
    },
    lastUpdate: "5 minutes ago"
  },
  "BTC": {
    trend: "Bullish",
    momentum: 78,
    strength: 85,
    volatility: 65,
    signals: [{
      name: "RSI",
      value: 68,
      status: "bullish",
      color: "success"
    }, {
      name: "MACD",
      value: 1250.5,
      status: "bullish",
      color: "success"
    }, {
      name: "SMA 50",
      value: 41200,
      status: "above",
      color: "success"
    }, {
      name: "SMA 200",
      value: 39800,
      status: "above",
      color: "success"
    }],
    keyLevels: {
      resistance: ["45000", "47500", "50000"],
      support: ["41000", "39500", "37000"]
    },
    lastUpdate: "1 minute ago"
  },
  "ETH": {
    trend: "Bullish",
    momentum: 73,
    strength: 79,
    volatility: 71,
    signals: [{
      name: "RSI",
      value: 64,
      status: "bullish",
      color: "success"
    }, {
      name: "MACD",
      value: 85.2,
      status: "bullish",
      color: "success"
    }, {
      name: "SMA 50",
      value: 2580,
      status: "above",
      color: "success"
    }, {
      name: "SMA 200",
      value: 2420,
      status: "above",
      color: "success"
    }],
    keyLevels: {
      resistance: ["2750", "2900", "3100"],
      support: ["2500", "2350", "2200"]
    },
    lastUpdate: "2 minutes ago"
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
    duration: "3-5 days",
    expectedReturn: 6.4,
    confidenceInterval: { min: 2.1, max: 8.9 },
    successProbability: 72,
    reasoning: "🔎 Strategy Rationale:\nBased on ECB dovish pivot and strong DXY momentum, this EUR/USD short setup aligns with macro divergence signals. Technical breakdown below 1.0850 support confirms bearish momentum with RSI divergence pattern. The AI estimates a 72% probability of successful 6.4% move within 3-5 trading days.",
    macroFactors: "ECB dovish policy stance vs Fed hawkish outlook creating yield differential pressure on EUR. Economic data divergence supporting USD strength.",
    technicalTrigger: "Clean break below 1.0850 support with volume confirmation. RSI bearish divergence and MACD negative crossover.",
    riskAssessment: "Main risk: ECB surprise hawkish pivot or major USD weakness from geopolitical events. Low correlation with other positions.",
    alternativesTrade: "Considered GBP/USD short but Brexit uncertainty adds noise. USD/CHF long rejected due to SNB intervention risk.",
    keyFactors: ["Technical breakdown", "RSI divergence", "ECB dovish policy", "USD strength"],
    performance: {
      estimatedPnL: 640,
      roi: 6.4,
      duration: "3-5 days",
      riskAmount: 500
    }
  },
  "GBP/USD": {
    instrument: "GBP/USD",
    direction: "Short",
    setup: "Brexit uncertainty driving continued weakness",
    entry: "1.2590",
    stopLoss: "1.2650",
    takeProfit: "1.2480",
    riskReward: "1:1.8",
    confidence: 74,
    timeframe: "Medium-term",
    duration: "5-8 days",
    expectedReturn: 8.7,
    confidenceInterval: { min: 4.2, max: 12.1 },
    successProbability: 69,
    reasoning: "🔎 Strategy Rationale:\nBrexit uncertainty combined with BoE dovish stance creates persistent GBP weakness. Technical breakdown confirmed with volume selling. The AI estimates 69% probability of 8.7% downside within 5-8 trading days.",
    macroFactors: "Brexit trade negotiations stalling, BoE dovish pivot, UK inflation concerns creating Sterling weakness vs USD strength.",
    technicalTrigger: "Break below 1.2600 support level with RSI oversold bounce failure. Volume confirmation on selling pressure.",
    riskAssessment: "Main risk: Surprise Brexit breakthrough or BoE hawkish pivot. Correlation with EUR/USD moderate.",
    alternativesTrade: "EUR/GBP long considered but cross-currency volatility too high. GBP/JPY short rejected due to BoJ intervention risk.",
    keyFactors: ["Brexit uncertainty", "BoE dovish stance", "Technical breakdown", "USD strength"],
    performance: {
      estimatedPnL: 870,
      roi: 8.7,
      duration: "5-8 days",
      riskAmount: 600
    }
  },
  "USD/JPY": {
    instrument: "USD/JPY",
    direction: "Long",
    setup: "BoJ intervention fears vs Fed hawkishness",
    entry: "149.20",
    stopLoss: "147.80",
    takeProfit: "152.50",
    riskReward: "1:2.4",
    confidence: 82,
    timeframe: "Short-term",
    duration: "2-4 days",
    expectedReturn: 10.3,
    confidenceInterval: { min: 6.8, max: 14.2 },
    successProbability: 78,
    reasoning: "🔎 Strategy Rationale:\nFed-BoJ policy divergence at extreme levels with USD strength momentum intact. Despite intervention risks, technical momentum favors continued upside. The AI estimates 78% probability of 10.3% upside within 2-4 trading days.",
    macroFactors: "Fed maintaining hawkish stance vs BoJ ultra-dovish policy. US-Japan yield differentials supporting USD/JPY strength despite intervention threats.",
    technicalTrigger: "Breakout above 149 resistance with momentum confirmation. Volume supporting upside move despite intervention concerns.",
    riskAssessment: "Main risk: Surprise BoJ intervention above 150 level. Geopolitical tensions could trigger safe-haven JPY demand.",
    alternativesTrade: "USD/CHF long considered but SNB intervention risk higher. EUR/JPY long rejected due to EUR weakness.",
    keyFactors: ["Fed-BoJ divergence", "Yield differentials", "Technical momentum", "Intervention resistance"],
    performance: {
      estimatedPnL: 1030,
      roi: 10.3,
      duration: "2-4 days",
      riskAmount: 700
    }
  },
  "GOLD": {
    instrument: "Gold",
    direction: "Long",
    setup: "Safe-haven demand amid global uncertainty",
    entry: "$2,065",
    stopLoss: "$2,040",
    takeProfit: "$2,110",
    riskReward: "1:1.8",
    confidence: 79,
    timeframe: "Medium-term",
    duration: "7-10 days",
    expectedReturn: 7.8,
    confidenceInterval: { min: 4.5, max: 11.2 },
    successProbability: 75,
    reasoning: "🔎 Strategy Rationale:\nGeopolitical tensions and inflation concerns supporting gold's safe-haven appeal. Technical breakout above key resistance with institutional buying. The AI estimates 75% probability of 7.8% upside within 7-10 trading days.",
    macroFactors: "Global uncertainty driving safe-haven demand. Central bank gold purchases accelerating. Dollar weakness expectations supporting precious metals.",
    technicalTrigger: "Breakout above $2060 resistance with volume confirmation. RSI momentum supporting continued upside move.",
    riskAssessment: "Main risk: Strong USD rally or aggressive Fed tightening. Risk-on sentiment could reduce safe-haven demand.",
    alternativesTrade: "Silver long considered but higher volatility. Platinum rejected due to industrial demand concerns.",
    keyFactors: ["Safe-haven demand", "Central bank buying", "Technical breakout", "Inflation hedge"],
    performance: {
      estimatedPnL: 780,
      roi: 7.8,
      duration: "7-10 days",
      riskAmount: 250
    }
  },
  "SILVER": {
    instrument: "Silver",
    direction: "Long",
    setup: "Industrial demand recovery with precious metals momentum",
    entry: "$25.80",
    stopLoss: "$25.20",
    takeProfit: "$27.40",
    riskReward: "1:2.7",
    confidence: 76,
    timeframe: "Medium-term",
    duration: "8-12 days",
    expectedReturn: 12.4,
    confidenceInterval: { min: 7.8, max: 16.9 },
    successProbability: 71,
    reasoning: "🔎 Strategy Rationale:\nSilver benefiting from dual demand - industrial recovery and precious metals safe-haven flow. Technical momentum accelerating with gold strength. The AI estimates 71% probability of 12.4% upside within 8-12 trading days.",
    macroFactors: "Industrial demand recovery supporting silver. Green energy transition increasing industrial silver consumption. Precious metals complex strength.",
    technicalTrigger: "Breakout above $25.50 resistance with volume expansion. RSI momentum supporting continued rally.",
    riskAssessment: "Main risk: Industrial demand slowdown or strong USD rally. Higher volatility than gold increases risk.",
    alternativesTrade: "Gold long considered but silver offers better risk-reward. Copper rejected due to China demand concerns.",
    keyFactors: ["Industrial demand", "Green energy transition", "Precious metals strength", "Technical momentum"],
    performance: {
      estimatedPnL: 1240,
      roi: 12.4,
      duration: "8-12 days",
      riskAmount: 600
    }
  },
  "CRUDE": {
    instrument: "Crude Oil",
    direction: "Short",
    setup: "Supply concerns easing with demand uncertainty",
    entry: "$78.50",
    stopLoss: "$82.00",
    takeProfit: "$72.80",
    riskReward: "1:1.6",
    confidence: 68,
    timeframe: "Short-term",
    duration: "4-7 days",
    expectedReturn: 7.3,
    confidenceInterval: { min: 3.1, max: 11.8 },
    successProbability: 64,
    reasoning: "🔎 Strategy Rationale:\nOPEC+ production increases and China demand concerns weighing on crude. Technical breakdown below key support confirms bearish momentum. The AI estimates 64% probability of 7.3% downside within 4-7 trading days.",
    macroFactors: "OPEC+ increasing production quotas. China economic slowdown reducing demand outlook. SPR releases adding supply pressure.",
    technicalTrigger: "Break below $78 support with volume confirmation. RSI breakdown supporting continued selling pressure.",
    riskAssessment: "Main risk: Geopolitical supply disruption or surprise OPEC+ cuts. Winter demand could provide support.",
    alternativesTrade: "Natural gas short considered but higher volatility. Heating oil rejected due to seasonal demand factors.",
    keyFactors: ["OPEC+ production", "China demand concerns", "Technical breakdown", "Supply increase"],
    performance: {
      estimatedPnL: 730,
      roi: 7.3,
      duration: "4-7 days",
      riskAmount: 450
    }
  },
  "BTC": {
    instrument: "Bitcoin",
    direction: "Long", 
    setup: "Institutional adoption driving renewed momentum",
    entry: "$42,500",
    stopLoss: "$40,000",
    takeProfit: "$48,500",
    riskReward: "1:2.4",
    confidence: 85,
    timeframe: "Medium-term",
    duration: "7-12 days",
    expectedReturn: 14.1,
    confidenceInterval: { min: 8.2, max: 18.7 },
    successProbability: 81,
    reasoning: "🔎 Strategy Rationale:\nInstitutional accumulation patterns and ETF inflow momentum suggest strong bullish continuation. On-chain metrics showing reduced selling pressure while whale accumulation accelerates. The AI estimates 81% probability of 14.1% upside within 7-12 days based on historical breakout patterns.",
    macroFactors: "Risk-on sentiment improving with Fed pivot expectations. Institutional crypto adoption accelerating through ETF channels.",
    technicalTrigger: "Volume breakout above $42K resistance with RSI momentum divergence. Order flow showing institutional accumulation patterns.",
    riskAssessment: "Main risk: Macro sentiment reversal or regulatory headwinds. Correlation with tech stocks moderate but manageable.",
    alternativesTrade: "ETH long considered but BTC shows stronger momentum. SOL rejected due to higher beta and regulatory uncertainty.",
    keyFactors: ["Institutional adoption", "ETF inflows", "Technical breakout", "Risk-on sentiment"],
    performance: {
      estimatedPnL: 1410,
      roi: 14.1,
      duration: "7-12 days",
      riskAmount: 1000
    }
  },
  "ETH": {
    instrument: "Ethereum",
    direction: "Long",
    setup: "DeFi revival and institutional interest",
    entry: "$2,650",
    stopLoss: "$2,500",
    takeProfit: "$2,950",
    riskReward: "1:2.0",
    confidence: 81,
    timeframe: "Medium-term",
    duration: "6-10 days",
    expectedReturn: 11.3,
    confidenceInterval: { min: 6.9, max: 15.8 },
    successProbability: 77,
    reasoning: "🔎 Strategy Rationale:\nEthereum ecosystem growth with DeFi revival and staking yields attracting institutional interest. Technical momentum following Bitcoin strength with ETH-specific catalysts. The AI estimates 77% probability of 11.3% upside within 6-10 trading days.",
    macroFactors: "DeFi total value locked increasing. Ethereum staking yields attracting institutional capital. Layer 2 scaling solutions gaining adoption.",
    technicalTrigger: "Breakout above $2600 resistance with volume confirmation. ETH/BTC ratio showing relative strength.",
    riskAssessment: "Main risk: Crypto regulatory concerns or broader risk-off sentiment. Higher volatility than BTC increases position risk.",
    alternativesTrade: "BTC long considered but ETH offers better technical setup. SOL rejected due to regulatory uncertainty.",
    keyFactors: ["DeFi revival", "Staking yields", "Technical breakout", "Institutional interest"],
    performance: {
      estimatedPnL: 1130,
      roi: 11.3,
      duration: "6-10 days",
      riskAmount: 800
    }
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
  const [tradeSize, setTradeSize] = useState("medium");
  const [customAmount, setCustomAmount] = useState(10000);
  const [confidenceThreshold, setConfidenceThreshold] = useState([70]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIdea, setCurrentIdea] = useState<any>(null);
  const [showRationale, setShowRationale] = useState(false);
  const [tradeLevels, setTradeLevels] = useState<any>(null);
  const [showLevels, setShowLevels] = useState(false);
  const [isGeneratingLevels, setIsGeneratingLevels] = useState(false);
  const currentData = mockTechnicalData[selectedAsset as keyof typeof mockTechnicalData];
  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };
  const generateTradeIdea = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const baseIdea = mockTradeIdeas[selectedAsset as keyof typeof mockTradeIdeas];
      const sizeMultiplier = tradeSizes.find(s => s.value === tradeSize)?.multiplier || 1;
      const finalAmount = tradeSize === "custom" ? customAmount : 10000 * sizeMultiplier;
      
      // Calculate performance based on trade size and risk level
      const riskMultiplier = riskLevel === "low" ? 0.5 : riskLevel === "high" ? 1.5 : 1;
      const adjustedReturn = baseIdea.expectedReturn * riskMultiplier;
      const estimatedPnL = (finalAmount * adjustedReturn) / 100;
      const riskAmount = (finalAmount * (riskLevel === "low" ? 1 : riskLevel === "high" ? 4 : 2.5)) / 100;
      
      const enhancedIdea = {
        ...baseIdea,
        expectedReturn: adjustedReturn,
        performance: {
          ...baseIdea.performance,
          estimatedPnL: Math.round(estimatedPnL),
          roi: adjustedReturn,
          riskAmount: Math.round(riskAmount),
          tradeAmount: finalAmount
        }
      };
      
      setCurrentIdea(enhancedIdea);
      setIsGenerating(false);
      setShowRationale(false);
    }, 2500);
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
    return direction.toLowerCase() === "long" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const generateTechnicalLevels = () => {
    setIsGeneratingLevels(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const currentPrice = parseFloat(mockTechnicalData[selectedAsset]?.keyLevels.resistance[0] || "100");
      const direction = mockTechnicalData[selectedAsset]?.trend === "bullish" ? "buy" : "sell";
      
      let entry, stopLoss, takeProfit;
      
      if (direction === "buy") {
        entry = currentPrice * 0.995; // Enter slightly below current
        stopLoss = entry * 0.98; // 2% stop loss
        takeProfit = entry * 1.06; // 6% take profit (3:1 R:R)
      } else {
        entry = currentPrice * 1.005; // Enter slightly above current
        stopLoss = entry * 1.02; // 2% stop loss
        takeProfit = entry * 0.94; // 6% take profit (3:1 R:R)
      }
      
      const riskReward = Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss);
      
      const taSummaries = [
        "Bullish breakout above key resistance with strong volume confirmation",
        "Bearish reversal at resistance with RSI divergence",
        "Support retest with hammer candlestick pattern",
        "Trend continuation after pullback to 20 EMA",
        "Double bottom formation with bullish divergence",
        "Bearish flag pattern breakdown below support"
      ];
      
      const levels = {
        entry: parseFloat(entry.toFixed(4)),
        stopLoss: parseFloat(stopLoss.toFixed(4)),
        takeProfit: parseFloat(takeProfit.toFixed(4)),
        riskReward: parseFloat(riskReward.toFixed(2)),
        taSummary: taSummaries[Math.floor(Math.random() * taSummaries.length)],
        direction
      };
      
      setTradeLevels(levels);
      setShowLevels(true);
      setIsGeneratingLevels(false);
    }, 1500);
  };

  const handleLevelUpdate = (type: 'entry' | 'stopLoss' | 'takeProfit', value: number) => {
    if (!tradeLevels) return;
    
    const updatedLevels = { ...tradeLevels, [type]: value };
    
    // Recalculate risk/reward
    const riskReward = Math.abs(updatedLevels.takeProfit - updatedLevels.entry) / 
                      Math.abs(updatedLevels.entry - updatedLevels.stopLoss);
    updatedLevels.riskReward = parseFloat(riskReward.toFixed(2));
    
    setTradeLevels(updatedLevels);
  };
  return <div className="space-y-6">
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
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
            {assets.map(asset => <button key={asset.symbol} onClick={() => setSelectedAsset(asset.symbol)} className={cn("p-3 rounded-lg border transition-smooth text-left", selectedAsset === asset.symbol ? "bg-primary/10 border-primary/20 text-primary shadow-glow-primary" : "bg-card border-border-light hover:bg-accent/50")}>
                <div className="font-medium text-sm">{asset.symbol}</div>
                <div className="text-xs text-muted-foreground">{asset.type}</div>
              </button>)}
          </div>
        </CardContent>
      </Card>

      {/* Chart and Trade Generator Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live Chart */}
        <div className="lg:col-span-2">
          <CandlestickChart 
            asset={selectedAsset} 
            title={`Live Chart - ${selectedAsset}`} 
            height={400}
            tradeLevels={showLevels ? tradeLevels : null}
            onLevelUpdate={handleLevelUpdate}
          />
        </div>

        {/* AI Trade Idea Generator */}
        <div className="lg:col-span-1">
          <Card className="gradient-card border-border-light shadow-medium h-fit sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                AI Trade Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Risk Appetite
                  </label>
                  <Select value={riskLevel} onValueChange={setRiskLevel}>
                    <SelectTrigger className="bg-background/50 border-border-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {riskLevels.map(level => <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", level.color === "success" ? "bg-success" : level.color === "warning" ? "bg-warning" : "bg-danger")} />
                            {level.label}
                          </div>
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Trade Size
                  </label>
                  <Select value={tradeSize} onValueChange={setTradeSize}>
                    <SelectTrigger className="bg-background/50 border-border-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tradeSizes.map(size => <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {tradeSize === "custom" && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Custom Amount ($)
                    </label>
                    <Input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(Number(e.target.value))}
                      className="bg-background/50 border-border-light"
                      placeholder="Enter amount"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Time Horizon
                  </label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="bg-background/50 border-border-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeframes.map(tf => <SelectItem key={tf.value} value={tf.value}>
                          {tf.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Min Confidence: {confidenceThreshold[0]}%
                  </label>
                  <Slider
                    value={confidenceThreshold}
                    onValueChange={setConfidenceThreshold}
                    max={95}
                    min={50}
                    step={5}
                    className="py-2"
                  />
                </div>
              </div>

              <Button onClick={generateTradeIdea} disabled={isGenerating} className="w-full" size="lg">
                {isGenerating ? <>
                    <Brain className="h-4 w-4 animate-spin mr-2" />
                    AI Analyzing...
                  </> : <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Trade Setup
                  </>}
              </Button>

              {/* AI Generated Trade Idea */}
              {currentIdea && (
                <div className="space-y-4 pt-4 border-t border-border-light">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      AI Trade Recommendation
                    </h4>
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                      {currentIdea.confidence}% Confidence
                    </Badge>
                  </div>
                  
                  <div className="bg-card/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-semibold", getDirectionColor(currentIdea.direction))}>
                          {currentIdea.direction} {currentIdea.instrument}
                        </span>
                        {getDirectionIcon(currentIdea.direction)}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {currentIdea.riskReward}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Entry:</span>
                        <span className="font-medium ml-1">{currentIdea.entry}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Take Profit:</span>
                        <span className="font-medium ml-1 text-success">{currentIdea.takeProfit}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stop Loss:</span>
                        <span className="font-medium ml-1 text-danger">{currentIdea.stopLoss}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium ml-1">{currentIdea.duration}</span>
                      </div>
                    </div>
                    
                    <div className="bg-primary/5 rounded-md p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Expected Return:</span>
                        <span className="font-semibold text-success">+{currentIdea.expectedReturn.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Estimated P&L:</span>
                        <span className="font-semibold">${currentIdea.performance.estimatedPnL.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Risk Amount:</span>
                        <span className="font-medium text-warning">${currentIdea.performance.riskAmount.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowRationale(!showRationale)}
                      className="w-full text-xs"
                    >
                      <Info className="h-3 w-3 mr-1" />
                      {showRationale ? 'Hide Analysis' : 'Show AI Analysis'}
                    </Button>
                    
                    {showRationale && (
                      <div className="text-xs space-y-3 bg-muted/20 rounded-md p-3">
                        <div>
                          <p className="font-medium mb-1">Strategy Rationale:</p>
                          <p className="text-muted-foreground leading-relaxed">{currentIdea.reasoning}</p>
                        </div>
                        
                        <div>
                          <p className="font-medium mb-1">Technical Trigger:</p>
                          <p className="text-muted-foreground">{currentIdea.technicalTrigger}</p>
                        </div>
                        
                        <div>
                          <p className="font-medium mb-1">Risk Assessment:</p>
                          <p className="text-muted-foreground">{currentIdea.riskAssessment}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 pt-2">
                          {currentIdea.keyFactors.map((factor: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1 text-xs">
                        <Save className="h-3 w-3 mr-1" />
                        Save Trade
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs">
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Levels Generation */}
              {currentIdea && (
                <div className="space-y-3 pt-4 border-t border-border-light">
                  <Button 
                    onClick={generateTechnicalLevels}
                    disabled={isGeneratingLevels}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    {isGeneratingLevels ? (
                      <>
                        <BarChart3 className="h-4 w-4 animate-spin mr-2" />
                        Generating Levels...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Generate Technical Levels
                      </>
                    )}
                  </Button>

                  {tradeLevels && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">Technical Analysis Complete</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {tradeLevels.taSummary}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>Risk/Reward:</span>
                          <span className="font-bold text-warning">{tradeLevels.riskReward}:1</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Direction:</span>
                          <span className={`font-bold ${tradeLevels.direction === 'buy' ? 'text-success' : 'text-danger'}`}>
                            {tradeLevels.direction.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Stats */}
              <div className="space-y-3 pt-4 border-t border-border-light">
                <h4 className="text-sm font-medium text-muted-foreground">Quick Stats</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trend</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(currentData.trend)}
                      <span className={cn("font-medium", getTrendColor(currentData.trend))}>
                        {currentData.trend}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Momentum</span>
                    <span className="font-medium">{currentData.momentum}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Volatility</span>
                    <span className="font-medium">{currentData.volatility}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
                <Progress value={currentData.momentum} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Strength</span>
                  <span>{currentData.strength}%</span>
                </div>
                <Progress value={currentData.strength} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Volatility</span>
                  <span>{currentData.volatility}%</span>
                </div>
                <Progress value={currentData.volatility} className="h-2" />
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
                {currentData.keyLevels.resistance.map((level, index) => <div key={index} className="flex items-center justify-between p-2 bg-danger/5 border border-danger/20 rounded">
                    <span className="text-sm">R{index + 1}</span>
                    <span className="font-mono text-sm text-danger">{level}</span>
                  </div>)}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-success mb-2">Support Levels</h4>
              <div className="space-y-2">
                {currentData.keyLevels.support.map((level, index) => <div key={index} className="flex items-center justify-between p-2 bg-success/5 border border-success/20 rounded">
                    <span className="text-sm">S{index + 1}</span>
                    <span className="font-mono text-sm text-success">{level}</span>
                  </div>)}
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
            {currentData.signals.map((signal, index) => <div key={index} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-border-light">
                <div>
                  <div className="font-medium text-sm">{signal.name}</div>
                  <div className="text-xs text-muted-foreground">{signal.status}</div>
                </div>
                <div className="text-right">
                  <div className={cn("font-mono text-sm", signal.color === "success" ? "text-success" : signal.color === "danger" ? "text-danger" : "text-warning")}>
                    {typeof signal.value === 'number' ? signal.value.toFixed(4) : signal.value}
                  </div>
                </div>
              </div>)}
          </CardContent>
        </Card>
      </div>


      {/* Enhanced Professional Trade Card */}
      {currentIdea && <Card className="gradient-card border-border-light shadow-strong">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className={cn("p-3 rounded-lg", currentIdea.direction.toLowerCase() === "long" ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                  {getDirectionIcon(currentIdea.direction)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{currentIdea.instrument}</span>
                    <Badge variant="secondary" className={cn(currentIdea.direction.toLowerCase() === "long" ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20")}>
                      {currentIdea.direction}
                    </Badge>
                    <Badge variant="outline" className="border-primary/20 text-primary">
                      {currentIdea.confidence}% confidence
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
            {/* Trade Setup Metrics */}
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

            {/* Performance Estimation */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-foreground">Performance Forecast</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Projected Return</p>
                  <p className="text-lg font-bold text-success">+{currentIdea.performance.roi.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Est. P&L</p>
                  <p className="text-lg font-bold text-foreground">${currentIdea.performance.estimatedPnL.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium text-foreground">{currentIdea.duration}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk Amount</p>
                  <p className="text-sm font-medium text-danger">${currentIdea.performance.riskAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border-light">
                <p className="text-xs text-muted-foreground">
                  95% CI: +{currentIdea.confidenceInterval.min}% to +{currentIdea.confidenceInterval.max}% • 
                  Success Probability: {currentIdea.successProbability}% • 
                  Position Size: ${currentIdea.performance.tradeAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <Separator className="bg-border-light" />

            {/* AI Strategy Rationale */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI Strategy Analysis
                </h4>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {currentIdea.timeframe} • {currentIdea.duration}
                  </span>
                </div>
              </div>

              <div className="bg-accent/20 rounded-lg p-4 border border-border-light">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {currentIdea.reasoning}
                </p>
              </div>

              <Button 
                variant="outline" 
                onClick={() => setShowRationale(!showRationale)}
                className="w-full"
              >
                <Info className="h-4 w-4 mr-2" />
                {showRationale ? "Hide" : "Show"} Detailed Rationale
              </Button>

              {showRationale && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-accent/20 rounded-lg p-4 border border-border-light">
                      <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-primary" />
                        Macro Context
                      </h5>
                      <p className="text-sm text-muted-foreground">{currentIdea.macroFactors}</p>
                    </div>
                    <div className="bg-accent/20 rounded-lg p-4 border border-border-light">
                      <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Technical Trigger
                      </h5>
                      <p className="text-sm text-muted-foreground">{currentIdea.technicalTrigger}</p>
                    </div>
                  </div>
                  
                  <div className="bg-accent/20 rounded-lg p-4 border border-border-light">
                    <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      Risk Assessment
                    </h5>
                    <p className="text-sm text-muted-foreground">{currentIdea.riskAssessment}</p>
                  </div>

                  <div className="bg-accent/20 rounded-lg p-4 border border-border-light">
                    <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      Alternative Analysis
                    </h5>
                    <p className="text-sm text-muted-foreground">{currentIdea.alternativesTrade}</p>
                  </div>
                </div>
              )}

              <div>
                <h5 className="font-medium text-foreground mb-2">Key Catalysts</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {currentIdea.keyFactors.map((factor: string, index: number) => (
                    <div key={index} className="bg-primary/5 border border-primary/20 rounded-lg p-2">
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
              <Button className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Execute Trade
              </Button>
              <Button variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save to Watchlist
              </Button>
              <Button variant="outline" onClick={generateTradeIdea}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New
              </Button>
            </div>
          </CardContent>
        </Card>}
    </div>;
}