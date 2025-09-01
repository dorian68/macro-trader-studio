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
    symbol: "EURUSD",
    display: "EUR/USD",
    market: "FX",
    tradingViewSymbol: "EURUSD"
  });
  const [tradingViewError, setTradingViewError] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
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
        instrument: selectedAsset.symbol,
        timeframe: "1H",
        assetType: queryParams.assetType,
        analysisDepth: queryParams.analysisDepth,
        period: queryParams.period,
        adresse: queryParams.adresse
      };

      console.log('📊 [MacroAnalysis] Status check POST request:', {
        url: 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        payload: statusPayload,
        timestamp: new Date().toISOString()
      });

      const response = await safePostRequest('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', statusPayload);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get response data - try text first, then parse as JSON
      let responseJson = null;
      
      try {
        const responseText = await response.text();
        console.log('📊 [MacroAnalysis] Raw response text:', responseText);
        
        if (responseText.trim()) {
          try {
            responseJson = JSON.parse(responseText);
            console.log('📊 [MacroAnalysis] Successfully parsed as JSON:', responseJson);
          } catch (parseError) {
            console.log('📊 [MacroAnalysis] Failed to parse response as JSON:', parseError);
            console.log('📊 [MacroAnalysis] Raw text was:', responseText);
          }
        } else {
          console.log('📊 [MacroAnalysis] Empty response received');
        }
      } catch (textError) {
        console.error('📊 [MacroAnalysis] Failed to read response as text:', textError);
      }
      
      // Check if we got the final n8n response with status done
      // N8N returns an array with one object containing the message
      if (responseJson && Array.isArray(responseJson) && responseJson.length > 0) {
        const messageObj = responseJson[0].message;
        
        if (messageObj && messageObj.status === 'done') {
          console.log('📊 [MacroAnalysis] Found status done, stopping polling');
          setIsGenerating(false);
          
          // Extract the content from the nested message structure
          let analysisContent = '';
          if (messageObj.message && messageObj.message.content && messageObj.message.content.content) {
            analysisContent = messageObj.message.content.content;
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
          localStorage.removeItem("strategist_job_id");
          setJobId(null);
          
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          toast({
            title: "Analysis Completed",
            description: "Your macro analysis is ready"
          });
          return;
        }
        
      }
      
      // Case 2: Check for direct status at root level (fallback)
      if (responseJson && !Array.isArray(responseJson) && responseJson.status === 'done') {
        console.log('📊 [MacroAnalysis] Found status done at root level!');
        
        // Extract content from direct response
        let analysisContent = '';
        if (responseJson.content && responseJson.content.content) {
          analysisContent = responseJson.content.content;
        } else if (responseJson.content) {
          analysisContent = typeof responseJson.content === 'string' ? responseJson.content : JSON.stringify(responseJson.content, null, 2);
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
        localStorage.removeItem("strategist_job_id");
        setJobId(null);
        
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        toast({
          title: "Analysis Completed",
          description: "Your macro analysis is ready"
        });
        return;
      }
      
      // If no proper JSON response, check if empty
      if (!responseJson) {
        console.log('Empty or invalid response, continuing polling...');
        return;
      }
      
      const statusData = responseJson;
      
      console.log('📊 [MacroAnalysis] Status check response:', {
        status: response.status,
        ok: response.ok,
        data: statusData,
        timestamp: new Date().toISOString()
      });
      
      // Handle nested response structure
      const responseBody = statusData.body || statusData;
      
      // SYSTEM PATCH: Check if response is array format from n8n first
      if (Array.isArray(statusData) && statusData.length > 0 && statusData[0].status === "done") {
        // Job completed - extract content according to patch specification
        const analysisContent = statusData[0].message?.content?.content || JSON.stringify(statusData[0], null, 2);
        
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
        localStorage.removeItem("strategist_job_id");
        setJobId(null);
        
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        return;
      }
      
      if (responseBody.status === "done") {
        // Job completed - extract content according to patch specification
        let analysisContent = '';
        
        if (responseBody.content) {
          // Fallback to existing logic
          if (typeof responseBody.content === 'object') {
            if (responseBody.content.content) {
              analysisContent = responseBody.content.content;
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
        localStorage.removeItem("strategist_job_id");
        setJobId(null);
        
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        toast({
          title: "Analysis Completed",
          description: "Your macro analysis is ready"
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
    const startTime = Date.now();
    const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes - garde-fou pour ne pas surcharger n8n
    let pollCount = 0;
    let currentTimeoutId: NodeJS.Timeout | null = null;
    
    const poll = () => {
      // Check timeout (5 minutes max) - ARRÊT DÉFINITIF après 5 minutes
      if (Date.now() - startTime > TIMEOUT_DURATION) {
        setJobStatus("error");
        setIsGenerating(false);
        localStorage.removeItem("strategist_job_id");
        setJobId(null);
        
        if (currentTimeoutId) {
          clearTimeout(currentTimeoutId);
          currentTimeoutId = null;
        }
        
        toast({
          title: "Analysis Timeout",
          description: "Analysis exceeded 5 minutes. Please try again.",
          variant: "destructive"
        });
        return; // ARRÊT DÉFINITIF - aucun autre appel ne sera fait
      }

      checkJobStatus(currentJobId);
      
      // Schedule next poll with progressive timing SEULEMENT si dans les 5 minutes
      pollCount++;
      let nextDelay;
      if (pollCount === 1) {
        nextDelay = 60000; // First poll: 1 minute
      } else if (pollCount === 2) {
        nextDelay = 30000; // Second poll: 30 seconds
      } else {
        nextDelay = 15000; // All subsequent polls: 15 seconds
      }
      
      // Double vérification avant de programmer le prochain appel
      if (Date.now() - startTime + nextDelay < TIMEOUT_DURATION) {
        currentTimeoutId = setTimeout(poll, nextDelay);
      } else {
        // On approche des 5 minutes, arrêt préventif
        setJobStatus("error");
        setIsGenerating(false);
        localStorage.removeItem("strategist_job_id");
        setJobId(null);
        toast({
          title: "Analysis Timeout",
          description: "Analysis timed out to prevent overloading n8n.",
          variant: "destructive"
        });
      }
    };

    // Start first poll after 1 minute
    currentTimeoutId = setTimeout(poll, 60000);
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
        instrument: selectedAsset.symbol
      };

      console.log('📊 [MacroAnalysis] START job request:', {
        url: 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        payload: startPayload,
        timestamp: new Date().toISOString()
      });

      const startResponse = await safePostRequest('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', startPayload);

      if (!startResponse.ok) {
        throw new Error(`START request failed! status: ${startResponse.status}`);
      }

      const startData = await startResponse.json();
      
      console.log('📊 [MacroAnalysis] START job response:', {
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
        mode: "run",
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
        instrument: selectedAsset.symbol,
        timeframe: "1H",
        assetType: queryParams.assetType,
        analysisDepth: queryParams.analysisDepth,
        period: queryParams.period,
        adresse: queryParams.adresse
      };

      console.log('📊 [MacroAnalysis] LAUNCH processing request:', {
        url: 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        payload: launchPayload,
        timestamp: new Date().toISOString()
      });

      // Send launch request and wait for response - might contain immediate result
      try {
        const launchResponse = await safePostRequest('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', launchPayload);
        
        if (launchResponse.ok) {
          const launchResponseText = await launchResponse.text();
          console.log('📊 [MacroAnalysis] LAUNCH response text:', launchResponseText);
          
          if (launchResponseText.trim()) {
            const launchResponseJson = JSON.parse(launchResponseText);
            console.log('📊 [MacroAnalysis] LAUNCH response JSON:', launchResponseJson);
            
            // Check if this is the final result with status done
            if (launchResponseJson.status === 'done' || (Array.isArray(launchResponseJson) && launchResponseJson[0]?.message?.status === 'done')) {
              console.log('📊 [MacroAnalysis] Found immediate result in launch response!');
              
              let analysisContent = '';
              
              if (Array.isArray(launchResponseJson) && launchResponseJson[0]?.message?.message?.content?.content) {
                analysisContent = launchResponseJson[0].message.message.content.content;
              } else if (launchResponseJson.message?.content?.content) {
                analysisContent = launchResponseJson.message.content.content;
              } else if (launchResponseJson.content?.content) {
                analysisContent = launchResponseJson.content.content;
              } else {
                analysisContent = JSON.stringify(launchResponseJson, null, 2);
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
              localStorage.removeItem("strategist_job_id");
              setJobId(null);
              
              toast({
                title: "Analysis Completed",
                description: "Your macro analysis is ready"
              });
              return; // Don't start polling if we already have the result
            }
          }
        }
      } catch (error) {
        console.log('Launch request error, will start polling:', error);
      }

      // STEP 3: Start polling only if we didn't get immediate result
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
              <TechnicalDashboard selectedAsset={selectedAsset} />
            </CardContent>
          </Card>
        </div>

        {/* TradingView Widget powered by Supabase */}
        <TradingViewWidget 
          selectedSymbol={selectedAsset.symbol}
          onSymbolChange={(symbol) => {
            const asset = assets.find(a => a.symbol === symbol);
            if (asset) setSelectedAsset(asset);
          }}
        />

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
                  {jobStatus === "queued" && "Analysis queued..."}
                  {jobStatus === "running" && "Analysis in progress..."}
                  {!jobStatus && "Generating Analysis..."}
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