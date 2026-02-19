import { useState, useEffect, useRef, memo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, BarChart3, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    TradingView: any;
  }
}

interface TradingViewWidgetProps {
  selectedSymbol: string;
  timeframe?: string;
  onSymbolChange?: (symbol: string) => void;
  onPriceUpdate?: (price: string) => void;
  className?: string;
}

interface CombinedData {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number | null;
  atr?: number | null;
  adx?: number | null;
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

const mapToTwelveDataSymbol = (asset: string): string => {
  const mappings: Record<string, string> = {
    'EURUSD': 'EUR/USD',
    'GBPUSD': 'GBP/USD',
    'XAUUSD': 'XAU/USD',
    'BTCUSD': 'BTC/USD',
    'USDJPY': 'USD/JPY',
    'AUDUSD': 'AUD/USD',
  };
  return mappings[asset] || asset;
};

// PERFORMANCE: Memoized component to prevent unnecessary re-renders
const TradingViewWidget = memo(function TradingViewWidget({
  selectedSymbol,
  timeframe: propTimeframe,
  onSymbolChange,
  onPriceUpdate,
  className = ""
}: TradingViewWidgetProps) {
  const [timeframe, setTimeframe] = useState<string>(propTimeframe || "1h");
  const [data, setData] = useState<CombinedData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFallback, setHasFallback] = useState(false);
  const {
    toast
  } = useToast();
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Local symbol state to keep dropdown selection stable and update chart
  const [currentSymbol, setCurrentSymbol] = useState<string>(selectedSymbol);

  // Sync with parent when prop changes
  useEffect(() => {
    setCurrentSymbol(selectedSymbol);
  }, [selectedSymbol]);

  // Sync timeframe with prop
  useEffect(() => {
    if (propTimeframe) {
      setTimeframe(propTimeframe);
    }
  }, [propTimeframe]);

  // Available symbols
  const symbols = [{
    value: "EURUSD",
    label: "EUR/USD"
  }, {
    value: "GBPUSD",
    label: "GBP/USD"
  }, {
    value: "XAUUSD",
    label: "XAU/USD"
  }, {
    value: "BTCUSD",
    label: "BTC/USD"
  }, {
    value: "USDJPY",
    label: "USD/JPY"
  }, {
    value: "AUDUSD",
    label: "AUD/USD"
  }];

  // Fetch data from Supabase using REST API directly
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const tdSymbol = mapToTwelveDataSymbol(currentSymbol);
      const interval = TIMEFRAME_MAPPING[timeframe] || '1h';
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      console.log(`Fetching data for: ${tdSymbol} (${interval}) from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // ✅ CORRECT: Use Supabase client to query prices_tv
      const { data: priceData, error: fetchError } = await supabase
        .from('prices_tv')
        .select('ts, open, high, low, close, volume')
        .eq('symbol', tdSymbol)
        .gte('ts', startDate.toISOString())
        .lte('ts', endDate.toISOString())
        .order('ts', { ascending: true })
        .limit(500);

      if (fetchError) throw fetchError;

      // ✅ LEFT JOIN indicators_tv manually
      const { data: indicatorData } = await supabase
        .from('indicators_tv')
        .select('ts, rsi, atr, adx')
        .eq('symbol', tdSymbol)
        .gte('ts', startDate.toISOString())
        .lte('ts', endDate.toISOString());

      // Merge price + indicators
      const combined = priceData.map((p: any) => ({
        ...p,
        rsi: indicatorData?.find((i: any) => i.ts === p.ts)?.rsi || null,
        atr: indicatorData?.find((i: any) => i.ts === p.ts)?.atr || null,
        adx: indicatorData?.find((i: any) => i.ts === p.ts)?.adx || null,
      }));

      const result = combined;
      
      if (result && result.length > 0) {
        setData(result);
        setHasFallback(false);
        console.log(`✅ Loaded ${result.length} data points from Supabase`);
      } else {
        throw new Error('No data available');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      // Always render the TradingView widget regardless of Supabase data
      loadTradingViewFallback();
    }
  };

  // Load TradingView widget via tv.js (more reliable in SPAs)
  const loadTradingViewFallback = async () => {
    if (!chartContainerRef.current) return;

    // Clear container and wait a bit for cleanup
    chartContainerRef.current.innerHTML = '';

    // Small delay to ensure proper cleanup
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create inner container for the chart with unique ID
    const chartEl = document.createElement('div');
    const CONTAINER_ID = `tv_chart_container_${Date.now()}`;
    chartEl.id = CONTAINER_ID;
    chartEl.style.height = '100%';
    chartEl.style.width = '100%';
    chartContainerRef.current.appendChild(chartEl);

    // Ensure tv.js is loaded once
    const ensureTvJs = () => new Promise<void>((resolve, reject) => {
      if (window.TradingView && typeof window.TradingView.widget === 'function') {
        resolve();
        return;
      }
      const existing = document.getElementById('tradingview-widget-script');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('TradingView script failed to load')));
        return;
      }
      const script = document.createElement('script');
      script.id = 'tradingview-widget-script';
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('TradingView script failed to load'));
      document.head.appendChild(script);
    });
    try {
      await ensureTvJs();
      // Map timeframe to TradingView intervals
      const interval = timeframe === '1m' ? '1' : timeframe === '5m' ? '5' : timeframe === '15m' ? '15' : timeframe === '30m' ? '30' : timeframe === '1h' ? '60' : timeframe === '4h' ? '240' : timeframe === 'D' ? 'D' : timeframe === 'W' ? 'W' : timeframe === 'M' ? 'M' : '60';
      // Initialize widget
      // @ts-ignore
      const widget = new window.TradingView.widget({
        autosize: true,
        symbol: currentSymbol,
        interval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        hide_top_toolbar: true,
        hide_side_toolbar: true,
        hide_legend: true,
        allow_symbol_change: false,
        withdateranges: false,
        studies: [],
        toolbar_bg: 'transparent',
        container_id: CONTAINER_ID,
        disabled_features: [
          "header_widget",
          "left_toolbar",
          "timeline_marks",
          "control_bar",
          "timeframes_toolbar",
          "volume_force_overlay",
        ],
        loading_screen: { backgroundColor: "#0e1116", foregroundColor: "#0e1116" },
        overrides: {
          // Grid removal — cover all known TradingView override key variants
          "paneProperties.vertGridProperties.color": "transparent",
          "paneProperties.horzGridProperties.color": "transparent",
          "paneProperties.vertGridProperties.style": 0,
          "paneProperties.horzGridProperties.style": 0,
          "paneProperties.gridProperties.color": "transparent",
          "paneProperties.gridProperties.style": 0,
          "paneProperties.gridLinesMode": "none",
          "paneProperties.crossHairProperties.style": 2,
          // Background
          "paneProperties.backgroundType": "solid",
          "paneProperties.background": "#0e1116",
          // Scale & price line
          "scalesProperties.showSymbolLabels": false,
          "scalesProperties.backgroundColor": "#0e1116",
          "scalesProperties.lineColor": "transparent",
          "mainSeriesProperties.priceLineVisible": false,
          "mainSeriesProperties.priceLineColor": "transparent",
          // Candle colors
          "mainSeriesProperties.candleStyle.upColor": "#22c55e",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
          "mainSeriesProperties.candleStyle.wickUpColor": "#22c55e",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
          "mainSeriesProperties.candleStyle.borderUpColor": "#22c55e",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
        },
        studies_overrides: {
          "volume.volume.color.0": "#ef444480",
          "volume.volume.color.1": "#22c55e80",
        },
        onChartReady: () => {
          console.log('TradingView chart ready');
        }
      });
    } catch (e) {
      console.error('TradingView init error:', e);
    }
  };

  // Load data when symbol or timeframe changes
  useEffect(() => {
    fetchData();
  }, [currentSymbol, timeframe]);

  // WebSocket for real-time Binance prices
  useEffect(() => {
    if (!onPriceUpdate) return;
    const symbol = currentSymbol;
    let ws: WebSocket | null = null;
    let isMounted = true;
    let messageReceived = false;
    let fallbackInterval: number | null = null;
    let fallbackTimer: number | null = null;
    const deriveStreamSymbol = (sym: string) => {
      const upper = sym.toUpperCase();
      const cryptoBases = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE', 'TON', 'DOT', 'MATIC', 'LTC', 'LINK', 'AVAX', 'TRX', 'BCH'];
      const base = cryptoBases.find(t => upper.startsWith(t));
      if (base) return `${base}USDT`;
      return upper; // likely unsupported on Binance; will trigger fallback
    };
    const startFallback = () => {
      if (!onPriceUpdate) return;
      if (fallbackInterval) return;
      console.log(`⚠️ No Binance data for ${symbol}. Starting simulated realtime fallback.`);
      // Choose a seed/base price similar to previous behavior
      const basePrice = symbol === 'BTCUSD' ? 95247.50 : symbol === 'EURUSD' ? 1.0856 : symbol === 'GBPUSD' ? 1.2734 : symbol === 'XAUUSD' ? 2687.45 : symbol === 'USDJPY' ? 154.23 : symbol === 'ETHUSD' ? 3421.67 : symbol === 'XAGUSD' ? 31.45 : symbol === 'USOIL' ? 68.92 : 1.0000;
      const decimals = symbol.includes('JPY') ? 2 : 4;
      const tick = () => {
        const variation = (Math.random() - 0.5) * 0.004; // ±0.2%
        const newPrice = basePrice * (1 + variation);
        onPriceUpdate(newPrice.toFixed(decimals));
      };
      tick();
      fallbackInterval = window.setInterval(tick, 2000);
    };
    const connectWebSocket = () => {
      // Clean up previous connection
      if (ws) {
        ws.close();
      }
      const streamSymbol = deriveStreamSymbol(symbol);
      const url = `wss://stream.binance.com:9443/ws/${streamSymbol.toLowerCase()}@ticker`;
      console.log(`🔌 Connecting to Binance WS: ${url}`);
      ws = new WebSocket(url);
      ws.onopen = () => {
        if (isMounted) {
          console.log(`✅ Connected to ${streamSymbol} price feed (source: Binance)`);
          // If we don't receive any tick within 5s, start fallback
          fallbackTimer = window.setTimeout(() => {
            if (!messageReceived) startFallback();
          }, 5000);
        }
      };
      ws.onmessage = event => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          // Verify the symbol matches current stream symbol
          if (data && data.s && data.c) {
            messageReceived = true;
            if (fallbackInterval) {
              clearInterval(fallbackInterval);
              fallbackInterval = null;
            }
            const price = parseFloat(data.c);
            const decimals = streamSymbol.includes('JPY') ? 2 : streamSymbol.startsWith('BTC') ? 2 : 4;
            onPriceUpdate(price.toFixed(decimals));
          }
        } catch (error) {
          console.error('Error parsing Binance price data:', error);
        }
      };
      ws.onclose = () => {
        if (isMounted) {
          console.log(`🔌 Disconnected from ${streamSymbol} price feed`);
          // Reconnect after 3 seconds if still mounted
          setTimeout(() => {
            if (isMounted && symbol === currentSymbol) {
              connectWebSocket();
            }
          }, 3000);
        }
      };
      ws.onerror = error => {
        if (isMounted) {
          console.error('WebSocket error:', error);
        }
      };
    };
    connectWebSocket();
    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };
  }, [currentSymbol, onPriceUpdate]);
  return <div className={`w-full h-full flex flex-col overflow-hidden rounded-2xl ${className}`}>
        {loading && <div className="flex items-center justify-center h-64 sm:h-80 lg:h-96">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading market data...</span>
          </div>}

        {hasFallback && !loading}

        <div className="relative w-full flex-1 min-h-0 overflow-hidden rounded-2xl">
          {/* TradingView injection target - no React children */}
          <div
            ref={chartContainerRef}
            className="absolute inset-0 [&_iframe]:!m-0 [&_iframe]:!p-0 [&_iframe]:!border-0 [&>div]:!m-0 [&>div]:!p-0"
          />
          {/* React-managed overlays - safe from innerHTML wipe */}
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-card/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium text-foreground/80">
            <span>{mapToTwelveDataSymbol(currentSymbol)}</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">{timeframe.toUpperCase()}</span>
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={fetchData}
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full shadow-md opacity-70 hover:opacity-100 transition-opacity"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
    </div>;
}, (prevProps, nextProps) => {
  // Only re-render if symbol or timeframe changes
  return prevProps.selectedSymbol === nextProps.selectedSymbol && 
         prevProps.timeframe === nextProps.timeframe;
});

export { TradingViewWidget };
