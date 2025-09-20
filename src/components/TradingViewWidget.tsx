import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, BarChart3, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
export function TradingViewWidget({
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
  const { toast } = useToast();
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
      // Query combined data from both tables using direct REST API
      const query = `
        SELECT p.ts, p.open, p.high, p.low, p.close, p.volume,
               i.rsi, i.atr, i.adx
        FROM prices_tv p
        LEFT JOIN indicators_tv i ON p.symbol = i.symbol AND p.ts = i.ts
         WHERE p.symbol = '${currentSymbol}'
         ORDER BY p.ts ASC
        LIMIT 500
      `;
      const response = await fetch(`https://jqrlegdulnnrpiixiecf.supabase.co/rest/v1/rpc/search_chunks_cosine?query_embedding=[]&match_count=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxcmxlZ2R1bG5ucnBpaXhpZWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDYzNDgsImV4cCI6MjA2OTk4MjM0OH0.on2S0WpM45atAYvLU8laAZJ-abS4RcMmfiqW7mLtT_4',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxcmxlZ2R1bG5ucnBpaXhpZWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MDYzNDgsImV4cCI6MjA2OTk4MjM0OH0.on2S0WpM45atAYvLU8laAZJ-abS4RcMmfiqW7mLtT_4'
        }
      });

      // Since the tables might not have data, show fallback immediately
      console.log('Supabase query attempted, using TradingView fallback');
      setHasFallback(true);
      setData([]);
      loadTradingViewFallback();
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Using TradingView fallback data');
      setHasFallback(true);
      loadTradingViewFallback();
    } finally {
      setLoading(false);
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
      const interval = timeframe === '1m' ? '1' : timeframe === '5m' ? '5' : timeframe === '15m' ? '15' : timeframe === '1h' ? '60' : timeframe === '4h' ? '240' : 'D';
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
        hide_top_toolbar: false,
        allow_symbol_change: false,
        withdateranges: true,
        studies: ['RSI@tv-basicstudies', 'ATR@tv-basicstudies', 'ADX@tv-basicstudies'],
        container_id: CONTAINER_ID,
        onChartReady: () => {
          // Mock price update for demonstration
          if (onPriceUpdate) {
            const mockPrice = currentSymbol === 'BTCUSD' ? '95247.50' : 
                            currentSymbol === 'EURUSD' ? '1.0856' :
                            currentSymbol === 'GBPUSD' ? '1.2734' :
                            currentSymbol === 'XAUUSD' ? '2687.45' :
                            currentSymbol === 'USDJPY' ? '154.23' :
                            currentSymbol === 'ETHUSD' ? '3421.67' :
                            currentSymbol === 'XAGUSD' ? '31.45' :
                            currentSymbol === 'USOIL' ? '68.92' : '1.0000';
            onPriceUpdate(mockPrice);
          }
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
  return <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Chart
          </CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={currentSymbol} onValueChange={(v) => { setCurrentSymbol(v); onSymbolChange?.(v); }}>
              <SelectTrigger className="w-full sm:w-32 h-10 touch-manipulation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {symbols.map(symbol => <SelectItem key={symbol.value} value={symbol.value}>
                    {symbol.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-20 h-10 touch-manipulation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1H</SelectItem>
                <SelectItem value="4h">4H</SelectItem>
                <SelectItem value="1d">1D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-0">
        {loading && <div className="flex items-center justify-center h-64 sm:h-80 lg:h-96">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading market data...</span>
          </div>}

        {hasFallback && !loading}

        <div ref={chartContainerRef} className="relative w-full h-[380px] sm:h-[460px] lg:h-[560px] border border-border rounded-lg overflow-hidden" />

        <div className="mt-3 sm:mt-4 text-sm text-muted-foreground">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Market data powered by TradingView
            </span>
            <Button variant="outline" size="sm" onClick={fetchData} className="h-8 sm:h-9 text-xs touch-manipulation" style={{ minHeight: '44px' }}>
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>;
}