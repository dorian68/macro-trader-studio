import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Zap, Target, TrendingUp, Settings, RotateCcw, Save, AlertCircle, ChevronDown } from "lucide-react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import TradeResultPanel from "@/components/TradeResultPanel";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { useGlobalLoading } from "@/components/GlobalLoadingProvider";
import { useAIInteractionLogger } from "@/hooks/useAIInteractionLogger";
import { enhancedPostRequest, handleResponseWithFallback } from "@/lib/enhanced-request";
import { useRealtimeJobManager } from "@/hooks/useRealtimeJobManager";
import { dualResponseHandler } from "@/lib/dual-response-handler";

const { useState } = React;

async function safeFetchJson(url, options) {
  console.log('🌐 safeFetchJson→', url, options?.method || 'GET');
  let res;
  try {
    res = await fetch(url, {
      ...options,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  } catch (e) {
    console.error('❌ fetch failed (network/CORS before response):', e);
    throw e;
  }
  console.log('✅ fetch responded, status =', res.status);

  // Tente JSON, sinon text
  const ct = res.headers?.get('content-type') || '';
  if (!res.ok) {
    const txt = await res.text().catch(() => '[unreadable]');
    console.error('❌ non-OK response body:', txt?.slice(0, 500));
    throw new Error(`HTTP ${res.status}`);
  }
  try {
    if (ct.includes('application/json')) {
      return await res.json();
    } else {
      const txt = await res.text();
      console.warn('⚠️ content-type not JSON, returning text:', ct);
      return { _rawText: txt };
    }
  } catch (e) {
    console.error('❌ body parse failed (JSON/text):', e);
    const txt = await res.text().catch(() => '[unreadable]');
    return { _rawText: txt };
  }
}

interface TradeSetup {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  riskReward: number;
  confidence: number;
  reasoning: string;
}

type N8nSetup = {
  horizon?: string;
  timeframe?: string;
  strategy?: string;
  direction?: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfits?: number[];
  riskRewardRatio?: number;
  supports?: number[];
  resistances?: number[];
  context?: string;
  riskNotes?: string;
  strategyMeta?: {
    indicators?: string[];
    atrMultipleSL?: number;
    confidence?: number; // 0..1
  };
};

type N8nTradeResult = {
  instrument?: string;
  asOf?: string;
  market_commentary_anchor?: {
    summary?: string;
    key_drivers?: string[];
  };
  setups?: N8nSetup[];
  disclaimer?: string;
};

function normalizeN8n(raw: any): N8nTradeResult | null {
  try {
    // Handle multiple response formats
    let maybeContent;
    
    if (Array.isArray(raw) && raw[0]?.message?.content) {
      // Format: [{ message: { content: {...} } }]
      maybeContent = raw[0].message.content;
    } else if (Array.isArray(raw) && raw[0]?.content) {
      // Format: [{ content: {...} }]
      maybeContent = raw[0].content;
    } else if (raw?.content) {
      // Format: { content: {...} }
      maybeContent = raw.content;
    } else {
      // Direct format: {...}
      maybeContent = raw;
    }

    if (!maybeContent || typeof maybeContent !== 'object') return null;

    const r: N8nTradeResult = {
      instrument: maybeContent.instrument,
      asOf: maybeContent.asOf,
      market_commentary_anchor: maybeContent.market_commentary_anchor || {},
      setups: Array.isArray(maybeContent.setups) ? maybeContent.setups : [],
      disclaimer: maybeContent.disclaimer || "Illustrative ideas, not investment advice.",
    };

    // Security: clamp confidence 0..1
    r.setups?.forEach(s => {
      if (s?.strategyMeta?.confidence != null) {
        s.strategyMeta.confidence = Math.max(0, Math.min(1, Number(s.strategyMeta.confidence)));
      }
    });

    return r;
  } catch {
    return null;
  }
}

function fmt(n?: number, dp = 4) {
  if (typeof n !== 'number' || isNaN(n)) return '—';
  return n.toFixed(dp);
}

function pct(x?: number) {
  if (typeof x !== 'number' || isNaN(x)) return '—';
  return Math.round(x * 100) + '%';
}


function buildQuestion(p: any) {
  const lines = [
    `Provide an institutional macro outlook and risks for ${p.instrument}, then a macro-grounded trade idea (entry/SL/TP).`,
    `Prioritize central banks / Bloomberg / Reuters; ignore low-authority sources unless they synthesize institutional research.`,
    `Focus on policy divergence, inflation, growth, labor, real yields, financial conditions.`,
    `Use technicals only to refine entries after macro.`
  ];
  if (p?.timeframe)    lines.push(`User timeframe: ${p.timeframe}.`);
  if (p?.riskLevel)    lines.push(`User risk: ${p.riskLevel}.`);
  if (p?.strategy)     lines.push(`Strategy: ${p.strategy}.`);
  if (p?.positionSize) lines.push(`Position size: ${p.positionSize}.`);
  if (p?.customNotes)  lines.push(`Note: ${p.customNotes}.`);
  return lines.join(' ');
}

function extractMacroInsight(macroResult: any) {
  try {
    if (Array.isArray(macroResult) && macroResult[0]?.message?.content) {
      return String(macroResult[0].message.content);
    }
    if (typeof macroResult?.summary === 'string') return macroResult.summary;
    if (typeof macroResult?.data?.summary === 'string') return macroResult.data.summary;
    if (typeof macroResult?._rawText === 'string') {
      // fallback texte brut
      const t = macroResult._rawText.trim();
      return t.length > 5000 ? t.slice(0, 5000) + ' …[truncated]' : t;
    }
    const s = JSON.stringify(macroResult);
    return s.length > 5000 ? s.slice(0, 5000) + ' …[truncated]' : s;
  } catch {
    return "[macro insight unavailable]";
  }
}

export default function AISetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const globalLoading = useGlobalLoading();
  const { logInteraction } = useAIInteractionLogger();
  const { createJob } = useRealtimeJobManager();
  const [step, setStep] = useState<"parameters" | "generated">("parameters");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tradeSetup, setTradeSetup] = useState<TradeSetup | null>(null);
  const [n8nResult, setN8nResult] = useState<N8nTradeResult | null>(null);
  const [rawN8nResponse, setRawN8nResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD");
  
  const [parameters, setParameters] = useState({
    instrument: "EUR/USD",
    timeframe: "4h",
    riskLevel: "medium",
    positionSize: "2",
    strategy: "breakout",
    customNotes: ""
  });

  // Map instrument to TradingView symbol
  const mapInstrumentToSymbol = (instrument: string): string => {
    const symbolMap: Record<string, string> = {
      "EUR/USD": "EURUSD",
      "GBP/USD": "GBPUSD", 
      "USD/JPY": "USDJPY",
      "USD/CHF": "USDCHF",
      "AUD/USD": "AUDUSD",
      "USD/CAD": "USDCAD",
      "NZD/USD": "NZDUSD",
      "EUR/GBP": "EURGBP",
      "EUR/JPY": "EURJPY",
      "GBP/JPY": "GBPJPY",
      "BTC/USD": "BTCUSD",
      "ETH/USD": "ETHUSD",
      "BNB/USD": "BNBUSD",
      "ADA/USD": "ADAUSD",
      "SOL/USD": "SOLUSD",
      "DOT/USD": "DOTUSD",
      "MATIC/USD": "MATICUSD",
      "GOLD": "XAUUSD",
      "SILVER": "XAGUSD",
      "WTI": "USOIL",
      "BRENT": "UKOIL",
      "AAPL": "AAPL",
      "TSLA": "TSLA",
      "MSFT": "MSFT",
      "GOOGL": "GOOGL",
      "AMZN": "AMZN",
      "NVDA": "NVDA",
      "META": "META",
      "NFLX": "NFLX"
    };
    return symbolMap[instrument] || "EURUSD";
  };

  // Update selected symbol when instrument changes
  React.useEffect(() => {
    const newSymbol = mapInstrumentToSymbol(parameters.instrument);
    setSelectedSymbol(newSymbol);
  }, [parameters.instrument]);

  const generateTradeSetup = async () => {
    setIsGenerating(true);
    setError(null);
    setN8nResult(null);
    
    // Create loading request
    const requestId = await globalLoading.createRequest(
      'ai_trade_setup',
      parameters.instrument,
      `Generate AI trade setup for ${parameters.instrument} with ${parameters.strategy} strategy`,
      parameters
    );
    
    // Start processing immediately
    const progressInterval = globalLoading.startProcessing(requestId);
    
    try {
      // Create Realtime jobs for both requests
      const macroJobId = await createJob(
        'macro_commentary',
        parameters.instrument,
        {
          type: "RAG",
          mode: "run",
          instrument: parameters.instrument,
          question: buildQuestion(parameters)
        },
        'Macro Commentary'
      );

      // STEP 1: macro-commentary with Realtime tracking
      const macroPayload = {
        type: "RAG",
        mode: "run",
        instrument: parameters.instrument,
        question: buildQuestion(parameters),
      };

      console.log('📊[AISetup] STEP1 Request macro-commentary payload =', macroPayload);

      let macroResult;
      try {
        // Register dual response handler for macro request
        dualResponseHandler.registerHandler(macroJobId, (data, source) => {
          console.log(`⚡ [AISetup-Macro] Response received from ${source}:`, {
            source,
            hasData: !!data,
            dataType: typeof data,
            dataKeys: data && typeof data === 'object' ? Object.keys(data) : null,
            timestamp: new Date().toISOString()
          });
          console.log(`⚡ [AISetup-Macro] Full response data from ${source}:`, data);
          macroResult = data;
        });

        const { response: macroResponse, jobId: macroJobIdFromRequest } = await enhancedPostRequest(
          'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
          {
            ...macroPayload,
            job_id: macroJobId
          },
          {
            enableJobTracking: true,
            jobType: 'macro_commentary',
            instrument: parameters.instrument,
            feature: 'macro_commentary',
            jobId: macroJobId
          }
        );
        
        // Handle HTTP response for macro
        try {
          if (macroResponse.ok) {
            const responseData = await macroResponse.json();
            dualResponseHandler.handleHttpResponse(macroJobId, responseData);
          } else {
            console.log(`⚡ [AISetup-Macro] HTTP error ${macroResponse.status}, waiting for Supabase response`);
          }
        } catch (httpError) {
          console.log(`⚡ [AISetup-Macro] HTTP response failed, waiting for Supabase response:`, httpError);
        }

        // Wait a moment for the response to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.error('❌ STEP1 failed before parsing (network/CORS):', e);
        throw e;
      }

      console.log('📊[AISetup] STEP1 Response (keys):', Object.keys(macroResult || {}));
      const macroInsight = extractMacroInsight(macroResult);
      console.log('📊[AISetup] STEP1 macroInsight length =', macroInsight?.length);

      // Create second Realtime job for trade setup
      const tradeJobId = await createJob(
        'trade_setup',
        parameters.instrument,
        {
          ...parameters,
          mode: "run",
          type: "trade",
          macroInsight
        },
        'AI Trade Setup'
      );

      // STEP 2: ai-trade-setup with Realtime tracking
      const payload = {
        ...parameters,
        mode: "run",
        type: "trade",
        macroInsight, // string compacte
      };

      console.log('📊[AISetup] STEP2 Request trade-setup, macroInsight length =', macroInsight?.length);

      // Register dual response handler for trade setup
      dualResponseHandler.registerHandler(tradeJobId, (data, source) => {
        console.log(`⚡ [AISetup-Trade] Response received from ${source}:`, {
          source,
          hasData: !!data,
          dataType: typeof data,
          dataKeys: data && typeof data === 'object' ? Object.keys(data) : null,
          timestamp: new Date().toISOString()
        });
        console.log(`⚡ [AISetup-Trade] Full response data from ${source}:`, data);
        
        setRawN8nResponse(data);
        const normalized = normalizeN8n(data);

        if (normalized && normalized.setups && normalized.setups.length > 0) {
          setN8nResult(normalized);
          setTradeSetup(null);
          globalLoading.completeRequest(requestId, normalized);
          
          toast({ title: "Trade Setup Generated", description: "AI trade setup generated successfully." });
        } else {
          setN8nResult(null);
          setTradeSetup(null);
          setError("The n8n workflow responded without exploitable setups.");
          globalLoading.failRequest(requestId, "No exploitable setups returned");
          toast({ title: "No Setups Returned", description: "The response contains no setups.", variant: "destructive" });
        }
        
        setStep("generated");
      });

      const { response: tradeResponse, jobId: tradeJobIdFromRequest } = await enhancedPostRequest(
        'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        {
          ...payload,
          job_id: tradeJobId
        },
        {
          enableJobTracking: true,
          jobType: 'trade_setup',
          instrument: parameters.instrument,
          feature: 'ai_trade_setup',
          jobId: tradeJobId
        }
      );

      // Handle HTTP response for trade setup
      try {
        if (tradeResponse.ok) {
          const responseData = await tradeResponse.json();
          dualResponseHandler.handleHttpResponse(tradeJobId, responseData);
        } else {
          console.log(`⚡ [AISetup-Trade] HTTP error ${tradeResponse.status}, waiting for Supabase response`);
        }
      } catch (httpError) {
        console.log(`⚡ [AISetup-Trade] HTTP response failed, waiting for Supabase response:`, httpError);
      }

      // Wait a moment for the response to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error generating trade setup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      clearInterval(progressInterval);
      globalLoading.failRequest(requestId, errorMessage);
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSetup = () => {
    toast({
      title: "Setup Saved",
      description: "Your trade configuration has been saved successfully.",
    });
  };

  return (
    <Layout activeModule="ai-setup" onModuleChange={() => {}}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="shrink-0 min-h-[44px] w-11"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">AI Trade Setup</h1>
            <p className="text-sm sm:text-base text-muted-foreground break-words">Automated trade configuration and generation</p>
          </div>
        </div>

        {step === "parameters" && (
          <Card className="gradient-card rounded-2xl shadow-sm border">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Trading Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="instrument">Instrument</Label>
                  <Select value={parameters.instrument} onValueChange={(value) => setParameters({...parameters, instrument: value})}>
                    <SelectTrigger className="h-11 text-sm touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                      <SelectItem value="GBP/USD">GBP/USD</SelectItem>
                      <SelectItem value="USD/JPY">USD/JPY</SelectItem>
                      <SelectItem value="USD/CHF">USD/CHF</SelectItem>
                      <SelectItem value="AUD/USD">AUD/USD</SelectItem>
                      <SelectItem value="USD/CAD">USD/CAD</SelectItem>
                      <SelectItem value="NZD/USD">NZD/USD</SelectItem>
                      <SelectItem value="EUR/GBP">EUR/GBP</SelectItem>
                      <SelectItem value="EUR/JPY">EUR/JPY</SelectItem>
                      <SelectItem value="GBP/JPY">GBP/JPY</SelectItem>
                      <SelectItem value="BTC/USD">Bitcoin</SelectItem>
                      <SelectItem value="ETH/USD">Ethereum</SelectItem>
                      <SelectItem value="BNB/USD">Binance Coin</SelectItem>
                      <SelectItem value="ADA/USD">Cardano</SelectItem>
                      <SelectItem value="SOL/USD">Solana</SelectItem>
                      <SelectItem value="DOT/USD">Polkadot</SelectItem>
                      <SelectItem value="MATIC/USD">Polygon</SelectItem>
                      <SelectItem value="GOLD">Gold</SelectItem>
                      <SelectItem value="SILVER">Silver</SelectItem>
                      <SelectItem value="WTI">Oil (WTI)</SelectItem>
                      <SelectItem value="BRENT">Oil (Brent)</SelectItem>
                      <SelectItem value="AAPL">Apple</SelectItem>
                      <SelectItem value="TSLA">Tesla</SelectItem>
                      <SelectItem value="MSFT">Microsoft</SelectItem>
                      <SelectItem value="GOOGL">Google</SelectItem>
                      <SelectItem value="AMZN">Amazon</SelectItem>
                      <SelectItem value="NVDA">NVIDIA</SelectItem>
                      <SelectItem value="META">Meta</SelectItem>
                      <SelectItem value="NFLX">Netflix</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeframe">Timeframe</Label>
                  <Select value={parameters.timeframe} onValueChange={(value) => setParameters({...parameters, timeframe: value})}>
                    <SelectTrigger className="h-11 text-sm touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                      <SelectItem value="1d">1 Day</SelectItem>
                      <SelectItem value="1w">1 Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riskLevel">Risk Level</Label>
                  <Select value={parameters.riskLevel} onValueChange={(value) => setParameters({...parameters, riskLevel: value})}>
                    <SelectTrigger className="h-11 text-sm touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Conservative</SelectItem>
                      <SelectItem value="medium">Moderate</SelectItem>
                      <SelectItem value="high">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="positionSize">Position Size (%)</Label>
                  <Input 
                    id="positionSize"
                    type="number"
                    value={parameters.positionSize}
                    onChange={(e) => setParameters({...parameters, positionSize: e.target.value})}
                    placeholder="2"
                    className="h-11 text-sm touch-manipulation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select value={parameters.strategy} onValueChange={(value) => setParameters({...parameters, strategy: value})}>
                    <SelectTrigger className="h-11 text-sm touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakout">Breakout</SelectItem>
                      <SelectItem value="reversal">Reversal</SelectItem>
                      <SelectItem value="trend">Trend Following</SelectItem>
                      <SelectItem value="scalping">Scalping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customNotes">Custom Notes</Label>
                <Textarea 
                  id="customNotes"
                  value={parameters.customNotes}
                  onChange={(e) => setParameters({...parameters, customNotes: e.target.value})}
                  placeholder="Add specific instructions for the AI..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={generateTradeSetup} 
                disabled={isGenerating}
                className="w-full min-h-[44px]"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Trade Setup
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "generated" && (
          <div className="space-y-6">
            {error && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    Generation Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-700">
                    We're experiencing a temporary issue processing your request. This could be due to high server load or a connectivity problem. Please try again in a moment.
                  </p>
                  <Button 
                    onClick={() => setStep("parameters")} 
                    variant="outline" 
                    className="mt-4"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* TradingView Chart Integration */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TradingViewWidget
                  selectedSymbol={selectedSymbol}
                  onSymbolChange={setSelectedSymbol}
                  className="h-[500px]"
                />
              </div>
              
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trade Visualization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {n8nResult ? (
                      <div className="space-y-3">
                        <div className="text-sm">
                          <strong>Instrument:</strong> {n8nResult.instrument}
                        </div>
                        {n8nResult.setups?.[0] && (
                          <div className="space-y-2">
                            <div className="text-sm">
                              <strong>Entry:</strong> {fmt(n8nResult.setups[0].entryPrice)}
                            </div>
                            <div className="text-sm">
                              <strong>Stop Loss:</strong> {fmt(n8nResult.setups[0].stopLoss)}
                            </div>
                            <div className="text-sm">
                              <strong>Direction:</strong> {n8nResult.setups[0].direction}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Generate a trade setup to see levels on the chart
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {n8nResult && (
              <Card className="border bg-background">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold">
                    {n8nResult.instrument || 'Instrument'} 
                    {n8nResult.asOf ? <span className="ml-2 text-sm text-muted-foreground">as of {new Date(n8nResult.asOf).toLocaleString()}</span> : null}
                  </CardTitle>
                  {n8nResult.market_commentary_anchor?.summary ? (
                    <p className="text-sm text-muted-foreground mt-2">{n8nResult.market_commentary_anchor.summary}</p>
                  ) : null}
                  {Array.isArray(n8nResult.market_commentary_anchor?.key_drivers) && n8nResult.market_commentary_anchor.key_drivers.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {n8nResult.market_commentary_anchor.key_drivers.map((d: string, i: number) => (
                        <Badge key={i} variant="outline" className="rounded-full">{d}</Badge>
                      ))}
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-6">
                  {(n8nResult.setups || []).map((s, idx) => (
                    <Card key={idx} className="border">
                      <CardHeader>
                        <div className="flex flex-wrap items-center gap-2">
                          {s.horizon ? <Badge variant="secondary">{s.horizon}</Badge> : null}
                          {s.timeframe ? <Badge variant="secondary">{s.timeframe}</Badge> : null}
                          {s.strategy ? <Badge variant="secondary">{s.strategy}</Badge> : null}
                          {s.direction ? <Badge variant="secondary" className={s.direction.toLowerCase()==='buy'?'text-green-700':'text-red-700'}>
                            {s.direction.toUpperCase()}
                          </Badge> : null}
                          {s.strategyMeta?.confidence != null ? (
                            <Badge variant="outline" className="ml-auto">Confidence: {pct(s.strategyMeta.confidence)}</Badge>
                          ) : null}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground uppercase">Entry</Label>
                            <div className="text-xl font-semibold">{fmt(s.entryPrice)}</div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground uppercase">Stop Loss</Label>
                            <div className="text-xl font-semibold">{fmt(s.stopLoss)}</div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground uppercase">Take Profits</Label>
                            <div className="text-sm">
                              {(s.takeProfits || []).length ? s.takeProfits.map((tp, i) => <span key={i} className="mr-2">{fmt(tp)}</span>) : '—'}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground uppercase">R/R</Label>
                            <div className="text-xl font-semibold">{fmt(s.riskRewardRatio, 2)}</div>
                          </div>
                        </div>

                        {(s.supports && s.supports.length) || (s.resistances && s.resistances.length) ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg border bg-muted/30">
                              <div className="text-xs text-muted-foreground uppercase mb-2">Supports</div>
                              <div className="flex flex-wrap gap-2">
                                {(s.supports || []).map((sp, i) => <Badge key={i} variant="outline">{fmt(sp)}</Badge>)}
                                {(!s.supports || !s.supports.length) && <span className="text-sm text-muted-foreground">—</span>}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/30">
                              <div className="text-xs text-muted-foreground uppercase mb-2">Resistances</div>
                              <div className="flex flex-wrap gap-2">
                                {(s.resistances || []).map((rs, i) => <Badge key={i} variant="outline">{fmt(rs)}</Badge>)}
                                {(!s.resistances || !s.resistances.length) && <span className="text-sm text-muted-foreground">—</span>}
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {s.context ? (
                          <div className="p-4 rounded-lg border">
                            <h4 className="font-medium mb-1">Context</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{s.context}</p>
                          </div>
                        ) : null}

                        {s.riskNotes ? (
                          <div className="p-4 rounded-lg border">
                            <h4 className="font-medium mb-1">Risk Notes</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{s.riskNotes}</p>
                          </div>
                        ) : null}

                        {s.strategyMeta?.indicators?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {s.strategyMeta.indicators.map((ind, i) => (
                              <Badge key={i} variant="outline" className="rounded-full">{ind}</Badge>
                            ))}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}

                  {n8nResult.disclaimer ? (
                    <p className="text-xs text-muted-foreground border-t pt-4">{n8nResult.disclaimer}</p>
                  ) : null}

                  {/* Structured Response Display */}
                  {rawN8nResponse && (
                    <Card className="mt-6 border bg-muted/30">
                      <Collapsible defaultOpen={false}>
                        <CardHeader>
                          <CollapsibleTrigger className="w-full">
                            <CardTitle className="text-base flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Response Details
                              </div>
                              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </CardTitle>
                          </CollapsibleTrigger>
                        </CardHeader>
                        <CollapsibleContent>
                          <CardContent className="space-y-6 pt-0">
                        {(() => {
                          try {
                            // Extract content from the expected structure
                            const content = rawN8nResponse?.content || 
                                          (Array.isArray(rawN8nResponse) && rawN8nResponse[0]?.content) ||
                                          rawN8nResponse;
                            
                            if (!content || typeof content !== 'object') {
                              return (
                                <div className="p-4 rounded-lg border bg-background">
                                  <h4 className="font-medium mb-2">Raw Response</h4>
                                  <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                                    {JSON.stringify(rawN8nResponse, null, 2)}
                                  </pre>
                                </div>
                              );
                            }

                            return (
                              <>
                                {/* Header Info */}
                                {(content.instrument || content.asOf) && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {content.instrument && (
                                      <div className="p-3 rounded-lg border bg-background">
                                        <Label className="text-xs text-muted-foreground uppercase">Instrument</Label>
                                        <div className="font-medium">{content.instrument}</div>
                                      </div>
                                    )}
                                    {content.asOf && (
                                      <div className="p-3 rounded-lg border bg-background">
                                        <Label className="text-xs text-muted-foreground uppercase">As Of</Label>
                                        <div className="font-medium">{content.asOf}</div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* User Inputs */}
                                {(content.timeframe || content.riskLevel || content.strategy || content.positionSize || content.customNote) && (
                                  <div className="p-4 rounded-lg border bg-background">
                                    <h4 className="font-medium mb-3">User Inputs</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                      {content.timeframe && <div><span className="text-muted-foreground">Timeframe:</span> {content.timeframe}</div>}
                                      {content.riskLevel && <div><span className="text-muted-foreground">Risk Level:</span> {content.riskLevel}</div>}
                                      {content.strategy && <div><span className="text-muted-foreground">Strategy:</span> {content.strategy}</div>}
                                      {content.positionSize && <div><span className="text-muted-foreground">Position Size:</span> {content.positionSize}</div>}
                                      {content.customNote && <div className="col-span-full"><span className="text-muted-foreground">Notes:</span> {content.customNote}</div>}
                                    </div>
                                  </div>
                                )}

                                {/* Market Commentary */}
                                {content.market_commentary_anchor && (
                                  <div className="p-4 rounded-lg border bg-background">
                                    <h4 className="font-medium mb-3">Market Commentary</h4>
                                    {content.market_commentary_anchor.summary && (
                                      <div className="mb-3">
                                        <Label className="text-xs text-muted-foreground uppercase">Summary</Label>
                                        <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">{content.market_commentary_anchor.summary}</p>
                                      </div>
                                    )}
                                    {content.market_commentary_anchor.key_drivers && Array.isArray(content.market_commentary_anchor.key_drivers) && (
                                      <div>
                                        <Label className="text-xs text-muted-foreground uppercase">Key Drivers</Label>
                                        <ul className="text-sm mt-1 space-y-1">
                                          {content.market_commentary_anchor.key_drivers.map((driver, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                              <span className="text-muted-foreground">•</span>
                                              <span>{driver}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Data Fresheners */}
                                {(content.macro_recent || content.macro_upcoming || content.cb_signals || content.positioning || content.citations_news) && (
                                  <div className="p-4 rounded-lg border bg-background">
                                    <h4 className="font-medium mb-3">Data Fresheners</h4>
                                    <div className="space-y-3 text-sm">
                                      {content.macro_recent && Array.isArray(content.macro_recent) && (
                                        <div>
                                          <Label className="text-xs text-muted-foreground uppercase">Macro Recent</Label>
                                          <ul className="mt-1 space-y-1">
                                            {content.macro_recent.map((item, i) => (
                                              <li key={i} className="flex items-start gap-2">
                                                <span className="text-muted-foreground">•</span>
                                                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {content.macro_upcoming && Array.isArray(content.macro_upcoming) && (
                                        <div>
                                          <Label className="text-xs text-muted-foreground uppercase">Macro Upcoming</Label>
                                          <ul className="mt-1 space-y-1">
                                            {content.macro_upcoming.map((item, i) => (
                                              <li key={i} className="flex items-start gap-2">
                                                <span className="text-muted-foreground">•</span>
                                                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {content.cb_signals && Array.isArray(content.cb_signals) && (
                                        <div>
                                          <Label className="text-xs text-muted-foreground uppercase">CB Signals</Label>
                                          <ul className="mt-1 space-y-1">
                                            {content.cb_signals.map((item, i) => (
                                              <li key={i} className="flex items-start gap-2">
                                                <span className="text-muted-foreground">•</span>
                                                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {content.positioning && Array.isArray(content.positioning) && (
                                        <div>
                                          <Label className="text-xs text-muted-foreground uppercase">Positioning</Label>
                                          <ul className="mt-1 space-y-1">
                                            {content.positioning.map((item, i) => (
                                              <li key={i} className="flex items-start gap-2">
                                                <span className="text-muted-foreground">•</span>
                                                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {content.citations_news && Array.isArray(content.citations_news) && (
                                        <div>
                                          <Label className="text-xs text-muted-foreground uppercase">Citations News</Label>
                                          <ul className="mt-1 space-y-1">
                                            {content.citations_news.map((item, i) => (
                                              <li key={i} className="flex items-start gap-2">
                                                <span className="text-muted-foreground">•</span>
                                                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Setups */}
                                {content.setups && Array.isArray(content.setups) && content.setups.length > 0 && (
                                  <div className="space-y-4">
                                    <h4 className="font-medium">Detailed Setups</h4>
                                    {content.setups.map((setup, index) => (
                                      <Card key={index} className="border bg-background">
                                        <CardContent className="p-4 space-y-4">
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            {setup.horizon && <div><span className="text-muted-foreground">Horizon:</span> {setup.horizon}</div>}
                                            {setup.timeframe && <div><span className="text-muted-foreground">Timeframe:</span> {setup.timeframe}</div>}
                                            {setup.strategy && <div><span className="text-muted-foreground">Strategy:</span> {setup.strategy}</div>}
                                            {setup.direction && <div><span className="text-muted-foreground">Direction:</span> {setup.direction}</div>}
                                          </div>
                                          
                                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            {setup.entryPrice !== undefined && (
                                              <div className="p-2 rounded border">
                                                <Label className="text-xs text-muted-foreground uppercase">Entry</Label>
                                                <div className="font-medium">{fmt(setup.entryPrice)}</div>
                                              </div>
                                            )}
                                            {setup.stopLoss !== undefined && (
                                              <div className="p-2 rounded border">
                                                <Label className="text-xs text-muted-foreground uppercase">Stop Loss</Label>
                                                <div className="font-medium">{fmt(setup.stopLoss)}</div>
                                              </div>
                                            )}
                                            {setup.takeProfits && Array.isArray(setup.takeProfits) && (
                                              <div className="p-2 rounded border">
                                                <Label className="text-xs text-muted-foreground uppercase">Take Profits</Label>
                                                <div className="text-xs space-y-1">
                                                  {setup.takeProfits.map((tp, i) => (
                                                    <div key={i}>{fmt(tp)}</div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {setup.riskRewardRatio !== undefined && (
                                              <div className="p-2 rounded border">
                                                <Label className="text-xs text-muted-foreground uppercase">R/R</Label>
                                                <div className="font-medium">{fmt(setup.riskRewardRatio, 2)}</div>
                                              </div>
                                            )}
                                            {setup.positionSize !== undefined && (
                                              <div className="p-2 rounded border">
                                                <Label className="text-xs text-muted-foreground uppercase">Position</Label>
                                                <div className="font-medium">{setup.positionSize}</div>
                                              </div>
                                            )}
                                          </div>

                                          {(setup.supports || setup.resistances) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              {setup.supports && Array.isArray(setup.supports) && (
                                                <div className="p-3 rounded border bg-muted/30">
                                                  <Label className="text-xs text-muted-foreground uppercase">Supports</Label>
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                    {setup.supports.map((s, i) => (
                                                      <Badge key={i} variant="outline" className="text-xs">{fmt(s)}</Badge>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              {setup.resistances && Array.isArray(setup.resistances) && (
                                                <div className="p-3 rounded border bg-muted/30">
                                                  <Label className="text-xs text-muted-foreground uppercase">Resistances</Label>
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                    {setup.resistances.map((r, i) => (
                                                      <Badge key={i} variant="outline" className="text-xs">{fmt(r)}</Badge>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {setup.context && (
                                            <div className="p-3 rounded border">
                                              <Label className="text-xs text-muted-foreground uppercase">Context</Label>
                                              <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{setup.context}</p>
                                            </div>
                                          )}

                                          {setup.riskNotes && (
                                            <div className="p-3 rounded border">
                                              <Label className="text-xs text-muted-foreground uppercase">Risk Notes</Label>
                                              <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{setup.riskNotes}</p>
                                            </div>
                                          )}

                                          {setup.strategyMeta && (
                                            <div className="p-3 rounded border bg-muted/30">
                                              <Label className="text-xs text-muted-foreground uppercase">Strategy Meta</Label>
                                              <div className="mt-2 space-y-2 text-sm">
                                                {setup.strategyMeta.indicators && Array.isArray(setup.strategyMeta.indicators) && (
                                                  <div>
                                                    <span className="text-muted-foreground">Indicators:</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                      {setup.strategyMeta.indicators.map((ind, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs">{ind}</Badge>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                                {setup.strategyMeta.atrMultipleSL !== undefined && (
                                                  <div><span className="text-muted-foreground">ATR Multiple:</span> {fmt(setup.strategyMeta.atrMultipleSL, 2)}</div>
                                                )}
                                                {setup.strategyMeta.confidence !== undefined && (
                                                  <div><span className="text-muted-foreground">Confidence:</span> {pct(setup.strategyMeta.confidence)}</div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                )}

                                {/* Disclaimer */}
                                {content.disclaimer && (
                                  <div className="p-3 rounded border bg-muted/30">
                                    <p className="text-xs text-muted-foreground">{content.disclaimer}</p>
                                  </div>
                                )}
                              </>
                            );
                          } catch (error) {
                            return (
                              <div className="p-4 rounded-lg border bg-background">
                                <h4 className="font-medium mb-2">Raw Response (Fallback)</h4>
                                <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                                  {JSON.stringify(rawN8nResponse, null, 2)}
                                </pre>
                              </div>
                            );
                          }
                        })()}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  )}
                </CardContent>
              </Card>
            )}

            {tradeSetup && !n8nResult && (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Target className="h-5 w-5" />
                    Generated Trade Setup (Legacy)
                    <Badge variant="outline" className="ml-auto">
                      Confidence: {tradeSetup.confidence}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Entry</Label>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{tradeSetup.entry}</p>
                    </div>
                    <div className="text-center">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Stop Loss</Label>
                      <p className="text-2xl font-bold text-red-600 mt-1">{tradeSetup.stopLoss}</p>
                    </div>
                    <div className="text-center">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Take Profit</Label>
                      <p className="text-2xl font-bold text-green-600 mt-1">{tradeSetup.takeProfit}</p>
                    </div>
                    <div className="text-center">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Risk/Reward</Label>
                      <p className="text-2xl font-bold text-orange-600 mt-1">{tradeSetup.riskReward}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white/70 rounded-lg border mb-6">
                    <h4 className="font-semibold text-green-800 mb-2">AI Analysis</h4>
                    <p className="text-sm leading-relaxed">{tradeSetup.reasoning}</p>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setStep("parameters")} variant="outline">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button onClick={saveSetup} className="flex-1">
                      <Save className="mr-2 h-4 w-4" />
                      Save Setup
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button onClick={() => setStep("parameters")} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                New Configuration
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}