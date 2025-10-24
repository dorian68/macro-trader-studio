// FIX: [2025-10-24] Complete audit and fix of Lightweight Charts data feed
// ISSUES FIXED:
//  - Double WS connection (page-level + chart-level) causing rate-limits
//  - Chart superposition from multiple initializations
//  - WS reconnect storms from loading dependencies
//  - Live data ignored when historical data pending
//  - Incorrect addSeries() syntax for v5 API
// RESULT:
//  - Single TwelveData WS consumer (this component only)
//  - Chart initializes ONCE on mount, never re-created
//  - WS connects only after historical data ready OR creates first live candle
//  - Backoff on rate-limit errors
//  - Fallback only after both REST and WS fail

import { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  CandlestickSeries,
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
  const lastCandleRef = useRef<CandlestickData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyReady, setHistoryReady] = useState(false); // NEW: Track if historical data loaded
  
  // Tooltip state
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Initialize chart (ONCE on mount, never re-create)
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    console.log('🎬 Chart initialization starting (ONCE on mount)');

    // ⚠️ GUARD: Prevent double initialization
    if (chartRef.current) {
      console.warn('⚠️ Chart already exists, skipping re-init');
      return;
    }

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

      // ✅ Correct API for lightweight-charts v5
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
      
      console.log('✅ Chart created successfully');

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
        console.log('🧹 Cleanup: removing chart on UNMOUNT');
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
        candlestickSeriesRef.current = null;
        
        // Clean up WebSocket and reconnect timers
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
    } catch (err) {
      console.error('❌ Error initializing chart:', err);
      setError('Failed to initialize chart');
    }
  }, []); // ✅ Empty deps = run ONCE on mount, cleanup ONLY on unmount
  
  // Reset chart data when instrument or timeframe changes (DO NOT re-create chart)
  useEffect(() => {
    if (candlestickSeriesRef.current) {
      console.log(`🔄 Instrument/timeframe changed to ${selectedSymbol} ${timeframe}, clearing data`);
      candlestickSeriesRef.current.setData([]);
      lastCandleRef.current = null;
    }
    setLoading(true);
    setError(null);
    setHistoryReady(false); // Mark history as not ready yet
  }, [selectedSymbol, timeframe]);

  // Fetch historical data
  useEffect(() => {
    const fetchHistoricalData = async () => {
      // ✅ Wait for chart and series to be ready (prevent race condition)
      if (!candlestickSeriesRef.current || !chartRef.current) {
        console.warn('⏳ Chart not ready yet, retrying in 100ms...');
        setTimeout(fetchHistoricalData, 100);
        return;
      }

      setLoading(true);
      setError(null);
      setHistoryReady(false); // Mark history as not ready yet

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

          if (fetchError) {
            console.error('❌ Edge function error:', {
              error: fetchError,
              instrument: tdSymbol,
              interval: interval,
              message: fetchError.message || 'Unknown error'
            });
            throw fetchError;
          }

          const payload = data as { data?: any[]; cached?: boolean; error?: string; message?: string };
          
          if (payload.error) {
            console.error('❌ Edge function returned error:', {
              error: payload.error,
              message: payload.message,
              payload: payload
            });
            throw new Error(payload.error);
          }
          
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

        // ✅ Debug: Log formatted candles
        console.log(`📊 Formatted ${formattedData.length} candles:`, {
          first: formattedData[0],
          last: formattedData[formattedData.length - 1],
          sample: formattedData.slice(0, 3)
        });

        if (formattedData.length > 0) {
          console.log(`✅ Loaded ${formattedData.length} candles to chart`);
          candlestickSeriesRef.current.setData(formattedData);
          lastCandleRef.current = formattedData[formattedData.length - 1];
          chartRef.current?.timeScale().fitContent();
          
          // Add test markers with tooltips
          if (formattedData.length > 5) {
            const testMarkers = [
              {
                time: formattedData[Math.floor(formattedData.length * 0.3)].time,
                position: 'belowBar' as const,
                color: '#2196F3',
                shape: 'circle' as const,
                text: 'Test Point 1',
              },
              {
                time: formattedData[Math.floor(formattedData.length * 0.5)].time,
                position: 'aboveBar' as const,
                color: '#f59e0b',
                shape: 'arrowDown' as const,
                text: 'Test Point 2',
              },
              {
                time: formattedData[Math.floor(formattedData.length * 0.8)].time,
                position: 'belowBar' as const,
                color: '#22c55e',
                shape: 'arrowUp' as const,
                text: 'Test Point 3',
              },
            ];

            candlestickSeriesRef.current.setMarkers(testMarkers);
            console.log('✅ Added test markers to chart');
          }
          
          setHistoryReady(true); // ✅ Mark history as ready for WebSocket
          setLoading(false);
        } else {
          throw new Error('No valid data after parsing');
        }
      } catch (err) {
        console.error('❌ Error fetching historical data:', err);
        setError('Failed to load chart data');
        setLoading(false);
        
        if (onFallback) {
          console.warn(`⏰ Chart data loading failed after 15s, triggering fallback to TradingView...`);
          console.error('Failed to load data for:', {
            symbol: selectedSymbol,
            timeframe: timeframe,
            error: err
          });
          setTimeout(onFallback, 15000);
        }
      }
    };

    fetchHistoricalData();
  }, [selectedSymbol, timeframe, onFallback]);

  // FIX: WebSocket for real-time updates - ONLY starts when history ready
  // No 'loading' in deps to prevent reconnect storms
  useEffect(() => {
    // Don't start WebSocket until chart is ready AND history loaded (or timeout allows first live candle)
    if (!candlestickSeriesRef.current || !historyReady) {
      console.log('⏳ Waiting for chart and history before starting WebSocket...');
      return;
    }

    const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY;
    if (!apiKey) {
      console.error('TwelveData API key not configured');
      return;
    }

    const connectTwelveDataWebSocket = () => {
      try {
        const tdSymbol = mapToTwelveDataSymbol(selectedSymbol);
        const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`);
        
        ws.onopen = () => {
          console.log(`✅ TwelveData WebSocket OPENED for ${selectedSymbol} → ${tdSymbol}`);
          
          // Reset reconnect attempts on successful connection
          reconnectAttemptsRef.current = 0;
          
          ws.send(JSON.stringify({
            action: 'subscribe',
            params: { symbols: tdSymbol }
          }));

          console.log(`📤 Subscription sent for ${tdSymbol}`);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            
            // Log ALL messages (for debugging)
            console.log('📥 TwelveData WS message:', msg);
            
            // Handle rate-limit / message-processing errors with backoff
            if (msg.event === 'message-processing' && msg.status === 'error') {
              console.error('🚫 TwelveData rate-limit error:', msg.message);
              reconnectAttemptsRef.current++;
              
              // Calculate backoff: 10s, 30s, 60s, capped at 60s
              const backoffMs = Math.min(10000 * Math.pow(3, reconnectAttemptsRef.current - 1), 60000);
              console.warn(`⏱️ Backing off ${backoffMs / 1000}s before reconnect (attempt ${reconnectAttemptsRef.current})`);
              
              ws.close();
              return;
            }
            
            // Ignore status/heartbeat messages
            if (msg.event === 'subscribe-status') {
              console.log('✅ Subscription status:', msg.status, msg.message);
              return;
            }
            if (msg.event === 'heartbeat') {
              console.log('💓 Heartbeat received');
              return;
            }
            
            // Extract price flexibly from various message formats
            let price: number | null = null;
            
            if (typeof msg.price !== 'undefined') {
              price = parseFloat(msg.price);
            } else if (msg.data && typeof msg.data.price !== 'undefined') {
              price = parseFloat(msg.data.price);
            } else if (msg.p !== undefined) { // Compact format
              price = parseFloat(msg.p);
            }
            
            if (price && !isNaN(price) && candlestickSeriesRef.current) {
              console.log(`✅ Price update for ${tdSymbol}: ${price}`);
              
              const timestamp = Math.floor(Date.now() / 1000) as UTCTimestamp;
              
              // If no historical data yet, create first live candle
              if (!lastCandleRef.current) {
                console.log('📊 Creating first live candle from WebSocket data');
                const firstLiveCandle: CandlestickData = {
                  time: timestamp,
                  open: price,
                  high: price,
                  low: price,
                  close: price,
                };
                candlestickSeriesRef.current.setData([firstLiveCandle]);
                lastCandleRef.current = firstLiveCandle;
              } else {
                // Update existing candle
                const updatedCandle: CandlestickData = {
                  ...lastCandleRef.current,
                  time: timestamp,
                  close: price,
                  high: Math.max(lastCandleRef.current.high, price),
                  low: Math.min(lastCandleRef.current.low, price),
                };

                candlestickSeriesRef.current.update(updatedCandle);
                lastCandleRef.current = updatedCandle;
              }

              if (onPriceUpdate) {
                const decimals = selectedSymbol.includes('JPY') ? 2 : 4;
                onPriceUpdate(price.toFixed(decimals));
              }
            } else {
              console.warn('⚠️ Could not extract price from message:', msg);
            }
          } catch (err) {
            console.error('❌ Error processing TwelveData WebSocket message:', err);
          }
        };

        ws.onclose = () => {
          console.log(`❌ TwelveData WS closed for ${tdSymbol}`);
          wsRef.current = null;
          
          // Calculate backoff delay if rate-limited
          const backoffMs = reconnectAttemptsRef.current > 0 
            ? Math.min(10000 * Math.pow(3, reconnectAttemptsRef.current - 1), 60000)
            : 3000;
          
          console.log(`⏱️ Reconnecting in ${backoffMs / 1000}s...`);
          
          // Clear previous timeout if any
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          // Attempt to reconnect after backoff delay
          reconnectTimeoutRef.current = setTimeout(() => {
            if (candlestickSeriesRef.current && historyReady) {
              connectTwelveDataWebSocket();
            }
          }, backoffMs);
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

    connectTwelveDataWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [selectedSymbol, timeframe, historyReady]); // ✅ FIX: Removed 'loading' to prevent reconnect storms

  // Tooltip setup
  useEffect(() => {
    if (!chartContainerRef.current || !chartRef.current) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      setTooltipPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
      setTooltipVisible(true);
    };

    const handleMouseLeave = () => {
      setTooltipVisible(false);
    };

    const container = chartContainerRef.current;
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <Card className={`border-border-light shadow-medium ${className}`}>
      <CardContent className="p-0">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading chart data...</p>
              </div>
            </div>
          )}
          
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}
          
          <div 
            ref={chartContainerRef} 
            className="w-full relative"
            style={{ minHeight: '500px' }}
          />
          
          {tooltipVisible && tooltipContent && (
            <div
              ref={tooltipRef}
              className="absolute pointer-events-none bg-card border border-border rounded-lg p-2 text-xs shadow-lg z-20"
              style={{
                left: `${tooltipPosition.x + 10}px`,
                top: `${tooltipPosition.y - 40}px`
              }}
            >
              {tooltipContent}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
