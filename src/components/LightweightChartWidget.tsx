import { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  UTCTimestamp
} from 'lightweight-charts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getSymbolForAsset } from '@/lib/assetMapping';

interface LightweightChartWidgetProps {
  selectedSymbol: string;
  timeframe: string;
  onPriceUpdate?: (price: string) => void;
  onFallback?: () => void;
  className?: string;
}

const TIMEFRAME_MAPPING: Record<string, string> = {
  '1m': '1min',
  '5m': '5min',
  '15m': '15min',
  '30m': '30min',
  '1h': '1h',
  '4h': '4h',
  'D': '1day',
  'W': '1week',
  'M': '1month'
};

export default function LightweightChartWidget({
  selectedSymbol,
  timeframe,
  onPriceUpdate,
  onFallback,
  className = ''
}: LightweightChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastCandleRef = useRef<CandlestickData | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: 'transparent' },
          textColor: 'hsl(var(--foreground))',
        },
        grid: {
          vertLines: { color: 'hsl(var(--border) / 0.1)' },
          horzLines: { color: 'hsl(var(--border) / 0.1)' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 500,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: 'hsl(var(--border))',
        },
        rightPriceScale: {
          borderColor: 'hsl(var(--border))',
        },
      });

      const candlestickSeries = (chart as any).addCandlestickSeries({
        upColor: 'hsl(var(--success))',
        downColor: 'hsl(var(--danger))',
        borderUpColor: 'hsl(var(--success))',
        borderDownColor: 'hsl(var(--danger))',
        wickUpColor: 'hsl(var(--success))',
        wickDownColor: 'hsl(var(--danger))',
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    } catch (err) {
      console.error('Error initializing chart:', err);
      setError('Failed to initialize chart');
      if (onFallback) {
        setTimeout(onFallback, 100);
      }
    }
  }, [onFallback]);

  // Fetch historical data
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!candlestickSeriesRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const interval = TIMEFRAME_MAPPING[timeframe] || '1h';
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // 30 days of history

        const { data, error: fetchError } = await supabase.functions.invoke('fetch-historical-prices', {
          body: {
            instrument: selectedSymbol,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            interval: interval,
            extendDays: 5
          }
        });

        if (fetchError) throw fetchError;

        if (data && Array.isArray(data)) {
          const formattedData: CandlestickData[] = data
            .map((item: any) => ({
              time: (new Date(item.datetime).getTime() / 1000) as UTCTimestamp,
              open: parseFloat(item.open),
              high: parseFloat(item.high),
              low: parseFloat(item.low),
              close: parseFloat(item.close),
            }))
            .filter((item: CandlestickData) => 
              !isNaN(item.open) && !isNaN(item.high) && 
              !isNaN(item.low) && !isNaN(item.close)
            )
            .sort((a, b) => (a.time as number) - (b.time as number));

          if (formattedData.length > 0) {
            candlestickSeriesRef.current.setData(formattedData);
            lastCandleRef.current = formattedData[formattedData.length - 1];
            chartRef.current?.timeScale().fitContent();
            setLoading(false);
          } else {
            throw new Error('No valid data received');
          }
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) {
        console.error('Error fetching historical data:', err);
        setError('Failed to load chart data');
        setLoading(false);
        
        // Trigger fallback after 2 seconds
        if (onFallback) {
          setTimeout(onFallback, 2000);
        }
      }
    };

    fetchHistoricalData();
  }, [selectedSymbol, timeframe, onFallback]);

  // Setup WebSocket for real-time updates
  useEffect(() => {
    if (loading || !candlestickSeriesRef.current) return;

    const binanceSymbol = getSymbolForAsset(selectedSymbol);
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@kline_${timeframe === 'D' ? '1d' : timeframe}`);
        
        ws.onopen = () => {
          console.log(`WebSocket connected for ${selectedSymbol}`);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const kline = data.k;
            
            if (kline && candlestickSeriesRef.current) {
              const candle: CandlestickData = {
                time: Math.floor(kline.t / 1000) as UTCTimestamp,
                open: parseFloat(kline.o),
                high: parseFloat(kline.h),
                low: parseFloat(kline.l),
                close: parseFloat(kline.c),
              };

              candlestickSeriesRef.current.update(candle);
              lastCandleRef.current = candle;

              if (onPriceUpdate) {
                onPriceUpdate(kline.c);
              }
            }
          } catch (err) {
            console.error('Error processing WebSocket message:', err);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected, reconnecting...');
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
          ws.close();
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('Error connecting WebSocket:', err);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [selectedSymbol, timeframe, loading, onPriceUpdate]);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    // Trigger re-fetch by updating state
    if (candlestickSeriesRef.current) {
      candlestickSeriesRef.current.setData([]);
    }
  };

  if (error && !loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <p className="text-sm text-muted-foreground mb-4">Switching to fallback chart...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        )}
        
        <div ref={chartContainerRef} className="w-full" />

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Powered by Twelve Data + Binance</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-7"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
