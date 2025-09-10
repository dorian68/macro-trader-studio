import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, Target, TrendingUp, Settings, RotateCcw, Save, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import TradeResultPanel from "@/components/TradeResultPanel";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { useGlobalLoading } from "@/components/GlobalLoadingProvider";

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
      // STEP 1: macro-commentary
      const macroPayload = {
        type: "RAG",
        mode: "run",
        instrument: parameters.instrument,
        question: buildQuestion(parameters),
      };

      console.log('📊[AISetup] STEP1 Request macro-commentary payload =', macroPayload);

      let macroResult;
      try {
        macroResult = await safeFetchJson(
          'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(macroPayload),
            signal: AbortSignal.timeout ? AbortSignal.timeout(120000) : undefined
          }
        );
      } catch (e) {
        console.error('❌ STEP1 failed before parsing (network/CORS):', e);
        throw e;
      }

      console.log('📊[AISetup] STEP1 Response (keys):', Object.keys(macroResult || {}));
      const macroInsight = extractMacroInsight(macroResult);
      console.log('📊[AISetup] STEP1 macroInsight length =', macroInsight?.length);

      // STEP 2: ai-trade-setup
      const payload = {
        ...parameters,
        mode: "run",
        type: "trade",
        macroInsight, // string compacte
      };

      console.log('📊[AISetup] STEP2 Request trade-setup, macroInsight length =', macroInsight?.length);

      const result = await safeFetchJson(
        'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout ? AbortSignal.timeout(120000) : undefined
        }
      );

      console.log('📊[AISetup] STEP2 Response received (keys):', Object.keys(result || {}));
      setRawN8nResponse(result);
      
      const normalized = normalizeN8n(result);

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
                    <SelectTrigger>
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
                    <SelectTrigger>
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
                    <SelectTrigger>
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select value={parameters.strategy} onValueChange={(value) => setParameters({...parameters, strategy: value})}>
                    <SelectTrigger>
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
                  <p className="text-sm text-red-700">{error}</p>
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

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-muted-foreground">Raw response</summary>
                    <pre className="mt-2 text-xs whitespace-pre-wrap">{JSON.stringify(rawN8nResponse, null, 2)}</pre>
                  </details>
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