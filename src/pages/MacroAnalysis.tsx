import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Brain, 
  Globe, 
  TrendingUp, 
  Calendar, 
  Copy, 
  ExternalLink,
  Loader2,
  BarChart3,
  Activity,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { safePostRequest } from "@/lib/safe-request";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { TechnicalDashboard } from "@/components/TechnicalDashboard";

interface AnalysisSection {
  title: string;
  content: string;
  type: "overview" | "technical" | "fundamental" | "outlook";
  expanded: boolean;
}

interface MacroAnalysis {
  query: string;
  timestamp: Date;
  sections: AnalysisSection[];
  sources: Array<{
    title: string;
    url: string;
    type: "news" | "data" | "research";
  }>;
}

interface TradingLevels {
  supports: string[];
  resistances: string[];
  indicators: { [key: string]: string };
  invalidation?: string;
}

interface AssetInfo {
  symbol: string;
  display: string;
  market: "FX" | "CRYPTO";
  tradingViewSymbol: string;
}

export default function MacroAnalysis() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [analyses, setAnalyses] = useState<MacroAnalysis[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<AssetInfo>({
    symbol: "EUR/USD",
    display: "EUR/USD", 
    market: "FX",
    tradingViewSymbol: "EURUSD"
  });
  const [tradingViewError, setTradingViewError] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // All available assets from Supabase
  const assets: AssetInfo[] = [
    // Major FX Pairs
    { symbol: "EUR/USD", display: "EUR/USD", market: "FX", tradingViewSymbol: "EURUSD" },
    { symbol: "GBP/USD", display: "GBP/USD", market: "FX", tradingViewSymbol: "GBPUSD" },
    { symbol: "USD/JPY", display: "USD/JPY", market: "FX", tradingViewSymbol: "USDJPY" },
    { symbol: "AUDUSD=X", display: "AUD/USD", market: "FX", tradingViewSymbol: "AUDUSD" },
    { symbol: "NZDUSD=X", display: "NZD/USD", market: "FX", tradingViewSymbol: "NZDUSD" },
    { symbol: "USDCAD=X", display: "USD/CAD", market: "FX", tradingViewSymbol: "USDCAD" },
    { symbol: "USDCHF=X", display: "USD/CHF", market: "FX", tradingViewSymbol: "USDCHF" },
    
    // Cross Pairs
    { symbol: "EURGBP=X", display: "EUR/GBP", market: "FX", tradingViewSymbol: "EURGBP" },
    { symbol: "EURJPY=X", display: "EUR/JPY", market: "FX", tradingViewSymbol: "EURJPY" },
    { symbol: "GBPJPY=X", display: "GBP/JPY", market: "FX", tradingViewSymbol: "GBPJPY" },
    
    // Crypto
    { symbol: "BTC-USD", display: "Bitcoin", market: "CRYPTO", tradingViewSymbol: "BTCUSD" },
    { symbol: "ETH-USD", display: "Ethereum", market: "CRYPTO", tradingViewSymbol: "ETHUSD" },
    { symbol: "ADA-USD", display: "Cardano", market: "CRYPTO", tradingViewSymbol: "ADAUSD" },
    { symbol: "DOGE-USD", display: "Dogecoin", market: "CRYPTO", tradingViewSymbol: "DOGEUSD" },
    { symbol: "SOL-USD", display: "Solana", market: "CRYPTO", tradingViewSymbol: "SOLUSD" }
  ];
  
  // Harmonized parameters with MacroCommentaryBubble
  const [queryParams, setQueryParams] = useState({
    query: "",
    assetType: "currency",
    analysisDepth: "detailed",
    period: "weekly",
    adresse: ""
  });

  // Parse trading levels from text (same as MacroCommentaryBubble)
  const parseLevels = (text: string): TradingLevels => {
    const levels: TradingLevels = {
      supports: [],
      resistances: [],
      indicators: {}
    };

    // Extract supports (S1, S2, Support, etc.)
    const supportRegex = /(?:S\d+[:\s=]+|Support[s]?[:\s=]+)([0-9.,]+)/gi;
    let match;
    while ((match = supportRegex.exec(text)) !== null) {
      levels.supports.push(match[1]);
    }

    // Extract resistances (R1, R2, Resistance, etc.)
    const resistanceRegex = /(?:R\d+[:\s=]+|Resistance[s]?[:\s=]+)([0-9.,]+)/gi;
    while ((match = resistanceRegex.exec(text)) !== null) {
      levels.resistances.push(match[1]);
    }

    // Extract indicators (RSI, ATR, ADX, etc.)
    const indicatorRegex = /(?:RSI|ATR|ADX|MACD|Stochastic)(?:\(\d+\))?[:\s=]+([0-9.,]+)/gi;
    while ((match = indicatorRegex.exec(text)) !== null) {
      const indicator = match[0].split(/[:\s=]/)[0].trim();
      levels.indicators[indicator] = match[1];
    }

    // Extract invalidation
    const invalidationRegex = /Invalidation[:\s]+(.*?)(?:\n|$)/i;
    const invalidationMatch = text.match(invalidationRegex);
    if (invalidationMatch) {
      levels.invalidation = invalidationMatch[1].trim();
    }

    return levels;
  };

  // TradingView URL generator (same as MacroCommentaryBubble)
  const getTradingViewUrl = (asset: AssetInfo) => {
    const exchange = asset.market === "FX" ? "FX" : "BINANCE";
    return `https://www.tradingview.com/symbols/${asset.tradingViewSymbol}/technicals/?exchange=${exchange}`;
  };

  // No more polling or job persistence needed

  // Removed polling and status check functions - using single request approach

  // Single request analysis workflow
  const generateAnalysis = async () => {
    if (!queryParams.query.trim()) return;
    
    setIsGenerating(true);
    setJobStatus("processing");
    
    try {
      // Single main request with all data
      const payload = {
        type: "RAG",
        question: queryParams.query,
        mode: "run",
        filters: {
          region: "All",
          product: "All",
          category: "All"
        },
        analysis: {
          query: queryParams.query,
          timestamp: new Date().toISOString()
        },
        user_id: "default_user",
        instrument: selectedAsset.symbol,
        timeframe: "1H",
        assetType: queryParams.assetType,
        analysisDepth: queryParams.analysisDepth,
        period: queryParams.period,
        adresse: queryParams.adresse || ""
      };

      console.log('📊 [MacroAnalysis] Analysis request:', {
        url: 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        payload,
        timestamp: new Date().toISOString()
      });

      const response = await safePostRequest('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', payload);

      if (!response.ok) {
        throw new Error(`Analysis request failed! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('📊 [MacroAnalysis] Analysis response:', {
        status: response.status,
        ok: response.ok,
        data,
        timestamp: new Date().toISOString()
      });

      // Process the response
      if (data && data.status === 'done' && data.message) {
        let analysisContent = '';
        
        if (data.message.content?.content) {
          analysisContent = data.message.content.content;
        } else if (data.message.content) {
          analysisContent = data.message.content;
        } else {
          analysisContent = JSON.stringify(data, null, 2);
        }
        
        const realAnalysis: MacroAnalysis = {
          query: queryParams.query,
          timestamp: new Date(),
          sections: [
            {
              title: "Analysis Results",
              content: analysisContent,
              type: "overview",
              expanded: true
            }
          ],
          sources: []
        };
        
        setAnalyses(prev => [realAnalysis, ...prev]);
        setJobStatus("done");
        setIsGenerating(false);
        
        toast({
          title: "Analysis Completed",
          description: "Your macro analysis is ready"
        });
        
        setQueryParams(prev => ({ ...prev, query: "" }));
        return;
      }

      throw new Error("Invalid response format");

    } catch (error) {
      console.error('Analysis error:', error);
      setIsGenerating(false);
      setJobStatus("error");
      
      toast({
        title: "Error",
        description: "Unable to complete analysis. Please retry.",
        variant: "destructive"
      });
    }
  };

  const toggleSection = (analysisIndex: number, sectionIndex: number) => {
    const sectionId = `${analysisIndex}-${sectionIndex}`;
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const copyAnalysis = (analysis: MacroAnalysis) => {
    const content = `Macro Analysis - ${analysis.query}\n\n${analysis.sections.map(s => `${s.title}:\n${s.content}`).join('\n\n')}`;
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Analysis copied to clipboard"
    });
  };

  // Extended quick queries for full page experience
  const quickQueries = [
    "EUR/USD macro analysis for this week",
    "NFP data impact on USD",  
    "Bitcoin macro conditions outlook",
    "Global risk sentiment analysis",
    "Impact of inflation on major currencies",
    "Analysis of ECB vs Fed monetary policies", 
    "Gold price drivers and outlook",
    "Crypto trends vs traditional markets",
    "Opportunities in commodities",
    "Central bank policy divergence effects",
    "Dollar strength analysis",
    "European economic outlook"
  ];

  const [showAnalysisResult, setShowAnalysisResult] = useState(false);
  
  return (
    <Layout activeModule="macro-analysis" onModuleChange={() => {}}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Macro Analysis</h1>
            <p className="text-muted-foreground">AI-powered economic analysis and market insights</p>
          </div>
        </div>

        {/* Analysis Generator - Enhanced search bar style */}
        <Card className="gradient-card shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Brain className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Analysis Generator</h2>
            </div>
            
            <div className="space-y-4">
              {/* Main search input */}
              <div className="relative">
                <Textarea
                  value={queryParams.query}
                  onChange={(e) => setQueryParams(prev => ({ ...prev, query: e.target.value }))}
                  placeholder="Ask your macro question or describe the context to analyze..."
                  rows={3}
                  className="text-base resize-none pr-12"
                />
                <Button 
                  onClick={generateAnalysis} 
                  disabled={isGenerating || !queryParams.query.trim()}
                  size="sm"
                  className="absolute bottom-2 right-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Quick suggestions dropdown */}
              <div className="relative">
                <Select value="" onValueChange={(value) => setQueryParams(prev => ({ ...prev, query: value }))}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4" />
                      <span className="text-muted-foreground">Quick analysis suggestions...</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {quickQueries.map((query, index) => (
                      <SelectItem key={index} value={query}>
                        {query}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Compact parameters row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select value={queryParams.assetType} onValueChange={(value) => 
                  setQueryParams(prev => ({ ...prev, assetType: value }))
                }>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Asset Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="currency">Currency</SelectItem>
                    <SelectItem value="commodity">Commodity</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={queryParams.analysisDepth} onValueChange={(value) => 
                  setQueryParams(prev => ({ ...prev, analysisDepth: value }))
                }>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Depth" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={queryParams.period} onValueChange={(value) => 
                  setQueryParams(prev => ({ ...prev, period: value }))
                }>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  value={queryParams.adresse}
                  onChange={(e) => setQueryParams(prev => ({ ...prev, adresse: e.target.value }))}
                  placeholder="Dev address"
                  className="text-sm"
                  required
                />
              </div>

              {/* Status indicator */}
              {isGenerating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {jobStatus === "queued" && "Analysis queued..."}
                  {jobStatus === "running" && "Analysis in progress..."}
                  {!jobStatus && "Generating Analysis..."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results - Appears after generation */}
        {analyses.length > 0 && (
          <Card className="gradient-card">
            <CardHeader className="cursor-pointer" onClick={() => setShowAnalysisResult(!showAnalysisResult)}>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Analysis Results
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAnalysisResult && "rotate-180")} />
              </CardTitle>
            </CardHeader>
            {showAnalysisResult && (
              <CardContent>
                {analyses.map((analysis, analysisIndex) => (
                  <div key={analysisIndex} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {analysis.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyAnalysis(analysis)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {analysis.sections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="border rounded-lg p-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleSection(analysisIndex, sectionIndex)}
                        >
                          <h4 className="font-medium">{section.title}</h4>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            expandedSections.has(`${analysisIndex}-${sectionIndex}`) && "rotate-180"
                          )} />
                        </div>
                        
                        {expandedSections.has(`${analysisIndex}-${sectionIndex}`) && (
                          <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                            {section.content}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* Market Chart with integrated Market Focus */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Market Chart - {selectedAsset.display}
              </div>
              {/* Market Focus integrated as dropdown */}
              <Select 
                value={selectedAsset.symbol} 
                onValueChange={(value) => {
                  const asset = assets.find(a => a.symbol === value);
                  if (asset) setSelectedAsset(asset);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <div className="p-2 font-semibold text-xs text-muted-foreground border-b">FX PAIRS</div>
                  {assets.filter(a => a.market === "FX").map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      {asset.display}
                    </SelectItem>
                  ))}
                  <div className="p-2 font-semibold text-xs text-muted-foreground border-b border-t">CRYPTO</div>
                  {assets.filter(a => a.market === "CRYPTO").map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      {asset.display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <TradingViewWidget 
              selectedSymbol={selectedAsset.symbol}
              onSymbolChange={(symbol) => {
                const asset = assets.find(a => a.symbol === symbol);
                if (asset) setSelectedAsset(asset);
              }}
            />
          </CardContent>
        </Card>

        {/* Technical Analysis */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Technical Analysis - {selectedAsset.display}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TechnicalDashboard selectedAsset={selectedAsset} />
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}