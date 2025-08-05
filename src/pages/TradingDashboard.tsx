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
import { Layout } from "@/components/Layout";
import { HybridSearchBar } from "@/components/HybridSearchBar";
import { AssetSummaryBanner } from "@/components/AssetSummaryBanner";
import { getSymbolForAsset } from "@/lib/assetMapping";
import AssetInfoCard from "@/components/AssetInfoCard";

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
    <Layout activeModule="trading" onModuleChange={() => {}}>
      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
        {/* Mobile-first header with real-time price */}
        <div className="space-y-3 sm:space-y-4">
          {/* Title section - Mobile optimized */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="gradient-primary p-2 sm:p-3 rounded-xl shadow-glow-primary shrink-0">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-foreground tracking-tight">
                Trading Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                Real-time AI analysis and trade execution
              </p>
            </div>
          </div>

          {/* Price widget - Mobile responsive avec vérification */}
          {priceData && priceData.symbol === selectedAsset && (
            <Card className="gradient-card border-primary/20 shadow-glow-primary w-full">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Asset info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{currentAsset?.icon}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground text-lg">{selectedAsset}</h3>
                      <p className="text-xs text-muted-foreground truncate">{currentAsset?.name}</p>
                    </div>
                  </div>
                  
                  {/* Price and change */}
                  <div className="flex items-center justify-between sm:justify-end sm:text-right gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl font-bold text-foreground font-mono">
                        ${priceData.price.toFixed(selectedAsset.includes('JPY') ? 2 : 4)}
                      </span>
                      <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse shrink-0",
                        isConnected ? "bg-success" : "bg-danger"
                      )} />
                    </div>
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
                  </div>
                </div>

                {/* Asset Summary Banner intégrée - Couche 2 */}
                {selectedAssetProfile && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {selectedAssetProfile.symbol?.slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-foreground text-sm">{selectedAssetProfile.short_name || selectedAssetProfile.name}</h4>
                          <p className="text-xs text-muted-foreground">{selectedAssetProfile.sector} • {selectedAssetProfile.exchange}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/asset/${selectedAssetProfile.symbol}`)}
                        className="shrink-0"
                      >
                        Voir détails
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Asset Information Card */}
          <AssetInfoCard symbol={selectedAsset} className="w-full" />
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

        {/* Mobile-first responsive chart */}
        <Card className="gradient-card border-border/50 shadow-medium">
          <CardHeader className="border-b border-border/50 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg sm:text-xl text-foreground">
                Chart - {selectedAsset}
                <span className="text-sm font-normal text-muted-foreground ml-2">({timeframe})</span>
              </CardTitle>
              <Badge variant="outline" className={cn(
                "border-success/50 text-success bg-success/10 w-fit",
                !isConnected && "border-danger/50 text-danger bg-danger/10"
              )}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Dynamic height based on screen size */}
            <div className="h-[280px] xs:h-[320px] sm:h-[400px] md:h-[500px] lg:h-[600px]">
              <CandlestickChart 
                asset={selectedAsset} 
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
          </CardContent>
        </Card>

        {/* Mobile-first Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card 
            onClick={() => navigate('/ai-setup')}
            className="gradient-card border-border/50 hover:shadow-glow-primary transition-smooth cursor-pointer group active:scale-95"
          >
            <CardContent className="p-5 text-center">
              <div className="gradient-primary p-3 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-smooth">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-base text-foreground mb-2">AI Trade Setup</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Analyze market conditions and find trading opportunities</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate('/macro-analysis')}
            className="gradient-card border-border/50 hover:shadow-glow-success transition-smooth cursor-pointer group active:scale-95"
          >
            <CardContent className="p-5 text-center">
              <div className="gradient-success p-3 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-smooth">
                <Activity className="h-6 w-6 text-success-foreground" />
              </div>
              <h3 className="font-semibold text-base text-foreground mb-2">Macro Analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Get comprehensive market commentary and insights</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate('/reports')}
            className="gradient-card border-border/50 hover:shadow-medium transition-smooth cursor-pointer group active:scale-95 sm:col-span-2 lg:col-span-1"
          >
            <CardContent className="p-5 text-center">
              <div className="bg-warning/20 border border-warning/30 p-3 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-smooth">
                <ArrowRight className="h-6 w-6 text-warning" />
              </div>
              <h3 className="font-semibold text-base text-foreground mb-2">Performance Reports</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">View detailed trading performance and analytics</p>
            </CardContent>
          </Card>
        </div>
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