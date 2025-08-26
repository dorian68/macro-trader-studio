import { useState } from "react";
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
    symbol: "EURUSD",
    display: "EUR/USD",
    market: "FX",
    tradingViewSymbol: "EURUSD"
  });
  const [tradingViewError, setTradingViewError] = useState(false);
  
  // Available assets (same as MacroCommentaryBubble)
  const assets: AssetInfo[] = [
    { symbol: "EURUSD", display: "EUR/USD", market: "FX", tradingViewSymbol: "EURUSD" },
    { symbol: "GBPUSD", display: "GBP/USD", market: "FX", tradingViewSymbol: "GBPUSD" },
    { symbol: "XAUUSD", display: "XAU/USD", market: "FX", tradingViewSymbol: "XAUUSD" },
    { symbol: "BTCUSD", display: "BTC/USD", market: "CRYPTO", tradingViewSymbol: "BTCUSD" }
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

  // Use same n8n webhook as MacroCommentaryBubble
  const generateAnalysis = async () => {
    if (!queryParams.query.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // Call n8n webhook following the exact RAG format from MacroCommentaryBubble
      const response = await safePostRequest('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', {
        type: "RAG",
        question: queryParams.query,
        mode: "custom_analysis",
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
        // Additional fields from Macro Analysis form
        instrument: selectedAsset.symbol,
        timeframe: "1H",
        assetType: queryParams.assetType,
        analysisDepth: queryParams.analysisDepth,
        period: queryParams.period,
        adresse: queryParams.adresse
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      
      // Display the actual JSON response from n8n
      const realAnalysis: MacroAnalysis = {
        query: queryParams.query,
        timestamp: new Date(),
        sections: [
          {
            title: "n8n Response",
            content: JSON.stringify(rawData, null, 2),
            type: "overview",
            expanded: true
          }
        ],
        sources: []
      };
      
      setAnalyses(prev => [realAnalysis, ...prev]);
      setQueryParams(prev => ({ ...prev, query: "" }));
      
      toast({
        title: "Analysis Generated",
        description: "New macro analysis available"
      });
    } catch (error) {
      console.error('Webhook error:', error);
      
      toast({
        title: "Error",
        description: "Failed to generate analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
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

        {/* Asset Selection and TradingView */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Focus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Selected Asset</label>
                <Select 
                  value={selectedAsset.symbol} 
                  onValueChange={(value) => {
                    const asset = assets.find(a => a.symbol === value);
                    if (asset) setSelectedAsset(asset);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.symbol} value={asset.symbol}>
                        {asset.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                variant="outline"
                onClick={() => window.open(getTradingViewUrl(selectedAsset), '_blank')}
                className="w-full"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Open {selectedAsset.display} in TradingView
              </Button>
            </CardContent>
          </Card>

          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Technical Analysis - {selectedAsset.display}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
                {tradingViewError ? (
                  <Alert className="max-w-sm mx-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Embedding blocked – open in TradingView instead.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">TradingView Widget would load here</p>
                    <p className="text-xs mt-1 opacity-60">Use "Open in TradingView" button</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Query Interface */}
        <Card className="gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Analysis Generator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Textarea
                value={queryParams.query}
                onChange={(e) => setQueryParams(prev => ({ ...prev, query: e.target.value }))}
                placeholder="Ask your macro question or describe the context to analyze..."
                rows={4}
                className="text-base"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Address (temporary for development)</label>
                <Input
                  value={queryParams.adresse}
                  onChange={(e) => setQueryParams(prev => ({ ...prev, adresse: e.target.value }))}
                  placeholder="Enter temporary address for development"
                  className="text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Asset Type</label>
                  <Select value={queryParams.assetType} onValueChange={(value) => 
                    setQueryParams(prev => ({ ...prev, assetType: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="currency">Currency</SelectItem>
                      <SelectItem value="commodity">Commodity</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Analysis Depth</label>
                  <Select value={queryParams.analysisDepth} onValueChange={(value) => 
                    setQueryParams(prev => ({ ...prev, analysisDepth: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Period</label>
                  <Select value={queryParams.period} onValueChange={(value) => 
                    setQueryParams(prev => ({ ...prev, period: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Quick Analysis Ideas</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {quickQueries.map((query, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setQueryParams(prev => ({ ...prev, query }))}
                    className="text-xs h-auto py-2 px-3 text-left justify-start whitespace-normal"
                  >
                    {query}
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              onClick={generateAnalysis} 
              disabled={isGenerating || !queryParams.query.trim() || !queryParams.adresse.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Analysis...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Generate Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Analyses Results */}
        <div className="space-y-6">
          {analyses.length === 0 ? (
            <Card className="gradient-card">
              <CardContent className="p-12 text-center">
                <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-foreground mb-3">No analysis available yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Ask a macro question or select from our quick analysis ideas to get started. 
                  Your AI-powered analysis will appear here with actionable insights.
                </p>
              </CardContent>
            </Card>
          ) : (
            analyses.map((analysis, analysisIndex) => {
              const parsedLevels = parseLevels(analysis.sections.map(s => s.content).join('\n'));
              const hasLevels = parsedLevels.supports.length > 0 || parsedLevels.resistances.length > 0 || Object.keys(parsedLevels.indicators).length > 0;
              
              return (
                <Card key={analysisIndex} className="gradient-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{analysis.query}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {analysis.timestamp.toLocaleDateString()} at {analysis.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyAnalysis(analysis)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Actionable Levels & Signals (if detected) */}
                    {hasLevels && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Actionable Levels & Signals
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Supports/Resistances */}
                          {(parsedLevels.supports.length > 0 || parsedLevels.resistances.length > 0) && (
                            <Card className="border-blue-500/20">
                              <CardHeader className="pb-2">
                                <h5 className="text-sm font-medium">Support & Resistance</h5>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {parsedLevels.supports.length > 0 && (
                                  <div>
                                    <Badge variant="outline" className="text-xs mb-1">Supports</Badge>
                                    {parsedLevels.supports.map((level, idx) => (
                                      <div key={idx} className="text-sm text-green-600 font-mono">{level}</div>
                                    ))}
                                  </div>
                                )}
                                {parsedLevels.resistances.length > 0 && (
                                  <div>
                                    <Badge variant="outline" className="text-xs mb-1">Resistances</Badge>
                                    {parsedLevels.resistances.map((level, idx) => (
                                      <div key={idx} className="text-sm text-red-600 font-mono">{level}</div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          {/* Indicators */}
                          {Object.keys(parsedLevels.indicators).length > 0 && (
                            <Card className="border-blue-500/20">
                              <CardHeader className="pb-2">
                                <h5 className="text-sm font-medium">Indicators Overview</h5>
                              </CardHeader>
                              <CardContent className="space-y-1">
                                {Object.entries(parsedLevels.indicators).map(([indicator, value]) => (
                                  <div key={indicator} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{indicator}:</span>
                                    <span className="font-mono">{value}</span>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          )}

                          {/* Invalidation */}
                          {parsedLevels.invalidation && (
                            <Card className="border-orange-500/20">
                              <CardHeader className="pb-2">
                                <h5 className="text-sm font-medium">Invalidation</h5>
                              </CardHeader>
                              <CardContent>
                                <Badge variant="outline" className="text-xs text-orange-600">
                                  {parsedLevels.invalidation}
                                </Badge>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Analysis Sections */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold">Analysis Breakdown</h4>
                      {analysis.sections.map((section, sectionIndex) => {
                        const sectionId = `${analysisIndex}-${sectionIndex}`;
                        const isExpanded = expandedSections.has(sectionId) || section.expanded;
                        
                        return (
                          <div key={sectionIndex} className="border border-border/50 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleSection(analysisIndex, sectionIndex)}
                              className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="capitalize">
                                  {section.type}
                                </Badge>
                                <h5 className="font-medium">{section.title}</h5>
                              </div>
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform",
                                isExpanded ? "rotate-180" : ""
                              )} />
                            </button>
                            
                            {isExpanded && (
                              <div className="p-4 pt-0 border-t border-border/30">
                                <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                                  {section.content}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Sources */}
                    <div className="pt-4 border-t border-border/30">
                      <h5 className="font-medium mb-3">Sources & References</h5>
                      <div className="flex flex-wrap gap-2">
                        {analysis.sources.map((source, sourceIndex) => (
                          <a
                            key={sourceIndex}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm px-3 py-2 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}