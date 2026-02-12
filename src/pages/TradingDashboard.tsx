import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Activity, Zap, ArrowRight, Globe, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CandlestickChart } from "@/components/CandlestickChart";
import { BubbleSystem } from "@/components/BubbleSystem";
import Layout from "@/components/Layout";
import { HybridSearchBar } from "@/components/HybridSearchBar";
import { AssetSummaryBanner } from "@/components/AssetSummaryBanner";
import { DashboardColumnCarousel } from "@/components/DashboardColumnCarousel";
import { getSymbolForAsset, getNormalizedSymbol } from "@/lib/assetMapping";
import AssetInfoCard from "@/components/AssetInfoCard";
import { JobStatusCard } from "@/components/JobStatusCard";
import { useJobStatusManager } from "@/hooks/useJobStatusManager";
import { useTranslation } from "react-i18next";
import { MarketNewsCollapsible } from "@/components/MarketNewsCollapsible";
import { MobileNewsBadge } from "@/components/MobileNewsBadge";
import { MobileNewsModal } from "@/components/MobileNewsModal";

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

// PERF: Moved outside component to prevent recreation on every render
const ALL_ASSETS = [
  // G10 Forex (principales paires)
  { symbol: "EUR/USD", name: "Euro / US Dollar", icon: "💱" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", icon: "💱" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", icon: "💱" },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", icon: "💱" },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", icon: "💱" },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", icon: "💱" },

  // Crypto majeures
  { symbol: "Bitcoin", name: "Bitcoin", icon: "₿" },
  { symbol: "Ethereum", name: "Ethereum", icon: "Ξ" },
  { symbol: "ADA-USD", name: "Cardano", icon: "🔷" },
  { symbol: "SOL-USD", name: "Solana", icon: "🌞" },
  { symbol: "DOGE-USD", name: "Dogecoin", icon: "🐕" },

  // Commodités principales
  { symbol: "GOLD", name: "Gold", icon: "🥇" },
  { symbol: "SILVER", name: "Silver", icon: "🥈" },
  { symbol: "CRUDE", name: "Crude Oil", icon: "🛢️" },
  { symbol: "NATGAS", name: "Natural Gas", icon: "🔥" },
  { symbol: "COPPER", name: "Copper", icon: "🟤" },
  { symbol: "PLATINUM", name: "Platinum", icon: "⚪" }
];

export default function TradingDashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const jobManager = useJobStatusManager();

  // Read session-based chart mode for super users (default: tradingview)
  const [sessionChartMode, setSessionChartMode] = useState<'tradingview' | 'light'>(() => {
    const stored = sessionStorage.getItem('dashboard_chart_mode');
    return (stored === 'light' || stored === 'tradingview') ? stored : 'tradingview';
  });

  // Refs and state for height synchronization
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState<number | undefined>(undefined);

  const [selectedAsset, setSelectedAsset] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("4h");
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTradeLevels, setActiveTradeLevels] = useState<{
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
  } | null>(null);

  // Selected asset from search bar
  const [selectedAssetProfile, setSelectedAssetProfile] = useState<any>(null);

  // Mobile news drawer state
  const [isMobileNewsOpen, setIsMobileNewsOpen] = useState(false);

  // Handle asset profile selection and synchronize with chart
  const handleAssetProfileSelect = (asset: any) => {
    setSelectedAssetProfile(asset);
    // Normalize the symbol for chart and WebSocket
    const normalizedSymbol = getNormalizedSymbol(asset.symbol);
    setSelectedAsset(normalizedSymbol);
  };

  // FIX: [2025-10-24] Eliminate duplicate TwelveData WebSocket connection
  // LightweightChartWidget is the single consumer for TwelveData assets
  // This effect only handles Binance WS for non-TwelveData instruments
  useEffect(() => {
    let ws: WebSocket;
    let isMounted = true;
    let fallbackInterval: NodeJS.Timeout | null = null;

    // Map to TwelveData symbols
    const TWELVE_DATA_INSTRUMENTS: Record<string, string> = {
      'EUR/USD': 'EUR/USD',
      'GBP/USD': 'GBP/USD',
      'BTC/USD': 'BTC/USD',
      'ETH/USD': 'ETH/USD',
      'GOLD': 'XAU/USD',
      'SILVER': 'XAG/USD',
    };

    const useTwelveData = Object.keys(TWELVE_DATA_INSTRUMENTS).includes(selectedAsset);

    const connectWebSocket = () => {
      // Clean up previous connection
      if (ws) {
        ws.close();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }

      if (useTwelveData) {
        // ✅ FIX: Do NOT open TwelveData WS here - let LightweightChartWidget handle it
        // Price updates will come via CandlestickChart -> onPriceUpdate callback
        console.log(`ℹ️ TwelveData asset ${selectedAsset} - delegating WS to chart component`);
        setPriceData(null);
        setIsConnected(false); // Will be set to true by chart's onPriceUpdate
        return;
      } else {
        // Binance WebSocket for all other instruments (no changes)
        const symbol = getSymbolForAsset(selectedAsset);
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`);

        ws.onopen = () => {
          if (isMounted) {
            setIsConnected(true);
            console.log(`✅ Connected to ${selectedAsset} price feed (source: Binance)`);
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const data = JSON.parse(event.data);
            if (data.s === symbol) {
              setPriceData({
                symbol: selectedAsset,
                price: parseFloat(data.c),
                change24h: parseFloat(data.P),
                volume: parseFloat(data.v)
              });
            }
          } catch (error) {
            console.error('Error parsing price data:', error);
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsConnected(false);
            console.log(`Disconnected from ${selectedAsset} price feed`);
            setTimeout(() => {
              if (isMounted && symbol === getSymbolForAsset(selectedAsset)) {
                connectWebSocket();
              }
            }, 3000);
          }
        };

        ws.onerror = () => {
          if (isMounted) {
            setIsConnected(false);
          }
        };
      }
    };

    // Reset price data when asset changes
    setPriceData(null);
    connectWebSocket();

    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [selectedAsset]);

  const currentAsset = ALL_ASSETS.find(asset => asset.symbol === selectedAsset);

  // Set first asset as default when assets are loaded
  useEffect(() => {
    if (ALL_ASSETS.length > 0 && !currentAsset) {
      setSelectedAsset(ALL_ASSETS[0].symbol);
    }
  }, [currentAsset]);

  // Measure Trading Dashboard height and sync to Market News
  useEffect(() => {
    if (!chartRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        // Only apply on desktop (lg+)
        if (window.matchMedia('(min-width: 1024px)').matches) {
          setChartHeight(height);
        } else {
          setChartHeight(undefined);
        }
      }
    });

    observer.observe(chartRef.current);

    // Listen for breakpoint changes
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleBreakpoint = () => {
      if (!mediaQuery.matches) {
        setChartHeight(undefined);
      } else if (chartRef.current) {
        setChartHeight(chartRef.current.offsetHeight);
      }
    };

    mediaQuery.addEventListener('change', handleBreakpoint);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleBreakpoint);
    };
  }, []);

  return (
    <Layout
      fillViewport
      activeModule="trading"
      onModuleChange={() => { }}
      completedJobsCount={jobManager.completedJobsCount}
      onResetJobsCount={jobManager.resetCompletedCount}
      activeJobsCount={jobManager.activeJobs.filter(job => job.status === 'pending' || job.status === 'running').length}
    >

      {/* Main viewport-locked content */}
      <div className="space-y-2 md:h-full md:overflow-hidden md:flex md:flex-col">
        {/* Row 1: Chart + Nav Cards */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] lg:grid-cols-[2fr_1fr] gap-2 items-stretch md:flex-1 md:min-h-0">
          {/* Col gauche - Rangée 1 : Trading Dashboard */}
          <div ref={chartRef} className="min-w-0 min-h-0 order-1 my-0 h-full overflow-hidden md:min-h-[500px]">
            <CandlestickChart
              forceMode={sessionChartMode}
              asset={selectedAssetProfile ? selectedAssetProfile.symbol : selectedAsset}
              showHeader={true}
              height={350}
              tradeLevels={activeTradeLevels}
              onLevelUpdate={(type, value) => {
                if (activeTradeLevels) {
                  setActiveTradeLevels({
                    ...activeTradeLevels,
                    [type === 'stopLoss' ? 'stopLoss' : type]: value
                  });
                }
              }}
              dashboardTitle={t('dashboard:trading.title')}
              dashboardSubtitle={t('dashboard:trading.subtitle')}
              priceData={priceData}
              isConnected={isConnected}
              allAssets={ALL_ASSETS}
              selectedAsset={selectedAsset}
              currentAsset={currentAsset}
              onAssetSelect={setSelectedAsset}
              selectedAssetProfile={selectedAssetProfile}
              onAssetProfileSelect={handleAssetProfileSelect}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
          </div>

          {/* Col droite - Rangée 1 : Navigation Cards Vertical Stack */}
          <DashboardColumnCarousel className="min-w-0 min-h-0 order-2 my-0 hidden md:flex h-full" />

          {/* Mobile Navigation Cards - visible only on mobile (<768px) */}
          <div className="md:hidden mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* AI Trade Setup */}
              <Card
                className="gradient-card border-primary/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all touch-manipulation"
                onClick={() => navigate('/trade-generator')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="gradient-primary p-2 rounded-xl shrink-0">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">{t('dashboard:trading.aiTradeSetup')}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{t('dashboard:trading.intelligentTradeSetups')}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                </CardContent>
              </Card>

              {/* Macro Commentary */}
              <Card
                className="gradient-card border-primary/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all touch-manipulation"
                onClick={() => navigate('/macro-lab')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="gradient-primary p-2 rounded-xl shrink-0">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">{t('dashboard:trading.macroCommentary')}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{t('dashboard:trading.inDepthAnalysis')}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                </CardContent>
              </Card>

              {/* Reports */}
              <Card
                className="gradient-card border-primary/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all touch-manipulation"
                onClick={() => navigate('/reports')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="gradient-primary p-2 rounded-xl shrink-0">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">{t('dashboard:trading.reports')}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{t('dashboard:trading.comprehensiveReports')}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Row 2: Asset Info */}
        <AssetInfoCard
          symbol={selectedAssetProfile ? selectedAssetProfile.symbol : selectedAsset}
          className="w-full md:hidden"
        />

        {/* Row 3: Market News - below the fold, scroll to see */}
        <MarketNewsCollapsible className="w-full md:hidden" />
      </div>

      {/* SECTION 3: Normal width - Navigation Cards, Job Status */}
      <div className="space-y-4 sm:space-y-6">
        {/* Navigation Cards */}


        {/* Job Status Card */}
        {jobManager.activeJobs.length > 0 && (
          <JobStatusCard
            jobs={jobManager.activeJobs}
            onViewResult={(job) => {
              // Navigate to appropriate result page based on job type
              switch (job.type) {
                case 'ai_setup':
                  navigate('/history');
                  break;
                case 'macro_commentary':
                  navigate('/macro-analysis');
                  break;
                case 'report':
                  navigate(`/reports?jobId=${job.id}`);
                  break;
              }
            }}
            onDismiss={jobManager.removeJob}
          />
        )}
      </div>

      {/* Floating bubble system */}
      <BubbleSystem
        instrument={selectedAsset}
        timeframe={timeframe}
        onTradeSetupClick={() => { }}
        onTradeLevelsUpdate={(levels) => {
          setActiveTradeLevels(levels);
        }}
      />

      {/* Mobile News Badge - tablet only (hidden on mobile <768px) */}
      <div className="hidden md:block">
        <MobileNewsBadge
          onClick={() => setIsMobileNewsOpen(true)}
          hasNewItems={false}
        />
      </div>

      {/* Mobile News Modal - centered overlay */}
      <MobileNewsModal
        isOpen={isMobileNewsOpen}
        onClose={() => setIsMobileNewsOpen(false)}
      >
        <MarketNewsCollapsible className="h-full" />
      </MobileNewsModal>
    </Layout>
  );
}