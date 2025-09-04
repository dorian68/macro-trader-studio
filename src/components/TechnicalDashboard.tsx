import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [selectedSymbol, setSelectedSymbol] = useState(selectedAsset.symbol);
  const [selectedInterval, setSelectedInterval] = useState("1h");
  const [error, setError] = useState<string | null>(null);

  const API_KEY = "e40fcead02054731aef55d2dfe01cf47";
  const BASE_URL = "https://api.twelvedata.com";

  const assetOptions = [
    { value: "EUR/USD", label: "EUR/USD" },
    { value: "GBP/USD", label: "GBP/USD" },
    { value: "USD/JPY", label: "USD/JPY" },
    { value: "BTC/USD", label: "BTC/USD" },
    { value: "ETH/USD", label: "ETH/USD" }
  ];

  const intervalOptions = [
    { value: "15min", label: "15 min" },
    { value: "30min", label: "30 min" },
    { value: "1h", label: "1 hour" },
    { value: "1day", label: "1 day" }
  ];

  const calculateSimpleRSI = (prices: number[]): number => {
    if (prices.length < 14) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < Math.min(15, prices.length); i++) {
      const change = prices[i - 1] - prices[i];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateSimpleATR = (pricesData: any[]): number => {
    if (pricesData.length < 2) return 0.001;
    
    let totalTR = 0;
    for (let i = 1; i < Math.min(15, pricesData.length); i++) {
      const high = pricesData[i].high;
      const low = pricesData[i].low;
      const prevClose = pricesData[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      totalTR += tr;
    }
    
    return totalTR / Math.min(14, pricesData.length - 1);
  };

  const fetchTechnicalData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching technical data for ${selectedSymbol} with interval ${selectedInterval}...`);
      
      // Fetch multiple indicators from Twelve Data API
      const [rsiResponse, atrResponse, adxResponse] = await Promise.all([
        fetch(`${BASE_URL}/rsi?symbol=${selectedSymbol}&interval=${selectedInterval}&apikey=${API_KEY}&format=JSON`),
        fetch(`${BASE_URL}/atr?symbol=${selectedSymbol}&interval=${selectedInterval}&apikey=${API_KEY}&format=JSON`),
        fetch(`${BASE_URL}/adx?symbol=${selectedSymbol}&interval=${selectedInterval}&apikey=${API_KEY}&format=JSON`)
      ]);

      // Check if all requests were successful
      if (!rsiResponse.ok || !atrResponse.ok || !adxResponse.ok) {
        throw new Error('Failed to fetch technical indicators');
      }

      const [rsiData, atrData, adxData] = await Promise.all([
        rsiResponse.json(),
        atrResponse.json(),
        adxResponse.json()
      ]);

      // Extract latest values
      const latestRsi = parseFloat(rsiData.values?.[0]?.rsi || "50");
      const latestAtr = parseFloat(atrData.values?.[0]?.atr || "0.001");
      const latestAdx = parseFloat(adxData.values?.[0]?.adx || "0");

      const technicalIndicators: TechnicalIndicator[] = [
        { name: "RSI(14)", value: latestRsi, signal: getSignalFromRSI(latestRsi) },
        { name: "ATR(14)", value: latestAtr, signal: "NEUTRAL" },
        { name: "ADX(14)", value: latestAdx, signal: getSignalFromADX(latestAdx) }
      ];

      setIndicators(technicalIndicators);
      generateSignalsFromIndicators(technicalIndicators, latestRsi, latestAdx);

    } catch (error) {
      console.error('Error fetching technical data:', error);
      setError("Data unavailable");
      // Fallback to mock data
      generateMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const processRealData = (pricesData: any[], indicatorsData?: any) => {
    // Calculate indicators from real price data
    const prices = pricesData.map((p: any) => parseFloat(p.close));
    
    // Use pre-calculated indicators from Supabase if available, otherwise calculate
    let rsi, atr, adx;
    
    if (indicatorsData) {
      rsi = indicatorsData.rsi || calculateSimpleRSI(prices);
      atr = indicatorsData.atr || calculateSimpleATR(pricesData);
      adx = indicatorsData.adx || 0;
      console.log(`Using real-time indicators: RSI=${rsi}, ATR=${atr}, ADX=${adx}`);
    } else {
      rsi = calculateSimpleRSI(prices);
      atr = calculateSimpleATR(pricesData);
      adx = 0;
      console.log(`Using calculated indicators: RSI=${rsi}, ATR=${atr}`);
    }
    
    const currentPrice = prices[0];
    const oldPrice = prices[prices.length - 1];
    const priceChange = ((currentPrice - oldPrice) / oldPrice) * 100;
    
    const realIndicators: TechnicalIndicator[] = [
      { name: "RSI(14)", value: rsi, signal: getSignalFromRSI(rsi) },
      { name: "ATR(14)", value: atr, signal: "NEUTRAL" },
      { name: "ADX(14)", value: adx, signal: getSignalFromADX(adx) },
      { name: "Price Change %", value: priceChange, signal: priceChange > 0 ? "BUY" : "SELL" }
    ];
    
    setIndicators(realIndicators);
    generateSignalsFromIndicators(realIndicators, rsi, adx);
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

  const generateSignalsFromIndicators = (indicators: TechnicalIndicator[], rsi: number, adx: number) => {
    // More sophisticated signal generation using real indicators
    const rsiSignal = getSignalFromRSI(rsi);
    const adxSignal = getSignalFromADX(adx);
    
    // Moving averages signal (simplified - could be enhanced with real MA data)
    const priceChangeIndicator = indicators.find(i => i.name === "Price Change %");
    const maSignal = priceChangeIndicator && priceChangeIndicator.value > 0.5 ? "BUY" : 
                    priceChangeIndicator && priceChangeIndicator.value < -0.5 ? "SELL" : "NEUTRAL";
    
    const newSignals: TechnicalSignal[] = [
      {
        name: "Moving Averages",
        value: maSignal === "BUY" ? "Bullish" : maSignal === "SELL" ? "Bearish" : "Neutral",
        signal: maSignal,
        strength: Math.abs(priceChangeIndicator?.value || 0) > 1 ? "STRONG" : "WEAK"
      },
      {
        name: "Oscillators", 
        value: rsiSignal === "BUY" ? "Oversold" : rsiSignal === "SELL" ? "Overbought" : "Neutral",
        signal: rsiSignal,
        strength: (rsi < 20 || rsi > 80) ? "STRONG" : "WEAK"
      },
      {
        name: "Trend Strength",
        value: adx > 25 ? "Strong Trend" : adx > 15 ? "Weak Trend" : "No Trend",
        signal: adxSignal,
        strength: adx > 40 ? "STRONG" : "WEAK"
      }
    ];

    // Calculate overall summary based on all signals
    const buyCount = newSignals.filter(s => s.signal === "BUY").length;
    const sellCount = newSignals.filter(s => s.signal === "SELL").length;
    const neutralCount = newSignals.filter(s => s.signal === "NEUTRAL").length;
    
    let overallSignal: "BUY" | "SELL" | "NEUTRAL";
    let overallValue: string;
    
    if (buyCount > sellCount + neutralCount) {
      overallSignal = "BUY";
      overallValue = "Strong Buy";
    } else if (buyCount > sellCount) {
      overallSignal = "BUY"; 
      overallValue = "Buy";
    } else if (sellCount > buyCount + neutralCount) {
      overallSignal = "SELL";
      overallValue = "Strong Sell";
    } else if (sellCount > buyCount) {
      overallSignal = "SELL";
      overallValue = "Sell";
    } else {
      overallSignal = "NEUTRAL";
      overallValue = "Neutral";
    }

    newSignals.push({
      name: "Summary",
      value: overallValue,
      signal: overallSignal,
      strength: (buyCount === 3 || sellCount === 3) ? "STRONG" : "WEAK"
    });

    setSignals(newSignals);
    setSummary(overallSignal);
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
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchTechnicalData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedSymbol, selectedInterval]);

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
      {/* Header with Controls */}
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

      {/* Controls */}
      <div className="flex gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Asset</label>
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assetOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Interval</label>
          <Select value={selectedInterval} onValueChange={setSelectedInterval}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intervalOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

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