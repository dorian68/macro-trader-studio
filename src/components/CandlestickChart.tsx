import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Wifi, WifiOff, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { getSymbolForAsset, supportsRealTimeData } from '@/lib/assetMapping';
import { cn } from '@/lib/utils';
import { TradingViewWidget } from './TradingViewWidget';
import LightweightChartWidget from './LightweightChartWidget';
import { supabase } from '@/integrations/supabase/client';
import { HybridSearchBar } from './HybridSearchBar';
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
interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

interface Asset {
  symbol: string;
  name: string;
  icon: string;
}

interface CandlestickChartProps {
  asset: string;
  title?: string;
  showHeader?: boolean;
  height?: number;
  tradeLevels?: TradeLevels | null;
  onLevelUpdate?: (type: 'entry' | 'stopLoss' | 'takeProfit', value: number) => void;
  historicalData?: any[];
  forceMode?: 'tradingview' | 'light'; // Admin-only chart mode override
  
  // New props for integrated dashboard header
  dashboardTitle?: string;
  dashboardSubtitle?: string;
  priceData?: PriceData | null;
  isConnected?: boolean;
  allAssets?: Asset[];
  selectedAsset?: string;
  currentAsset?: Asset;
  onAssetSelect?: (asset: string) => void;
  selectedAssetProfile?: any;
  onAssetProfileSelect?: (asset: any) => void;
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
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
  historicalData,
  forceMode,
  dashboardTitle,
  dashboardSubtitle,
  priceData,
  isConnected: isConnectedProp,
  allAssets,
  selectedAsset,
  currentAsset,
  onAssetSelect,
  selectedAssetProfile,
  onAssetProfileSelect,
  timeframe: timeframeProp,
  onTimeframeChange
}: CandlestickChartProps) {
  const [localTimeframe, setLocalTimeframe] = useState('1h');
  const [isConnected, setIsConnected] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<string>('0');
  const [useFallback, setUseFallback] = useState(false);
  const [globalProvider, setGlobalProvider] = useState<'twelvedata' | 'tradingview'>('twelvedata');
  const binanceSymbol = getSymbolForAsset(asset);
  const hasRealTimeData = supportsRealTimeData(asset);
  
  // Use controlled timeframe if provided, otherwise use local state
  const timeframe = timeframeProp || localTimeframe;

  React.useEffect(() => {
    const fetchProvider = async () => {
      const { data } = await supabase.from('chart_provider_settings').select('provider').single();
      if (data) {
        setGlobalProvider(data.provider as 'twelvedata' | 'tradingview');
        if (data.provider === 'tradingview') setUseFallback(true);
      }
    };
    fetchProvider();
  }, []);

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
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe);
    } else {
      setLocalTimeframe(newTimeframe);
    }
  };
  
  // Determine effective chart mode based on forceMode (admin override)
  const effectiveUseFallback = forceMode === 'tradingview' 
    ? true 
    : forceMode === 'light' 
      ? false 
      : useFallback;
  
  const effectiveProvider = forceMode === 'tradingview'
    ? 'tradingview'
    : forceMode === 'light'
      ? 'twelvedata'
      : globalProvider;

  return <>
      {/* Chart Section - Full Width with integrated header */}
      <div className="w-full">
        <Card className="gradient-card border border-border/50 shadow-medium rounded-lg min-h-[800px] flex flex-col">
          {/* Header Section - Integrated dashboard header */}
          {showHeader && (
            <CardHeader className="pb-6 border-b border-border/50 space-y-4">
              {/* Row 1: Trading Dashboard Title + Trading Controls & Price Widget */}
              {dashboardTitle && (
                <div className="flex flex-col lg:flex-row items-start lg:items-start justify-between gap-4">
                  {/* Left: Dashboard Title */}
                  <div className="flex items-center gap-3">
                    <div className="gradient-primary p-2 sm:p-3 rounded-xl shadow-glow-primary shrink-0">
                      <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                        {dashboardTitle}
                      </h1>
                      {dashboardSubtitle && (
                        <p className="text-sm sm:text-base text-muted-foreground">
                          {dashboardSubtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Right: Trading Controls + Price Widget */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* Top row: Instrument + Connection + Timeframe */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary/20 text-primary">
                        {asset}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        isConnected && hasRealTimeData ? "border-success/20 text-success" : "border-warning/20 text-warning"
                      )}>
                        {isConnected && hasRealTimeData ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                        {isConnected && hasRealTimeData ? 'Live' : hasRealTimeData ? 'Disconnected' : 'Historical'}
                      </Badge>
                      <Select value={timeframe} onValueChange={handleTimeframeChange}>
                        <SelectTrigger className="w-28 h-8 bg-background/50 border-border-light text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeframes.map(tf => 
                            <SelectItem key={tf.value} value={tf.value}>
                              {tf.label}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Bottom row: Price Widget */}
                    {priceData && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl sm:text-2xl font-bold text-foreground font-mono">
                            ${priceData.price.toFixed(selectedAsset?.includes('JPY') ? 2 : 4)}
                          </span>
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse shrink-0",
                            isConnectedProp ? "bg-success" : "bg-danger"
                          )} />
                        </div>
                        {priceData.change24h !== undefined && (
                          <div className={cn(
                            "flex items-center gap-1 text-sm font-medium",
                            priceData.change24h >= 0 ? "text-success" : "text-danger"
                          )}>
                            {priceData.change24h >= 0 ? 
                              <TrendingUp className="h-3 w-3" /> : 
                              <TrendingDown className="h-3 w-3" />
                            }
                            {priceData.change24h >= 0 ? '+' : ''}{priceData.change24h.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Row 2: HybridSearchBar */}
              {onAssetSelect && allAssets && (
                <div className="w-full">
                  <HybridSearchBar
                    assets={allAssets}
                    selectedAsset={selectedAsset || asset}
                    onAssetSelect={onAssetSelect}
                    onAssetProfileSelect={onAssetProfileSelect}
                    instrument={asset}
                    timeframe={timeframe}
                  />
                </div>
              )}

              {/* Row 3: Popular Assets Selector */}
              {allAssets && onAssetSelect && (
                <div className="w-full -mx-2 sm:mx-0">
                  <div className="flex gap-2 overflow-x-auto pb-2 px-2 sm:px-0 snap-x snap-mandatory scrollbar-hide">
                    {allAssets.map((assetItem) => (
                      <button
                        key={assetItem.symbol}
                        onClick={() => onAssetSelect(assetItem.symbol)}
                        className={cn(
                          "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-smooth flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 snap-start min-w-fit touch-manipulation",
                          selectedAsset === assetItem.symbol
                            ? "bg-primary text-primary-foreground shadow-glow-primary"
                            : "bg-card/50 hover:bg-primary/10 text-foreground border border-border/30"
                        )}
                        style={{ minHeight: '44px' }}
                      >
                        <span className="font-semibold">{assetItem.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </CardHeader>
          )}
          
          <CardContent className="pb-4 sm:pb-6 pt-4 sm:pt-6 flex-1">
            <div className="relative overflow-hidden isolate z-0 h-full flex flex-col">
              {!effectiveUseFallback && effectiveProvider === 'twelvedata' ? (
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
                {!effectiveUseFallback ? 'Powered by TwelveData' : (hasRealTimeData ? `Real-time data from TradingView` : `Historical data • ${asset} chart`)}
              </div>}
          </CardContent>
        </Card>
      </div>
    </>;
}