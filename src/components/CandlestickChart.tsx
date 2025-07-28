import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Wifi, WifiOff } from 'lucide-react';

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

const timeframes = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
];

export function CandlestickChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [timeframe, setTimeframe] = useState('1m');
  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<string>('0');

  // Fetch historical data
  const fetchHistoricalData = async (interval: string) => {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=100`
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
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(var(--foreground))',
      },
      grid: {
        vertLines: { color: 'hsl(var(--border))' },
        horzLines: { color: 'hsl(var(--border))' },
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
      },
      timeScale: {
        borderColor: 'hsl(var(--border))',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: 'hsl(var(--success))',
      downColor: 'hsl(var(--danger))',
      borderUpColor: 'hsl(var(--success))',
      borderDownColor: 'hsl(var(--danger))',
      wickUpColor: 'hsl(var(--success))',
      wickDownColor: 'hsl(var(--danger))',
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
    const connectWebSocket = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${timeframe}`);
      
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
  }, [timeframe]);

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };

  return (
    <Card className="gradient-card border-border-light shadow-medium">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-bold">Live Market View</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="border-primary/20 text-primary">
                  BTC/USDT
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`border-${isConnected ? 'success' : 'danger'}/20 text-${isConnected ? 'success' : 'danger'}`}
                >
                  {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                  {isConnected ? 'Live' : 'Disconnected'}
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
      <CardContent>
        <div ref={chartContainerRef} className="w-full rounded-lg border border-border-light bg-background/30" />
        <div className="mt-3 text-xs text-muted-foreground text-center">
          Real-time data from Binance WebSocket API • Updates every {timeframe === '1m' ? 'minute' : timeframe}
        </div>
      </CardContent>
    </Card>
  );
}