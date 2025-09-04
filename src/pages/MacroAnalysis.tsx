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