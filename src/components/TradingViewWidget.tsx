import { useState, useEffect, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { DisplayOptions, DEFAULT_DISPLAY_OPTIONS } from '@/types/chartDisplayOptions';

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
  displayOptions?: DisplayOptions;
  darkTheme?: boolean;
}

// Map bare symbols to TradingView-qualified symbols (only if not already qualified)
const ensureTradingViewSymbol = (symbol: string): string => {
  // Already qualified (e.g. FX:EURUSD, COINBASE:BTCUSD)
  if (symbol.includes(':')) return symbol;

  const mapping: Record<string, string> = {
    'EURUSD': 'FX:EURUSD',
    'GBPUSD': 'FX:GBPUSD',
    'USDJPY': 'FX:USDJPY',
    'AUDUSD': 'FX:AUDUSD',
    'NZDUSD': 'FX:NZDUSD',
    'USDCAD': 'FX:USDCAD',
    'USDCHF': 'FX:USDCHF',
    'EURGBP': 'FX:EURGBP',
    'EURJPY': 'FX:EURJPY',
    'GBPJPY': 'FX:GBPJPY',
    'BTCUSD': 'COINBASE:BTCUSD',
    'ETHUSD': 'COINBASE:ETHUSD',
    'XAUUSD': 'OANDA:XAUUSD',
    'XAGUSD': 'OANDA:XAGUSD',
  };
  return mapping[symbol] || symbol;
};

const TradingViewWidget = memo(function TradingViewWidget({
  selectedSymbol,
  timeframe: propTimeframe,
  onPriceUpdate,
  className = "",
  displayOptions: propDisplayOptions = DEFAULT_DISPLAY_OPTIONS,
  darkTheme = false,
}: TradingViewWidgetProps) {
  const [timeframe, setTimeframe] = useState<string>(propTimeframe || "1h");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const loadIdRef = useRef(0);

  const [currentSymbol, setCurrentSymbol] = useState<string>(selectedSymbol);
  const displayOptions = propDisplayOptions;

  useEffect(() => {
    setCurrentSymbol(selectedSymbol);
  }, [selectedSymbol]);

  useEffect(() => {
    if (propTimeframe) setTimeframe(propTimeframe);
  }, [propTimeframe]);

  // Load TradingView widget directly (no blocking Supabase prefetch)
  const loadTradingViewWidget = async () => {
    const thisLoadId = ++loadIdRef.current;
    const container = chartContainerRef.current;
    if (!container) return;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    if (loadIdRef.current !== thisLoadId || !chartContainerRef.current) return;

    const chartEl = document.createElement('div');
    const CONTAINER_ID = `tv_chart_container_${Date.now()}`;
    chartEl.id = CONTAINER_ID;
    chartEl.style.height = '100%';
    chartEl.style.width = '100%';
    chartContainerRef.current.appendChild(chartEl);

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
      if (loadIdRef.current !== thisLoadId) return;

      const interval = timeframe === '1m' ? '1' : timeframe === '5m' ? '5' : timeframe === '15m' ? '15' : timeframe === '30m' ? '30' : timeframe === '1h' ? '60' : timeframe === '4h' ? '240' : timeframe === 'D' ? 'D' : timeframe === 'W' ? 'W' : timeframe === 'M' ? 'M' : '60';

      const studies: string[] = [];
      if (displayOptions.showVolume) studies.push('Volume@tv-basicstudies');
      if (displayOptions.showStudies) {
        studies.push('RSI@tv-basicstudies');
        studies.push('ADX@tv-basicstudies');
      }

      const gridColor = displayOptions.showGrid ? (darkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)') : 'transparent';
      const tvSymbol = ensureTradingViewSymbol(currentSymbol);

      // @ts-ignore
      const widget = new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval,
        timezone: 'Etc/UTC',
        theme: darkTheme ? 'dark' : 'light',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        hide_top_toolbar: !displayOptions.showToolbar,
        hide_side_toolbar: !displayOptions.showPriceScale,
        hide_legend: true,
        allow_symbol_change: false,
        withdateranges: false,
        studies,
        toolbar_bg: 'transparent',
        container_id: CONTAINER_ID,
        enabled_features: ["maximize_chart_area"],
        disabled_features: [
          ...(displayOptions.showToolbar ? [] : ["header_widget"]),
          ...(displayOptions.showPriceScale ? [] : ["left_toolbar"]),
          "timeline_marks",
          "control_bar",
          ...(displayOptions.showTimeScale ? [] : ["timeframes_toolbar"]),
          "volume_force_overlay",
        ],
        loading_screen: { backgroundColor: "transparent", foregroundColor: "#68b4bc" },
        overrides: {
          "paneProperties.vertGridProperties.color": gridColor,
          "paneProperties.horzGridProperties.color": gridColor,
          "paneProperties.vertGridProperties.style": displayOptions.showGrid ? 1 : 0,
          "paneProperties.horzGridProperties.style": displayOptions.showGrid ? 1 : 0,
          "paneProperties.gridProperties.color": gridColor,
          "paneProperties.gridProperties.style": displayOptions.showGrid ? 1 : 0,
          "paneProperties.gridLinesMode": displayOptions.showGrid ? "both" : "none",
          "paneProperties.crossHairProperties.style": 2,
          "scalesProperties.showSymbolLabels": false,
          "scalesProperties.lineColor": "transparent",
          "mainSeriesProperties.priceLineVisible": true,
          "mainSeriesProperties.priceLineColor": "#68b4bc",
          "mainSeriesProperties.priceLineWidth": 1,
          "mainSeriesProperties.style": 1,
          "mainSeriesProperties.candleStyle.upColor": "#22c55e",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
          "mainSeriesProperties.candleStyle.wickUpColor": "#4ade80",
          "mainSeriesProperties.candleStyle.wickDownColor": "#f87171",
          "mainSeriesProperties.candleStyle.borderUpColor": "#16a34a",
          "mainSeriesProperties.candleStyle.borderDownColor": "#dc2626",
          "mainSeriesProperties.candleStyle.drawBorder": true,
          "mainSeriesProperties.candleStyle.drawWick": true,
          "mainSeriesProperties.candleStyle.barColorsOnPrevClose": false,
          "mainSeriesProperties.lineStyle.color": "#68b4bc",
          "mainSeriesProperties.lineStyle.linewidth": 2,
          "mainSeriesProperties.areaStyle.color1": "rgba(104,180,188,0.4)",
          "mainSeriesProperties.areaStyle.color2": "rgba(104,180,188,0.02)",
          "mainSeriesProperties.areaStyle.linecolor": "#68b4bc",
          "mainSeriesProperties.areaStyle.linewidth": 2,
          "mainSeriesProperties.hollowCandleStyle.upColor": "#22c55e",
          "mainSeriesProperties.hollowCandleStyle.downColor": "#ef4444",
          "mainSeriesProperties.hollowCandleStyle.drawBorder": true,
          "mainSeriesProperties.hollowCandleStyle.borderUpColor": "#22c55e",
          "mainSeriesProperties.hollowCandleStyle.borderDownColor": "#ef4444",
          "mainSeriesProperties.hollowCandleStyle.drawWick": true,
          "mainSeriesProperties.hollowCandleStyle.wickUpColor": "#4ade80",
          "mainSeriesProperties.hollowCandleStyle.wickDownColor": "#f87171",
          "mainSeriesProperties.barStyle.upColor": "#22c55e",
          "mainSeriesProperties.barStyle.downColor": "#ef4444",
        },
        studies_overrides: {
          "volume.volume.color.0": "#ef444480",
          "volume.volume.color.1": "#22c55e80",
        },
        onChartReady: () => {
          console.log('TradingView chart ready');
          try {
            widget.activeChart().executeActionById("maximizeChart");
          } catch (e) {
            console.log('maximizeChart not available');
          }
          try {
            const chart = widget.activeChart();
            const priceScale = chart.getPanes()[0].getRightPriceScales()[0];
            priceScale.setMode(0);
            chart.applyOverrides({
              "scalesProperties.showSeriesLastValue": true,
              "scalesProperties.showStudyLastValue": true,
            });
          } catch (e) {
            console.log('Price scale config not available');
          }
        }
      });
    } catch (e) {
      console.error('TradingView init error:', e);
    }
  };

  // Load widget when symbol, timeframe, or display options change
  useEffect(() => {
    loadTradingViewWidget();
  }, [currentSymbol, timeframe, displayOptions, darkTheme]);

  // WebSocket for real-time Binance prices (optional price ticker)
  useEffect(() => {
    if (!onPriceUpdate) return;
    const symbol = currentSymbol;
    let ws: WebSocket | null = null;
    let isMounted = true;
    let messageReceived = false;
    let fallbackInterval: number | null = null;
    let fallbackTimer: number | null = null;

    const deriveStreamSymbol = (sym: string) => {
      // Strip exchange prefix if present
      const bare = sym.includes(':') ? sym.split(':')[1] : sym;
      const upper = bare.toUpperCase();
      const cryptoBases = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE', 'TON', 'DOT', 'MATIC', 'LTC', 'LINK', 'AVAX', 'TRX', 'BCH'];
      const base = cryptoBases.find(t => upper.startsWith(t));
      if (base) return `${base}USDT`;
      return upper;
    };

    const startFallback = () => {
      if (!onPriceUpdate || fallbackInterval) return;
      console.log(`⚠️ No Binance data for ${symbol}. Starting simulated realtime fallback.`);
      const bare = symbol.includes(':') ? symbol.split(':')[1] : symbol;
      const basePrice = bare.includes('BTC') ? 95247.50 : bare.includes('EUR') ? 1.0856 : bare.includes('GBP') ? 1.2734 : bare.includes('XAU') ? 2687.45 : bare.includes('JPY') ? 154.23 : bare.includes('ETH') ? 3421.67 : bare.includes('XAG') ? 31.45 : 1.0000;
      const decimals = bare.includes('JPY') ? 2 : 4;
      const tick = () => {
        const variation = (Math.random() - 0.5) * 0.004;
        onPriceUpdate((basePrice * (1 + variation)).toFixed(decimals));
      };
      tick();
      fallbackInterval = window.setInterval(tick, 2000);
    };

    const connectWebSocket = () => {
      if (ws) ws.close();
      const streamSymbol = deriveStreamSymbol(symbol);
      const url = `wss://stream.binance.com:9443/ws/${streamSymbol.toLowerCase()}@ticker`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        if (isMounted) {
          fallbackTimer = window.setTimeout(() => {
            if (!messageReceived) startFallback();
          }, 5000);
        }
      };
      ws.onmessage = event => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data && data.s && data.c) {
            messageReceived = true;
            if (fallbackInterval) { clearInterval(fallbackInterval); fallbackInterval = null; }
            const price = parseFloat(data.c);
            const streamSymbol2 = deriveStreamSymbol(symbol);
            const decimals = streamSymbol2.includes('JPY') ? 2 : streamSymbol2.startsWith('BTC') ? 2 : 4;
            onPriceUpdate(price.toFixed(decimals));
          }
        } catch (error) {
          console.error('Error parsing Binance price data:', error);
        }
      };
      ws.onclose = () => {
        if (isMounted) {
          setTimeout(() => { if (isMounted) connectWebSocket(); }, 3000);
        }
      };
      ws.onerror = () => {};
    };

    connectWebSocket();
    return () => {
      isMounted = false;
      if (ws) ws.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [currentSymbol, onPriceUpdate]);

  // Derive a display label from the symbol
  const displayLabel = currentSymbol.includes(':') ? currentSymbol.split(':')[1] : currentSymbol;

  return (
    <div className={`w-full h-full flex flex-col overflow-hidden rounded-2xl ${className}`}>
      <div className="relative w-full flex-1 min-h-[300px] overflow-hidden rounded-2xl">
        <div
          ref={chartContainerRef}
          className="absolute inset-0 [&_iframe]:!m-0 [&_iframe]:!p-0 [&_iframe]:!border-0 [&>div]:!m-0 [&>div]:!p-0"
        />
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium text-white/90">
          <span>{displayLabel}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">{timeframe.toUpperCase()}</span>
        </div>
        <Button
          variant="secondary"
          size="icon"
          onClick={loadTradingViewWidget}
          className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full shadow-md opacity-70 hover:opacity-100 transition-opacity"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.selectedSymbol === nextProps.selectedSymbol &&
         prevProps.timeframe === nextProps.timeframe &&
         prevProps.displayOptions === nextProps.displayOptions;
});

export { TradingViewWidget };
