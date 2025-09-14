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
import { getSymbolForAsset } from "@/lib/assetMapping";
import AssetInfoCard from "@/components/AssetInfoCard";
import { JobStatusCard } from "@/components/JobStatusCard";
import { useJobStatusManager } from "@/hooks/useJobStatusManager";

// Popular assets with their categories
const assetCategories = {
  forex: [
    { symbol: "EUR/USD", name: "Euro / US Dollar", icon: "💶" },
    { symbol: "GBP/USD", name: "British Pound / US Dollar", icon: "💷" },
    { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", icon: "💴" },
  ],
  crypto: [
    { symbol: "BTC", name: "Bitcoin", icon: "₿" },
    { symbol: "ETH", name: "Ethereum", icon: "Ξ" },
  ],
  commodities: [
    { symbol: "GOLD", name: "Gold", icon: "🥇" },
    { symbol: "SILVER", name: "Silver", icon: "🥈" },
    { symbol: "CRUDE", name: "Crude Oil", icon: "🛢️" },
  ]
};

const allAssets = [
  ...assetCategories.forex,
  ...assetCategories.crypto,
  ...assetCategories.commodities
];

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

export default function TradingDashboard() {
  const navigate = useNavigate();
  const jobManager = useJobStatusManager();
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

  // WebSocket for real-time prices - Fixed synchronization
  useEffect(() => {
    const symbol = getSymbolForAsset(selectedAsset);
    let ws: WebSocket;
    let isMounted = true;

    const connectWebSocket = () => {
      // Clean up previous connection
      if (ws) {
        ws.close();
      }

      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`);
      
      ws.onopen = () => {
        if (isMounted) {
          setIsConnected(true);
          console.log(`Connected to ${selectedAsset} (${symbol}) price feed`);
        }
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        
        try {
          const data = JSON.parse(event.data);
          // Verify the symbol matches current selection
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
          // Only reconnect if still mounted and same asset
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
    };

    // Reset price data when asset changes
    setPriceData(null);
    connectWebSocket();

    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
    };
  }, [selectedAsset]); // Only depend on selectedAsset

  const currentAsset = allAssets.find(asset => asset.symbol === selectedAsset);

  return (
    <Layout 
      activeModule="trading" 
      onModuleChange={() => {}}
      completedJobsCount={jobManager.completedJobsCount}
      onResetJobsCount={jobManager.resetCompletedCount}
    >
      <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Mobile-first header with real-time price */}
        <div className="space-y-4">
          {/* Title section - Mobile optimized */}
          <div className="flex items-center gap-3">
            <div className="gradient-primary p-2 sm:p-3 rounded-xl shadow-glow-primary shrink-0">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight break-words">
                Trading Dashboard
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground break-words">
                Real-time AI analysis and trade execution
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
                        View Details
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
                      <span className="text-2xl shrink-0">{currentAsset?.icon}</span>
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
          onAssetProfileSelect={setSelectedAssetProfile}
          instrument={selectedAsset}
          timeframe={timeframe}
        />


        {/* Popular assets - Mobile-first horizontal scroll */}
        <div className="w-full -mx-3 sm:mx-0">
          <div className="flex gap-2 overflow-x-auto pb-2 px-3 sm:px-0 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {allAssets.slice(0, 6).map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset.symbol)}
                className={cn(
                  "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-smooth flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 snap-start min-w-fit",
                  selectedAsset === asset.symbol
                    ? "bg-primary text-primary-foreground shadow-glow-primary"
                    : "bg-card/50 hover:bg-primary/10 text-foreground border border-border/30"
                )}
              >
                <span className="text-sm sm:text-base">{asset.icon}</span>
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

        {/* Unified chart section - No nesting */}
        <div className="h-[280px] xs:h-[320px] sm:h-[400px] md:h-[500px] lg:h-[600px]">
          <CandlestickChart 
            asset={selectedAssetProfile ? selectedAssetProfile.symbol : selectedAsset}
            showHeader={true}
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
        </div>


        {/* Test Job Status - Development only */}
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => {
              const jobId = jobManager.addJob({
                type: 'ai_setup',
                status: 'running',
                title: 'Analyzing EUR/USD trade setup...'
              });
              
              // Simulate job completion after 3 seconds
              setTimeout(() => {
                jobManager.updateJob(jobId, {
                  status: 'completed',
                  result: { analysis: 'BUY signal detected' }
                });
              }, 3000);
            }}
            className="flex items-center gap-2"
          >
            🧪 Test Job Status
          </Button>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card 
            className="gradient-card border-primary/20 shadow-glow-primary cursor-pointer hover:scale-105 transition-smooth" 
            onClick={() => navigate('/ai-setup')}
          >
            <CardContent className="p-6 text-center">
              <div className="gradient-primary p-3 rounded-xl shadow-glow-primary mx-auto w-fit mb-4">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">AI Trade Setup</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate intelligent trade setups with AI-powered analysis
              </p>
              <Button size="sm" className="w-full">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="gradient-card border-primary/20 shadow-glow-primary cursor-pointer hover:scale-105 transition-smooth" 
            onClick={() => navigate('/macro-analysis')}
          >
            <CardContent className="p-6 text-center">
              <div className="gradient-primary p-3 rounded-xl shadow-glow-primary mx-auto w-fit mb-4">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Macro Commentary</h3>
              <p className="text-sm text-muted-foreground mb-4">
                In-depth macroeconomic analysis and market insights
              </p>
              <Button size="sm" className="w-full">
                Explore
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="gradient-card border-primary/20 shadow-glow-primary cursor-pointer hover:scale-105 transition-smooth" 
            onClick={() => navigate('/reports')}
          >
            <CardContent className="p-6 text-center">
              <div className="gradient-primary p-3 rounded-xl shadow-glow-primary mx-auto w-fit mb-4">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Reports</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate comprehensive market reports and analysis
              </p>
              <Button size="sm" className="w-full">
                Create Report
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

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
              navigate('/reports');
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
    </Layout>
  );
}