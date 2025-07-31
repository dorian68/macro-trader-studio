import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSymbolForAsset, supportsRealTimeData } from '@/lib/assetMapping';

interface BinanceKlineData {
  k: {
    t: number; // Open time
    T: number; // Close time
    s: string; // Symbol
    i: string; // Interval
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Volume
  };
}

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
}

const timeframes = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
];

export function CandlestickChart({ 
  asset, 
  title, 
  showHeader = true, 
  height = 400,
  tradeLevels,
  onLevelUpdate
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const levelLinesRef = useRef<any[]>([]);
  
  const [timeframe, setTimeframe] = useState('1m');
  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<string>('0');
  
  const binanceSymbol = getSymbolForAsset(asset);
  const hasRealTimeData = supportsRealTimeData(asset);

  // Fetch historical data
  const fetchHistoricalData = async (interval: string) => {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=100`
      );
      const data = await response.json();
      
      return data.map((kline: any[]) => ({
        time: (kline[0] / 1000) as Time, // Convert to seconds
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
      }));
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up previous chart if it exists
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (error) {
        console.warn('Chart cleanup warning:', error);
      }
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'hsl(var(--background))' },
        textColor: 'hsl(var(--foreground))',
        fontSize: 12,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      },
      grid: {
        vertLines: { 
          color: 'hsl(var(--border))',
          style: 1,
          visible: true,
        },
        horzLines: { 
          color: 'hsl(var(--border))',
          style: 1,
          visible: true,
        },
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
        textColor: 'hsl(var(--foreground))',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        borderVisible: true,
        visible: true,
        autoScale: true,
        alignLabels: true,
        mode: 0,
        entireTextOnly: false,
      },
      timeScale: {
        borderColor: 'hsl(var(--border))',
        timeVisible: true,
        secondsVisible: false,
        borderVisible: true,
        visible: true,
        rightOffset: 12,
        barSpacing: 6,
        minBarSpacing: 0.5,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'hsl(var(--muted-foreground))',
          width: 1,
          style: 3,
          visible: true,
          labelVisible: true,
          labelBackgroundColor: 'hsl(var(--background))',
        },
        horzLine: {
          color: 'hsl(var(--muted-foreground))',
          width: 1,
          style: 3,
          visible: true,
          labelVisible: true,
          labelBackgroundColor: 'hsl(var(--background))',
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: 'hsl(142 76% 36%)',        // Vert sémantique
      downColor: 'hsl(0 84% 60%)',        // Rouge sémantique
      borderUpColor: 'hsl(142 76% 36%)',   
      borderDownColor: 'hsl(0 84% 60%)', 
      wickUpColor: 'hsl(142 76% 36%)',     
      wickDownColor: 'hsl(0 84% 60%)',
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
      title: asset,
      visible: true,
      priceLineVisible: true,
      lastValueVisible: true,
      priceLineSource: 0,
      priceLineWidth: 1,
      priceLineColor: 'hsl(var(--primary))',
      priceLineStyle: 2,
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // WebSocket connection
  useEffect(() => {
    // Si pas de données temps réel, on charge seulement les données historiques
    if (!hasRealTimeData) {
      fetchHistoricalData(timeframe).then((historicalData) => {
        if (seriesRef.current && historicalData.length > 0) {
          seriesRef.current.setData(historicalData);
        }
      });
      return;
    }

    const connectWebSocket = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@kline_${timeframe}`);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data: BinanceKlineData = JSON.parse(event.data);
          const kline = data.k;
          
          const candleData: CandlestickData = {
            time: (kline.t / 1000) as Time,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
          };

          setCurrentPrice(kline.c);
          
          if (seriesRef.current) {
            seriesRef.current.update(candleData);
          }
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      wsRef.current = ws;
    };

    // Load historical data first
    fetchHistoricalData(timeframe).then((historicalData) => {
      if (seriesRef.current && historicalData.length > 0) {
        seriesRef.current.setData(historicalData);
      }
      // Then connect WebSocket
      connectWebSocket();
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [timeframe, binanceSymbol, hasRealTimeData]);

  // Add/Update trade levels on chart
  useEffect(() => {
    if (!seriesRef.current || !tradeLevels) {
      return;
    }

    // For now, we'll display the levels in an overlay since price lines are complex
    // This approach will show level information without direct chart integration
    console.log('Trade levels updated:', tradeLevels);
  }, [tradeLevels]);

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };

  return (
    <Card className="gradient-card border-border-light shadow-medium">
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xl font-bold">{title || `${asset} Chart`}</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="border-primary/20 text-primary">
                    {asset}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`border-${isConnected && hasRealTimeData ? 'success' : 'warning'}/20 text-${isConnected && hasRealTimeData ? 'success' : 'warning'}`}
                  >
                    {isConnected && hasRealTimeData ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                    {isConnected && hasRealTimeData ? 'Live' : hasRealTimeData ? 'Disconnected' : 'Historical'}
                  </Badge>
              </div>
            </div>
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-foreground">
                ${parseFloat(currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">Current Price</div>
            </div>
            <Select value={timeframe} onValueChange={handleTimeframeChange}>
              <SelectTrigger className="w-32 bg-background/50 border-border-light">
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
      </CardHeader>
      )}
      <CardContent>
        <div className="relative">
          <div 
            ref={chartContainerRef} 
            className="w-full rounded-lg border border-border overflow-hidden bg-card"
            style={{ height: `${height}px` }}
          />
          
          {/* Enhanced Trade Levels Overlay */}
          {tradeLevels && (
            <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl p-4 shadow-xl min-w-[240px] max-w-[300px]">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn(
                  "w-3 h-3 rounded-full animate-pulse",
                  tradeLevels.direction === "BUY" ? "bg-success" : "bg-destructive"
                )}></div>
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

                {tradeLevels.technicalAnalysis && (
                  <div className="pt-2 border-t border-border/30">
                    <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">
                      Technical Confirmation
                    </div>
                    <p className="text-[11px] leading-relaxed text-foreground">
                      {tradeLevels.technicalAnalysis.summary.substring(0, 80)}...
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tradeLevels.technicalAnalysis.indicators.slice(0, 2).map((indicator, index) => (
                        <span 
                          key={index} 
                          className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-medium"
                        >
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border/30">
                  <div className="text-[10px] text-muted-foreground mb-1">
                    Risk: ${Math.abs(tradeLevels.entry - tradeLevels.stopLoss).toFixed(2)} • 
                    Reward: ${Math.abs(tradeLevels.takeProfit - tradeLevels.entry).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {showHeader && (
          <div className="mt-3 text-xs text-muted-foreground text-center">
            {hasRealTimeData 
              ? `Real-time data from Binance WebSocket API • Updates every ${timeframe === '1m' ? 'minute' : timeframe}`
              : `Historical data • ${asset} chart`
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}