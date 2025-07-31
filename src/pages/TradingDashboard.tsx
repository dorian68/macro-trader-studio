import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Activity, Zap, ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CandlestickChart } from "@/components/CandlestickChart";
import { BubbleSystem } from "@/components/BubbleSystem";
import { Layout } from "@/components/Layout";
import { AIQueryInterface } from "@/components/AIQueryInterface";
import { getSymbolForAsset } from "@/lib/assetMapping";

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
  const [searchTerm, setSearchTerm] = useState("");

  // WebSocket for real-time prices
  useEffect(() => {
    const symbol = getSymbolForAsset(selectedAsset);
    let ws: WebSocket;

    const connectWebSocket = () => {
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log(`Connected to ${symbol} price feed`);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setPriceData({
          symbol: selectedAsset,
          price: parseFloat(data.c),
          change24h: parseFloat(data.P),
          volume: parseFloat(data.v)
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [selectedAsset]);

  const filteredAssets = allAssets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentAsset = allAssets.find(asset => asset.symbol === selectedAsset);

  return (
    <Layout activeModule="trading" onModuleChange={() => {}}>
      <div className="space-y-4 md:space-y-6 px-2 sm:px-0">
        {/* Modern header with real-time price */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="gradient-primary p-2 md:p-3 rounded-lg md:rounded-xl shadow-glow-primary">
                <Activity className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Trading Dashboard</h1>
                <p className="text-sm md:text-base text-muted-foreground hidden sm:block">Real-time AI analysis and trade execution</p>
              </div>
            </div>
          </div>

          {/* Real-time price - Top right corner */}
          {priceData && (
            <Card className="gradient-card border-primary/20 shadow-glow-primary min-w-[300px] shrink-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{currentAsset?.icon}</span>
                    <div>
                      <h3 className="font-semibold text-foreground">{selectedAsset}</h3>
                      <p className="text-xs text-muted-foreground">{currentAsset?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        ${priceData.price.toFixed(selectedAsset.includes('JPY') ? 2 : 4)}
                      </span>
                      <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Query Interface */}
        <AIQueryInterface instrument={selectedAsset} timeframe={timeframe} />

        {/* Asset selection mobile-first */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 md:p-4 bg-card/30 backdrop-blur-sm border border-border/30 rounded-xl">
          {/* Responsive search */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-input/50 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth text-sm"
            />
            
            {/* Discrete suggestions */}
            {searchTerm && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                {filteredAssets.slice(0, 6).map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => {
                      setSelectedAsset(asset.symbol);
                      setSearchTerm("");
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-primary/10 transition-smooth flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span className="text-sm">{asset.icon}</span>
                    <span className="text-sm font-medium text-foreground">{asset.symbol}</span>
                    <span className="text-xs text-muted-foreground truncate">{asset.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Popular assets - responsive grid */}
          <div className="flex gap-2 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0">
            {allAssets.slice(0, 5).map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset.symbol)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-smooth flex items-center gap-1 whitespace-nowrap shrink-0",
                  selectedAsset === asset.symbol
                    ? "bg-primary text-primary-foreground shadow-glow-primary"
                    : "bg-card/50 hover:bg-primary/10 text-foreground"
                )}
              >
                <span className="text-xs">{asset.icon}</span>
                {asset.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Main responsive chart */}
        <Card className="gradient-card border-border/50 shadow-medium">
          <CardHeader className="border-b border-border/50 p-3 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-lg md:text-xl text-foreground">
                Chart - {selectedAsset} ({timeframe})
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
            <div className="h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]">
              <CandlestickChart 
                asset={selectedAsset} 
                tradeLevels={undefined}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <Card 
            onClick={() => navigate('/ai-setup')}
            className="gradient-card border-border/50 hover:shadow-glow-primary transition-smooth cursor-pointer group"
          >
            <CardContent className="p-4 md:p-6 text-center">
              <div className="gradient-primary p-2 md:p-3 rounded-lg md:rounded-xl w-fit mx-auto mb-3 group-hover:scale-110 transition-smooth">
                <Zap className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-sm md:text-base text-foreground mb-2">AI Trade Setup</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Analyze and find opportunities</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate('/macro-analysis')}
            className="gradient-card border-border/50 hover:shadow-glow-success transition-smooth cursor-pointer group"
          >
            <CardContent className="p-4 md:p-6 text-center">
              <div className="gradient-success p-2 md:p-3 rounded-lg md:rounded-xl w-fit mx-auto mb-3 group-hover:scale-110 transition-smooth">
                <Activity className="h-5 w-5 md:h-6 md:w-6 text-success-foreground" />
              </div>
              <h3 className="font-semibold text-sm md:text-base text-foreground mb-2">Macro Analysis</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Market commentary and analysis</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate('/reports')}
            className="gradient-card border-border/50 hover:shadow-medium transition-smooth cursor-pointer group"
          >
            <CardContent className="p-4 md:p-6 text-center">
              <div className="bg-warning/20 border border-warning/30 p-2 md:p-3 rounded-lg md:rounded-xl w-fit mx-auto mb-3 group-hover:scale-110 transition-smooth">
                <ArrowRight className="h-5 w-5 md:h-6 md:w-6 text-warning" />
              </div>
              <h3 className="font-semibold text-sm md:text-base text-foreground mb-2">Reports</h3>
              <p className="text-xs md:text-sm text-muted-foreground">View your detailed performance</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating bubble system */}
      <BubbleSystem 
        instrument={selectedAsset} 
        timeframe={timeframe} 
        onTradeSetupClick={() => {}}
      />
    </Layout>
  );
}