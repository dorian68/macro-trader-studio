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
import { NewsFeedPanel } from "@/components/NewsFeedPanel";

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
      <div className="space-y-4 sm:space-y-6 overflow-x-hidden scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Mobile-first header with real-time price */}
        <div className="space-y-4">
          {/* Title section - Mobile optimized */}
          <div className="flex items-center gap-3">
            <div className="gradient-primary p-2 sm:p-3 rounded-xl shadow-glow-primary shrink-0">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight break-words">
                {t('dashboard:trading.title')}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground break-words">
                {t('dashboard:trading.subtitle')}
              </p>
            </div>
          </div>

          {/* Price widget - Affiche uniquement l'actif sélectionné */}
          {(selectedAssetProfile || (priceData && priceData.symbol === selectedAsset)) && (
            <Card className="gradient-card border-primary/20 shadow-glow-primary w-full">
              <CardContent className="p-4">
                {selectedAssetProfile ? (
                  // Display selected asset from search (priority)
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {selectedAssetProfile.symbol?.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-lg">{selectedAssetProfile.symbol}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedAssetProfile.short_name || selectedAssetProfile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedAssetProfile.sector} • {selectedAssetProfile.exchange}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/asset/${selectedAssetProfile.symbol}`)}
                        className="shrink-0"
                      >
                        {t('common:actions.viewDetails')}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => setSelectedAssetProfile(null)}
                        className="shrink-0"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Affichage par défaut avec données temps réel
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-lg">{selectedAsset}</h3>
                        <p className="text-xs text-muted-foreground truncate">{currentAsset?.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end sm:text-right gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl sm:text-2xl font-bold text-foreground font-mono">
                          ${priceData?.price.toFixed(selectedAsset.includes('JPY') ? 2 : 4)}
                        </span>
                        <div className={cn(
                          "w-2 h-2 rounded-full animate-pulse shrink-0",
                          isConnected ? "bg-success" : "bg-danger"
                        )} />
                      </div>
                      {priceData && (
                        <div className={cn(
                          "flex items-center gap-1 text-sm font-medium",
                          priceData.change24h >= 0 ? "text-success" : "text-danger"
                        )}>
                          {priceData.change24h >= 0 ? 
                            <TrendingUp className="h-3 w-3" /> : 
                            <TrendingDown className="h-3 w-3" />
                          }
                          {priceData.change24h >= 0 ? '+' : ''}{priceData.change24h.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        {/* Hybrid Search + AI Interface */}
        <HybridSearchBar
          assets={allAssets}
          selectedAsset={selectedAsset}
          onAssetSelect={setSelectedAsset}
          onAssetProfileSelect={handleAssetProfileSelect}
          instrument={selectedAsset}
          timeframe={timeframe}
        />


        {/* Popular assets - Mobile-first horizontal scroll */}
        <div className="w-full -mx-2 sm:mx-0">
          <div className="flex gap-2 overflow-x-auto pb-2 px-2 sm:px-0 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {allAssets.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset.symbol)}
                className={cn(
                  "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-smooth flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 snap-start min-w-fit touch-manipulation",
                  selectedAsset === asset.symbol
                    ? "bg-primary text-primary-foreground shadow-glow-primary"
                    : "bg-card/50 hover:bg-primary/10 text-foreground border border-border/30"
                )}
                style={{ minHeight: '44px' }}
                >
                <span className="font-semibold">{asset.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Asset Information Card - Moved before chart to prevent overlap */}
        <AssetInfoCard 
          symbol={selectedAssetProfile ? selectedAssetProfile.symbol : selectedAsset} 
          className="w-full" 
        />
      </div>

      {/* Market Chart - Full Width Section - Outside constrained container */}
      <section aria-label="Market chart" className="relative left-1/2 -translate-x-1/2 w-screen px-4 sm:px-6 lg:px-0 my-6">
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
        />
      </section>

      <div className="space-y-4 sm:space-y-6">


        {/* Navigation Cards */}
        <section aria-label="Quick navigation" className="mt-16 md:mt-24">
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
      </div>

      {/* Job Status Card */}
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

      {/* Floating bubble system */}
      <BubbleSystem 
        instrument={selectedAsset} 
        timeframe={timeframe} 
        onTradeSetupClick={() => {}}
        onTradeLevelsUpdate={(levels) => {
          setActiveTradeLevels(levels);
        }}
      />
      
      {/* News Feed Panel */}
      <NewsFeedPanel />
    </Layout>
  );
}