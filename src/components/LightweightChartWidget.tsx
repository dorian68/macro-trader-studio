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

// Local TwelveData symbol mapping
const mapToTwelveDataSymbol = (asset: string): string => {
  const mappings: Record<string, string> = {
    // Forex
    'EUR/USD': 'EUR/USD',
    'GBP/USD': 'GBP/USD',
    'USD/JPY': 'USD/JPY',
    'AUD/USD': 'AUD/USD',
    'NZD/USD': 'NZD/USD',
    'USD/CHF': 'USD/CHF',
    'EUR/GBP': 'EUR/GBP',
    'EUR/JPY': 'EUR/JPY',
    
    // Crypto
    'Bitcoin': 'BTC/USD',
    'BTC': 'BTC/USD',
    'Ethereum': 'ETH/USD',
    'ETH': 'ETH/USD',
    'BTC-USD': 'BTC/USD',
    'ETH-USD': 'ETH/USD',
    
    // Commodities
    'GOLD': 'XAU/USD',
    'Gold': 'XAU/USD',
    'SILVER': 'XAG/USD',
    'Silver': 'XAG/USD',
    'CRUDE': 'WTI/USD',
    'Crude Oil': 'WTI/USD',
    'NATGAS': 'NG/USD',
    'Natural Gas': 'NG/USD',
    
    // Indices
    'SPX': 'SPX',
    'DJI': 'DJI',
    'IXIC': 'IXIC'
  };
  
  return mappings[asset] || asset;
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
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | any>(null);
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

      const candlestickSeries = chart.addSeries({
        type: 'Candlestick',
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      } as any);

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
        const tdSymbol = mapToTwelveDataSymbol(selectedSymbol);
        const interval = TIMEFRAME_MAPPING[timeframe] || '1h';
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        console.log(`📊 Fetching historical data for ${selectedSymbol} → TwelveData: ${tdSymbol}, interval: ${interval}`);

        let rows: any[] = [];

        // Try edge function first
        try {
          const { data, error: fetchError } = await supabase.functions.invoke('fetch-historical-prices', {
            body: {
              instrument: tdSymbol,
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0],
              interval: interval,
              extendDays: 5
            }
          });

          if (fetchError) throw fetchError;

          const payload = data as { data?: any[]; cached?: boolean; error?: string; message?: string };
          rows = Array.isArray(payload) ? payload : payload?.data || [];
          
          console.log(`✅ Edge function returned ${rows.length} data points`);
        } catch (edgeError) {
          console.warn('⚠️ Edge function failed, trying direct TwelveData API:', edgeError);

          // Fallback to direct TwelveData REST API
          const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY;
          if (!apiKey) throw new Error('TwelveData API key not configured');

          const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${interval}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&apikey=${apiKey}&outputsize=500`;
          
          const response = await fetch(url);
          const json = await response.json();

          if (json.status === 'error') {
            throw new Error(json.message || 'TwelveData API error');
          }

          rows = (json.values || []).map((v: any) => ({
            datetime: v.datetime,
            date: v.datetime?.split(' ')[0],
            open: v.open,
            high: v.high,
            low: v.low,
            close: v.close,
            volume: v.volume
          }));

          console.log(`✅ Direct API returned ${rows.length} data points`);
        }
        
        if (!rows || rows.length === 0) {
          throw new Error('No data available from any source');
        }

        const formattedData: CandlestickData[] = rows
          .map((item: any) => {
            const ts = item.datetime ?? item.date;
            const time = ts ? (Math.floor(new Date(ts).getTime() / 1000) as UTCTimestamp) : undefined;
            
            return {
              time,
              open: parseFloat(item.open),
              high: parseFloat(item.high),
              low: parseFloat(item.low),
              close: parseFloat(item.close),
            };
          })
          .filter((item: CandlestickData) => 
            item.time && 
            !isNaN(item.open) && !isNaN(item.high) && 
            !isNaN(item.low) && !isNaN(item.close)
          )
          .sort((a, b) => (a.time as number) - (b.time as number));

        if (formattedData.length > 0) {
          console.log(`✅ Loaded ${formattedData.length} candles to chart`);
          candlestickSeriesRef.current.setData(formattedData);
          lastCandleRef.current = formattedData[formattedData.length - 1];
          chartRef.current?.timeScale().fitContent();
          setLoading(false);
        } else {
          throw new Error('No valid data after parsing');
        }
      } catch (err) {
        console.error('❌ Error fetching historical data:', err);
        setError('Failed to load chart data');
        setLoading(false);
        
        if (onFallback) {
          setTimeout(onFallback, 2000);
        }
      }
    };

    fetchHistoricalData();
  }, [selectedSymbol, timeframe, onFallback]);

  // Setup WebSocket for real-time updates with TwelveData
  useEffect(() => {
    if (loading || !candlestickSeriesRef.current) return;

    const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY;
    if (!apiKey) {
      console.error('TwelveData API key not configured');
      return;
    }

    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        const tdSymbol = mapToTwelveDataSymbol(selectedSymbol);
        const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`);
        
        ws.onopen = () => {
          console.log(`✅ TwelveData WebSocket connected for ${selectedSymbol} → ${tdSymbol}`);
          
          // Subscribe to the TwelveData symbol
          ws.send(JSON.stringify({
            action: 'subscribe',
            params: {
              symbols: tdSymbol
            }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            
            // Handle subscription confirmation
            if (msg.event === 'subscribe-status') {
              console.log('Subscription status:', msg);
              return;
            }
            
            // Handle price updates - tolerate different message formats
            const isPriceEvent = msg.event === 'price' || typeof msg.price !== 'undefined';
            
            if (isPriceEvent && candlestickSeriesRef.current && lastCandleRef.current) {
              const price = parseFloat(msg.price ?? msg.data?.price);
              
              if (!isNaN(price)) {
                const timestamp = Math.floor(Date.now() / 1000) as UTCTimestamp;
                
                // Update the last candle with the new price
                const updatedCandle: CandlestickData = {
                  ...lastCandleRef.current,
                  time: timestamp,
                  close: price,
                  high: Math.max(lastCandleRef.current.high, price),
                  low: Math.min(lastCandleRef.current.low, price),
                };

                candlestickSeriesRef.current.update(updatedCandle);
                lastCandleRef.current = updatedCandle;

                if (onPriceUpdate) {
                  const decimals = selectedSymbol.includes('JPY') ? 2 : 4;
                  onPriceUpdate(price.toFixed(decimals));
                }
              }
            }
          } catch (err) {
            console.error('Error processing TwelveData WebSocket message:', err);
          }
        };

        ws.onclose = () => {
          console.log('TwelveData WebSocket disconnected, reconnecting...');
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
          console.error('TwelveData WebSocket error:', err);
          ws.close();
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('Error connecting TwelveData WebSocket:', err);
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
          <span>Powered by TwelveData</span>
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
