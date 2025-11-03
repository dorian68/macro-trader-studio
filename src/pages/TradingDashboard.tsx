import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Activity, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CandlestickChart } from "@/components/CandlestickChart";
import { BubbleSystem } from "@/components/BubbleSystem";
import Layout from "@/components/Layout";
import { HybridSearchBar } from "@/components/HybridSearchBar";
import { AssetSummaryBanner } from "@/components/AssetSummaryBanner";
import { getSymbolForAsset, getNormalizedSymbol } from "@/lib/assetMapping";
import AssetInfoCard from "@/components/AssetInfoCard";
import { JobStatusCard } from "@/components/JobStatusCard";
import { useJobStatusManager } from "@/hooks/useJobStatusManager";
import { useTranslation } from "react-i18next";
import { MarketNewsCollapsible } from "@/components/MarketNewsCollapsible";

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

export default function TradingDashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const jobManager = useJobStatusManager();
  
  // Hardcoded list of major assets compatible with Binance and TradingView
  const allAssets = [
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
    const twelveDataInstruments: Record<string, string> = {
      'EUR/USD': 'EUR/USD',
      'GBP/USD': 'GBP/USD',
      'BTC/USD': 'BTC/USD',
      'ETH/USD': 'ETH/USD',
      'GOLD': 'XAU/USD',
      'SILVER': 'XAG/USD',
    };

    const useTwelveData = Object.keys(twelveDataInstruments).includes(selectedAsset);

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

  const currentAsset = allAssets.find(asset => asset.symbol === selectedAsset);

  // Set first asset as default when assets are loaded
  useEffect(() => {
    if (allAssets.length > 0 && !currentAsset) {
      setSelectedAsset(allAssets[0].symbol);
    }
  }, [allAssets, currentAsset]);

  return (
    <Layout
        activeModule="trading"
      onModuleChange={() => {}}
      completedJobsCount={jobManager.completedJobsCount}
      onResetJobsCount={jobManager.resetCompletedCount}
      activeJobsCount={jobManager.activeJobs.filter(job => job.status === 'pending' || job.status === 'running').length}
    >

      {/* SECTION 2: Full-width row with Chart (2/3) + Market News (1/3) */}
      <section 
        aria-label="Market chart and news" 
        className="relative left-1/2 -translate-x-1/2 w-screen px-4 sm:px-6 lg:px-8 my-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-stretch max-w-[1920px] mx-auto">
          {/* Chart with integrated dashboard header - 2/3 */}
          <div className="min-w-0 space-y-4">
            <CandlestickChart 
              asset={selectedAssetProfile ? selectedAssetProfile.symbol : selectedAsset}
              showHeader={true}
              height={500}
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
              allAssets={allAssets}
              selectedAsset={selectedAsset}
              currentAsset={currentAsset}
              onAssetSelect={setSelectedAsset}
              selectedAssetProfile={selectedAssetProfile}
              onAssetProfileSelect={handleAssetProfileSelect}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
            
            {/* Asset Info Card moved here */}
            <AssetInfoCard 
              symbol={selectedAssetProfile ? selectedAssetProfile.symbol : selectedAsset} 
              className="w-full" 
            />
          </div>
          
          {/* Market News - 1/3 */}
          <div className="lg:sticky lg:top-6 lg:self-stretch">
            <MarketNewsCollapsible />
          </div>
        </div>
      </section>

      {/* SECTION 3: Normal width - Navigation Cards, Job Status */}
      <div className="space-y-4 sm:space-y-6">
        {/* Navigation Cards */}
        <section aria-label="Quick navigation" className="mt-8 md:mt-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card 
              className="gradient-card border-primary/20 shadow-glow-primary cursor-pointer hover:scale-105 transition-smooth touch-manipulation overflow-hidden" 
              onClick={() => navigate('/ai-setup')}
              style={{ minHeight: '44px' }}
            >
              <CardContent className="p-6 text-center">
                <div className="gradient-primary p-3 rounded-xl shadow-glow-primary mx-auto w-fit mb-4">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('dashboard:trading.aiTradeSetup')}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {t('dashboard:trading.intelligentTradeSetups')}
                </p>
                <Button size="sm" className="w-full touch-manipulation" style={{ minHeight: '44px' }}>
                  {t('dashboard:getStarted')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="gradient-card border-primary/20 shadow-glow-primary cursor-pointer hover:scale-105 transition-smooth touch-manipulation overflow-hidden" 
              onClick={() => navigate('/macro-analysis')}
              style={{ minHeight: '44px' }}
            >
              <CardContent className="p-6 text-center">
                <div className="gradient-primary p-3 rounded-xl shadow-glow-primary mx-auto w-fit mb-4">
                  <Activity className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('dashboard:trading.macroCommentary')}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {t('dashboard:trading.inDepthAnalysis')}
                </p>
                <Button size="sm" className="w-full touch-manipulation" style={{ minHeight: '44px' }}>
                  {t('common:actions.explore')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="gradient-card border-primary/20 shadow-glow-primary cursor-pointer hover:scale-105 transition-smooth touch-manipulation overflow-hidden" 
              onClick={() => navigate('/reports')}
              style={{ minHeight: '44px' }}
            >
              <CardContent className="p-6 text-center">
                <div className="gradient-primary p-3 rounded-xl shadow-glow-primary mx-auto w-fit mb-4">
                  <Activity className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('dashboard:trading.reports')}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {t('dashboard:trading.comprehensiveReports')}
                </p>
                <Button size="sm" className="w-full touch-manipulation" style={{ minHeight: '44px' }}>
                  {t('common:actions.explore')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

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
        onTradeSetupClick={() => {}}
        onTradeLevelsUpdate={(levels) => {
          setActiveTradeLevels(levels);
        }}
      />
    </Layout>
  );
}