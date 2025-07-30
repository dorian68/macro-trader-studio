import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Activity, Zap, ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CandlestickChart } from "@/components/CandlestickChart";
import { BubbleSystem } from "@/components/BubbleSystem";
import { Layout } from "@/components/Layout";
import { getSymbolForAsset } from "@/lib/assetMapping";

// Assets populaires avec leurs catégories
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
  const [selectedAsset, setSelectedAsset] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("4h");
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // WebSocket pour les prix en temps réel
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
      <div className="space-y-6">
        {/* Header moderne avec prix en temps réel */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="gradient-primary p-3 rounded-xl shadow-glow-primary">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Trading Dashboard</h1>
                <p className="text-muted-foreground">Analyse IA en temps réel et exécution de trades</p>
              </div>
            </div>
          </div>

          {/* Prix en temps réel - Coin supérieur droit */}
          {priceData && (
            <Card className="gradient-card border-primary/20 shadow-glow-primary min-w-[300px]">
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

        {/* Sélection d'actifs moderne */}
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Search className="h-5 w-5" />
              Sélection d'actifs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un actif..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth"
              />
            </div>

            {/* Grille d'actifs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset.symbol)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-smooth hover:scale-105",
                    selectedAsset === asset.symbol
                      ? "border-primary bg-primary/10 shadow-glow-primary"
                      : "border-border hover:border-primary/50 bg-card/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{asset.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">{asset.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Timeframe */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm font-medium text-foreground">Période:</span>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1H</SelectItem>
                  <SelectItem value="4h">4H</SelectItem>
                  <SelectItem value="1d">1D</SelectItem>
                  <SelectItem value="1w">1W</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Graphique principal */}
        <Card className="gradient-card border-border/50 shadow-medium">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-foreground">
                Graphique - {selectedAsset} ({timeframe})
              </CardTitle>
              <Badge variant="outline" className={cn(
                "border-success/50 text-success bg-success/10",
                !isConnected && "border-danger/50 text-danger bg-danger/10"
              )}>
                {isConnected ? "Connecté" : "Déconnecté"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[600px]">
              <CandlestickChart 
                asset={selectedAsset} 
                tradeLevels={undefined}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="gradient-card border-border/50 hover:shadow-glow-primary transition-smooth cursor-pointer group">
            <CardContent className="p-6 text-center">
              <div className="gradient-primary p-3 rounded-xl w-fit mx-auto mb-3 group-hover:scale-110 transition-smooth">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Trade Setup IA</h3>
              <p className="text-sm text-muted-foreground">Analysez et trouvez des opportunités de trading</p>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50 hover:shadow-glow-success transition-smooth cursor-pointer group">
            <CardContent className="p-6 text-center">
              <div className="gradient-success p-3 rounded-xl w-fit mx-auto mb-3 group-hover:scale-110 transition-smooth">
                <Activity className="h-6 w-6 text-success-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Analyse Macro</h3>
              <p className="text-sm text-muted-foreground">Commentaires et analyses des marchés</p>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50 hover:shadow-medium transition-smooth cursor-pointer group">
            <CardContent className="p-6 text-center">
              <div className="bg-warning/20 border border-warning/30 p-3 rounded-xl w-fit mx-auto mb-3 group-hover:scale-110 transition-smooth">
                <ArrowRight className="h-6 w-6 text-warning" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Rapports</h3>
              <p className="text-sm text-muted-foreground">Consultez vos performances détaillées</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Système de bulles flottantes */}
      <BubbleSystem 
        instrument={selectedAsset} 
        timeframe={timeframe} 
        onTradeSetupClick={() => {}}
      />
    </Layout>
  );
}