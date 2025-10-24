import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Wifi, WifiOff } from 'lucide-react';
import { getSymbolForAsset, supportsRealTimeData } from '@/lib/assetMapping';
import { cn } from '@/lib/utils';
import { TradingViewWidget } from './TradingViewWidget';
import LightweightChartWidget from './LightweightChartWidget';
const {
  useState
} = React;
interface TradeLevels {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  direction: "BUY" | "SELL";
  technicalAnalysis?: {
    summary: string;
    indicators: string[];
    confirmation: boolean;
  };
}
interface CandlestickChartProps {
  asset: string;
  title?: string;
  showHeader?: boolean;
  height?: number;
  tradeLevels?: TradeLevels | null;
  onLevelUpdate?: (type: 'entry' | 'stopLoss' | 'takeProfit', value: number) => void;
  historicalData?: any[];
}
const timeframes = [{
  value: '1m',
  label: '1 Minute'
}, {
  value: '5m',
  label: '5 Minutes'
}, {
  value: '15m',
  label: '15 Minutes'
}, {
  value: '30m',
  label: '30 Minutes'
}, {
  value: '1h',
  label: '1 Hour'
}, {
  value: '4h',
  label: '4 Hours'
}, {
  value: 'D',
  label: '1 Day'
}, {
  value: 'W',
  label: '1 Week'
}, {
  value: 'M',
  label: '1 Month'
}];
export function CandlestickChart({
  asset,
  title,
  showHeader = true,
  height = 400,
  tradeLevels,
  onLevelUpdate,
  historicalData
}: CandlestickChartProps) {
  const [timeframe, setTimeframe] = useState('1h');
  const [isConnected, setIsConnected] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<string>('0');
  const [useFallback, setUseFallback] = useState(false);
  const binanceSymbol = getSymbolForAsset(asset);
  const hasRealTimeData = supportsRealTimeData(asset);

  // Reset fallback when asset or timeframe changes - give TwelveData another try
  React.useEffect(() => {
    setUseFallback(false);
  }, [asset, timeframe]);

  // Prix de fallback mis à jour (utilisés seulement en attendant WebSocket)
  React.useEffect(() => {
    const basePrice = asset === 'Bitcoin' || asset === 'BTC' ? 67500.00 : asset === 'EUR/USD' ? 1.0850 : asset === 'GBP/USD' ? 1.2650 : asset === 'GOLD' || asset === 'Gold' ? 2650.00 : asset === 'USD/JPY' ? 150.50 : asset === 'Ethereum' || asset === 'ETH' ? 3500.00 : asset === 'SILVER' || asset === 'Silver' ? 31.50 : asset === 'CRUDE' || asset === 'Crude Oil' ? 75.00 : asset === 'AUD/USD' ? 0.6650 : asset === 'NZD/USD' ? 0.6100 : 1.0000;
    setCurrentPrice(basePrice.toString());
  }, [asset]);

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };
  return <>
      {/* Chart Section - Full Width with integrated header */}
      <div className="w-full">
        <Card className="gradient-card border-border-light shadow-medium lg:rounded-none lg:border-0">
          {/* Header Section - Now inside the chart card */}
          {showHeader && (
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xl font-bold">{title || `${asset} Live Chart`}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="border-primary/20 text-primary">
                        {asset}
                      </Badge>
                      <Badge variant="outline" className={`border-${isConnected && hasRealTimeData ? 'success' : 'warning'}/20 text-${isConnected && hasRealTimeData ? 'success' : 'warning'}`}>
                        {isConnected && hasRealTimeData ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                        {isConnected && hasRealTimeData ? 'Live' : hasRealTimeData ? 'Disconnected' : 'Historical'}
                      </Badge>
                    </div>
                  </div>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    
                  </div>
                  <Select value={timeframe} onValueChange={handleTimeframeChange}>
                    <SelectTrigger className="w-32 bg-background/50 border-border-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeframes.map(tf => <SelectItem key={tf.value} value={tf.value}>
                          {tf.label}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          )}
          
          <CardContent className="pb-4 sm:pb-6 pt-4 sm:pt-6">
            <div className="relative overflow-hidden isolate z-0">
              {!useFallback ? (
                <LightweightChartWidget
                  selectedSymbol={asset}
                  timeframe={timeframe}
                  onPriceUpdate={(price) => {
                    setCurrentPrice(price);
                    setIsConnected(true); // Reflects TwelveData live connection
                  }}
                  onFallback={() => {
                    console.log('Lightweight Chart failed, switching to TradingView fallback');
                    setUseFallback(true);
                    setIsConnected(false); // Fallback means no TwelveData connection
                  }}
                />
              ) : (
                <TradingViewWidget 
                  selectedSymbol={binanceSymbol} 
                  timeframe={timeframe} 
                  onPriceUpdate={price => setCurrentPrice(price)} 
                  className="border-0 shadow-none" 
                />
              )}
              
              {/* Mobile-responsive Trade Levels Overlay */}
              {tradeLevels && <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-card/95 backdrop-blur-lg border border-border/50 rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-xl w-[calc(100%-1rem)] max-w-[280px] sm:min-w-[240px] sm:max-w-[300px] sm:w-auto z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn("w-3 h-3 rounded-full animate-pulse", tradeLevels.direction === "BUY" ? "bg-success" : "bg-destructive")}></div>
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {tradeLevels.direction} Setup
                    </span>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="text-[10px] text-muted-foreground mb-1">ENTRY</div>
                        <div className="font-mono font-bold text-primary text-[11px]">
                          ${tradeLevels.entry.toFixed(4)}
                        </div>
                      </div>
                      
                      <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="text-[10px] text-muted-foreground mb-1">STOP</div>
                        <div className="font-mono font-bold text-destructive text-[11px]">
                          ${tradeLevels.stopLoss.toFixed(4)}
                        </div>
                      </div>
                      
                      <div className="p-2 rounded-lg bg-success/10 border border-success/20">
                        <div className="text-[10px] text-muted-foreground mb-1">TARGET</div>
                        <div className="font-mono font-bold text-success text-[11px]">
                          ${tradeLevels.takeProfit.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <span className="text-muted-foreground font-medium">Risk/Reward</span>
                      <span className="font-bold text-primary">
                        1:{tradeLevels.riskReward.toFixed(1)}
                      </span>
                    </div>

                    {tradeLevels.technicalAnalysis && <div className="pt-2 border-t border-border/30">
                        <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">
                          Technical Confirmation
                        </div>
                        <p className="text-[11px] leading-relaxed text-foreground">
                          {tradeLevels.technicalAnalysis.summary.substring(0, 80)}...
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tradeLevels.technicalAnalysis.indicators.slice(0, 2).map((indicator, index) => <span key={index} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-medium">
                              {indicator}
                            </span>)}
                        </div>
                      </div>}

                    <div className="pt-2 border-t border-border/30">
                      <div className="text-[10px] text-muted-foreground mb-1">
                        Risk: ${Math.abs(tradeLevels.entry - tradeLevels.stopLoss).toFixed(2)} • 
                        Reward: ${Math.abs(tradeLevels.takeProfit - tradeLevels.entry).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>}
            </div>
            
            {showHeader && <div className="mt-3 text-xs text-muted-foreground text-center">
                {!useFallback ? 'Powered by TwelveData' : (hasRealTimeData ? `Real-time data from TradingView` : `Historical data • ${asset} chart`)}
              </div>}
          </CardContent>
        </Card>
      </div>
    </>;
}