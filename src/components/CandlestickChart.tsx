import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Wifi, WifiOff } from 'lucide-react';
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
  taSummary: string;
  direction: "buy" | "sell";
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
          
          {/* Trade Levels Overlay - Repositionné et amélioré */}
          {tradeLevels && (
            <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
              <div className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                Trade Levels
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-muted-foreground font-medium">Entry</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground">
                    ${tradeLevels.entry.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive"></div>
                    <span className="text-muted-foreground font-medium">Stop</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground">
                    ${tradeLevels.stopLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-muted-foreground font-medium">Target</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground">
                    ${tradeLevels.takeProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">R:R</span>
                  <span className="font-semibold text-primary">
                    1:{tradeLevels.riskReward.toFixed(1)}
                  </span>
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