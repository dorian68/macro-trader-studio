import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ApplyToPortfolioButton from "./ApplyToPortfolioButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safePostRequest } from "@/lib/safe-request";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  X, 
  Minimize2,
  Search,
  Globe,
  TrendingUp,
  Calendar,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader2,
  BarChart3,
  Activity,
  AlertTriangle,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface MacroCommentaryBubbleProps {
  instrument: string;
  timeframe?: string;
  onClose: () => void;
}

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

export function MacroCommentaryBubble({ instrument, timeframe, onClose }: MacroCommentaryBubbleProps) {
  const [isMinimized, setIsMinimized] = useState(false);
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
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Available assets
  const assets: AssetInfo[] = [
    { symbol: "EURUSD", display: "EUR/USD", market: "FX", tradingViewSymbol: "EURUSD" },
    { symbol: "GBPUSD", display: "GBP/USD", market: "FX", tradingViewSymbol: "GBPUSD" },
    { symbol: "XAUUSD", display: "XAU/USD", market: "FX", tradingViewSymbol: "XAUUSD" },
    { symbol: "BTCUSD", display: "BTC/USD", market: "CRYPTO", tradingViewSymbol: "BTCUSD" }
  ];

  // Form parameters
  const [queryParams, setQueryParams] = useState({
    query: "",
    assetType: "currency",
    analysisDepth: "detailed",
    period: "weekly",
    adresse: ""
  });

  const quickQueries = [
    "EUR/USD macro analysis for this week",
    "NFP data impact on USD",
    "Bitcoin macro conditions outlook",
    "Global risk sentiment analysis"
  ];

  // Parse trading levels from text
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

  // TradingView URL generator
  const getTradingViewUrl = (asset: AssetInfo) => {
    const exchange = asset.market === "FX" ? "FX" : "BINANCE";
    return `https://www.tradingview.com/symbols/${asset.tradingViewSymbol}/technicals/?exchange=${exchange}`;
  };

  // Load job ID from localStorage on component mount
  useEffect(() => {
    const savedJobId = localStorage.getItem("strategist_job_id");
    if (savedJobId) {
      setJobId(savedJobId);
      checkJobStatus(savedJobId);
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const checkJobStatus = async (currentJobId: string) => {
    try {
      const statusPayload = {
        type: "RAG",
        question: queryParams.query,
        mode: "status",
        job_id: currentJobId,
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
        instrument: instrument,
        timeframe: timeframe || "1H",
        assetType: "currency",
        analysisDepth: "detailed",
        period: "weekly",
        adresse: queryParams.adresse
      };

      console.log('💬 [MacroCommentaryBubble] Status check POST request:', {
        url: 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        payload: statusPayload,
        timestamp: new Date().toISOString()
      });

      const response = await safePostRequest('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', statusPayload);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const statusData = await response.json();
      
      console.log('💬 [MacroCommentaryBubble] Status check response:', {
        status: response.status,
        ok: response.ok,
        data: statusData,
        timestamp: new Date().toISOString()
      });
      
      // Handle nested response structure
      const responseBody = statusData.body || statusData;
      
      if (responseBody.status === "done") {
        // Job completed - parse response from content field
        let analysisContent = '';
        
        if (responseBody.content) {
          // If content is an object, parse it appropriately
          if (typeof responseBody.content === 'object') {
            if (responseBody.content.content) {
              analysisContent = responseBody.content.content;
            } else if (responseBody.content.base_report) {
              analysisContent = responseBody.content.base_report;
            } else {
              analysisContent = JSON.stringify(responseBody.content, null, 2);
            }
          } else {
            analysisContent = responseBody.content;
          }
        } else {
          analysisContent = JSON.stringify(responseBody, null, 2);
        }
        
        const realAnalysis: MacroAnalysis = {
          query: queryParams.query,
          timestamp: new Date(),
          sections: [
            {
              title: "Analyse Complète",
              content: analysisContent,
              type: "overview",
              expanded: true
            }
          ],
          sources: [
            { title: "n8n RAG Analysis", url: "#", type: "research" }
          ]
        };
        
        setAnalyses(prev => [realAnalysis, ...prev]);
        setJobStatus("done");
        setIsGenerating(false);
        localStorage.removeItem("strategist_job_id");
        setJobId(null);
        
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        toast({
          title: "Analysis Completed",
          description: "Nouvelle analyse macro disponible"
        });
      } else if (responseBody.status === "error") {
        setJobStatus("error");
        setIsGenerating(false);
        localStorage.removeItem("strategist_job_id");
        setJobId(null);
        
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        toast({
          title: "Analysis Error",
          description: responseBody.message || "Analysis failed",
          variant: "destructive"
        });
      } else {
        // Still queued or running
        setJobStatus(responseBody.status);
      }
    } catch (error) {
      console.error('Status check error:', error);
      setJobStatus("error");
      setIsGenerating(false);
    }
  };

  const startPolling = (currentJobId: string) => {
    const interval = setInterval(() => {
      checkJobStatus(currentJobId);
    }, 15000); // Poll every 15 seconds
    
    setPollingInterval(interval);
  };

  // 3-step async workflow: START → LAUNCH → POLLING  
  const generateAnalysis = async () => {
    if (!queryParams.query.trim()) return;
    
    setIsGenerating(true);
    setJobStatus("queued");
    
    try {
      // STEP 1: START job to get job_id
      const startPayload = {
        mode: "start",
        instrument: instrument
      };

      console.log('💬 [MacroCommentaryBubble] START job request:', {
        url: 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        payload: startPayload,
        timestamp: new Date().toISOString()
      });

      const startResponse = await safePostRequest(
        'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        startPayload
      );

      if (!startResponse.ok) {
        throw new Error(`START request failed! status: ${startResponse.status}`);
      }

      const startData = await startResponse.json();
      
      console.log('💬 [MacroCommentaryBubble] START job response:', {
        status: startResponse.status,
        ok: startResponse.ok,
        data: startData,
        timestamp: new Date().toISOString()
      });
      
      // Handle nested response structure
      const responseBody = startData.body || startData;
      
      if (!responseBody.job_id || responseBody.status !== "queued") {
        throw new Error("Invalid START response: no job_id or wrong status");
      }

      // Save job info
      setJobId(responseBody.job_id);
      localStorage.setItem("strategist_job_id", responseBody.job_id);
      setJobStatus("queued");

      // STEP 2: LAUNCH main processing immediately with job_id
      const launchPayload = {
        type: "RAG",
        question: queryParams.query,
        job_id: responseBody.job_id, // Add job_id to associate processing with this job
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
        instrument: instrument,
        timeframe: timeframe || "1H",
        assetType: "currency",
        analysisDepth: "detailed",
        period: "weekly",
        adresse: queryParams.adresse
      };

      console.log('💬 [MacroCommentaryBubble] LAUNCH processing request:', {
        url: 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        payload: launchPayload,
        timestamp: new Date().toISOString()
      });

      // Send launch request but don't wait for long response
      safePostRequest('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', launchPayload)
        .catch(error => console.log('Launch request fired, polling will track status:', error));

      // STEP 3: Start polling immediately
      startPolling(responseBody.job_id);
      
      setQueryParams(prev => ({ ...prev, query: "" }));
      
      toast({
        title: "Analysis Started",
        description: "Job queued, processing will begin shortly..."
      });

    } catch (error) {
      console.error('Analysis startup error:', error);
      setIsGenerating(false);
      setJobStatus("");
      
      toast({
        title: "Error",
        description: "Unable to start analysis. Please retry.",
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

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 w-14 rounded-full shadow-lg bg-blue-500 hover:bg-blue-600"
        >
          <Brain className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[600px] max-w-[calc(100vw-1rem)] md:max-w-[calc(100vw-3rem)]">
      <Card className="shadow-2xl border-blue-500/20 bg-background/95 backdrop-blur-lg">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Macro Commentary</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Asset selector and TradingView button */}
          <div className="flex items-center justify-between gap-2 mt-3">
            <div className="flex items-center gap-2">
              <Select 
                value={selectedAsset.symbol} 
                onValueChange={(value) => {
                  const asset = assets.find(a => a.symbol === value);
                  if (asset) setSelectedAsset(asset);
                }}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
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
              
              <Badge variant="outline" className="text-xs">
                {instrument}
              </Badge>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getTradingViewUrl(selectedAsset), '_blank')}
              className="text-xs h-8"
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Open in TradingView
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Email Address Field - ALWAYS FIRST AND VISIBLE */}
          <div className="space-y-2 p-3 bg-muted/20 rounded-lg border">
            <Label htmlFor="address" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address (Required)
            </Label>
            <Input
              id="address"
              value={queryParams.adresse}
              onChange={(e) => setQueryParams(prev => ({ ...prev, adresse: e.target.value }))}
              placeholder="Enter your email address"
              className="text-sm border-2"
              required
              type="email"
            />
            {!queryParams.adresse.trim() && (
              <p className="text-xs text-destructive font-medium">⚠️ Email address is required to generate analysis</p>
            )}
          </div>
          
          {/* Query Interface */}
          <div className="space-y-3">
            
            <div className="space-y-2">
              <Label htmlFor="query">Analysis Request</Label>
              <Textarea
                id="query"
                value={queryParams.query}
                onChange={(e) => setQueryParams(prev => ({ ...prev, query: e.target.value }))}
                placeholder="Ex: EUR/USD macro analysis for this week"
                className="h-20"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Select value={queryParams.assetType} onValueChange={(value) => 
                setQueryParams(prev => ({ ...prev, assetType: value }))
              }>
                <SelectTrigger className="text-xs">
                  <SelectValue />
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
                <SelectTrigger className="text-xs">
                  <SelectValue />
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
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Query Buttons */}
            <div className="flex flex-wrap gap-1">
              {quickQueries.map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setQueryParams(prev => ({ ...prev, query }))}
                >
                  {query}
                </Button>
              ))}
            </div>

            <Button 
              onClick={generateAnalysis} 
              disabled={isGenerating || !queryParams.query.trim() || !queryParams.adresse.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {jobStatus === "queued" && "Analysis queued..."}
                  {jobStatus === "running" && "Analysis in progress..."}
                  {!jobStatus && "Generating..."}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Generate Analysis
                </>
              )}
            </Button>
          </div>

          {/* Analyses Results */}
          {analyses.length > 0 && (
            <ScrollArea className="h-96">
              <div className="space-y-4 pr-3">
                {analyses.map((analysis, analysisIndex) => {
                  const parsedLevels = parseLevels(analysis.sections.map(s => s.content).join('\n'));
                  const hasLevels = parsedLevels.supports.length > 0 || parsedLevels.resistances.length > 0 || Object.keys(parsedLevels.indicators).length > 0;
                  
                  return (
                    <Card key={analysisIndex} className="border-blue-500/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium text-sm">{analysis.query}</h4>
                            <p className="text-xs text-muted-foreground">
                              {analysis.timestamp.toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyAnalysis(analysis)}
                            className="h-7 px-2"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Desktop: 2 columns layout, Mobile: stack */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Actionable Levels & Signals */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Actionable Levels & Signals
                            </h4>
                            
                            {hasLevels ? (
                              <div className="space-y-2">
                                {/* Support/Resistance Cards */}
                                {(parsedLevels.supports.length > 0 || parsedLevels.resistances.length > 0) && (
                                  <Card className="bg-muted/20">
                                    <CardContent className="p-3">
                                      <h5 className="text-xs font-medium mb-2">Support & Resistance</h5>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <p className="text-green-600 font-medium mb-1">Supports</p>
                                          {parsedLevels.supports.map((level, idx) => (
                                            <div key={idx} className="text-muted-foreground">S{idx + 1}: {level}</div>
                                          ))}
                                        </div>
                                        <div>
                                          <p className="text-red-600 font-medium mb-1">Resistances</p>
                                          {parsedLevels.resistances.map((level, idx) => (
                                            <div key={idx} className="text-muted-foreground">R{idx + 1}: {level}</div>
                                          ))}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Indicators Card */}
                                {Object.keys(parsedLevels.indicators).length > 0 && (
                                  <Card className="bg-muted/20">
                                    <CardContent className="p-3">
                                      <h5 className="text-xs font-medium mb-2">Indicators Overview</h5>
                                      <div className="space-y-1">
                                        {Object.entries(parsedLevels.indicators).map(([indicator, value]) => (
                                          <div key={indicator} className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{indicator}:</span>
                                            <span className="font-medium">{value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Invalidation Badge */}
                                {parsedLevels.invalidation && (
                                  <Badge variant="destructive" className="text-xs w-full justify-start p-2">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Invalidation: {parsedLevels.invalidation}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground">
                                <Activity className="h-6 w-6 mx-auto mb-2 opacity-30" />
                                <p className="text-xs">No levels detected</p>
                              </div>
                            )}
                          </div>

                          {/* Base Commentary */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium">Base Commentary</h4>
                            
                            {/* Analysis Sections */}
                            <div className="space-y-2">
                              {analysis.sections.map((section, sectionIndex) => {
                                const sectionId = `${analysisIndex}-${sectionIndex}`;
                                const isExpanded = section.expanded || expandedSections.has(sectionId);
                                
                                return (
                                  <div key={sectionIndex} className="border rounded-md">
                                    <button
                                      onClick={() => toggleSection(analysisIndex, sectionIndex)}
                                      className="w-full p-2 flex items-center justify-between text-left hover:bg-accent/50 transition-colors rounded-md"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className={cn(
                                          "w-2 h-2 rounded-full",
                                          section.type === "overview" && "bg-blue-500",
                                          section.type === "technical" && "bg-green-500",
                                          section.type === "fundamental" && "bg-orange-500",
                                          section.type === "outlook" && "bg-purple-500"
                                        )} />
                                        <span className="font-medium text-xs">{section.title}</span>
                                      </div>
                                      <ChevronDown className={cn(
                                        "h-3 w-3 transition-transform",
                                        isExpanded && "rotate-180"
                                      )} />
                                    </button>
                                    
                                    {isExpanded && (
                                      <div className="px-2 pb-2">
                                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                                          {section.content}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Sources */}
                        <div className="pt-2 border-t">
                          <h5 className="text-xs font-medium mb-2">Sources</h5>
                          <div className="flex flex-wrap gap-1">
                            {analysis.sources.map((source, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="text-xs h-6 px-2"
                                onClick={() => window.open(source.url, '_blank')}
                              >
                                <ExternalLink className="h-2 w-2 mr-1" />
                                {source.title}
                              </Button>
                            ))}
                          </div>
                          <div className="flex justify-end mt-3">
                            <ApplyToPortfolioButton 
                              analysisContent={analysis.sections.map(s => s.content).join('\n')}
                              analysisType="macro"
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {analyses.length === 0 && !isGenerating && (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-8 w-8 mx-auto mb-3 text-blue-500/30" />
              <p className="text-sm">
                Request a personalized macro analysis
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}