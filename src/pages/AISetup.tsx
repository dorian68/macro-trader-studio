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
import { enhancedPostRequest } from "@/lib/enhanced-request";
import { useRealtimeJobManager } from "@/hooks/useRealtimeJobManager";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
const {
  useState,
  useEffect
} = React;
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
      return {
        _rawText: txt
      };
    }
  } catch (e) {
    console.error('❌ body parse failed (JSON/text):', e);
    const txt = await res.text().catch(() => '[unreadable]');
    return {
      _rawText: txt
    };
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
      disclaimer: maybeContent.disclaimer || "Illustrative ideas, not investment advice."
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
  const lines = [`Provide an institutional macro outlook and risks for ${p.instrument}, then a macro-grounded trade idea (entry/SL/TP).`, `Prioritize central banks / Bloomberg / Reuters; ignore low-authority sources unless they synthesize institutional research.`, `Focus on policy divergence, inflation, growth, labor, real yields, financial conditions.`, `Use technicals only to refine entries after macro.`];
  if (p?.timeframe) lines.push(`User timeframe: ${p.timeframe}.`);
  if (p?.riskLevel) lines.push(`User risk: ${p.riskLevel}.`);
  if (p?.strategy) lines.push(`Strategy: ${p.strategy}.`);
  if (p?.positionSize) lines.push(`Position size: ${p.positionSize}.`);
  if (p?.customNotes) lines.push(`Note: ${p.customNotes}.`);
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
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const globalLoading = useGlobalLoading();
  const {
    logInteraction,
    checkCredits
  } = useAIInteractionLogger();
  const {
    createJob
  } = useRealtimeJobManager();
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

  // Check for pending results from persistent notifications
  React.useEffect(() => {
    const pendingResult = sessionStorage.getItem('pendingResult');
    if (pendingResult) {
      try {
        const result = JSON.parse(pendingResult);
        if (result.type.includes('trade_setup') || result.type.includes('ai_trade_setup')) {
          setTradeSetup(result.resultData);
          setN8nResult(result.resultData);
          setStep("generated");
          sessionStorage.removeItem('pendingResult');
        }
      } catch (error) {
        console.error('Error parsing pending result:', error);
        sessionStorage.removeItem('pendingResult');
      }
    }
  }, []);

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
      "AVAX/USD": "AVAXUSD",
      "LINK/USD": "LINKUSD",
      "UNI/USD": "UNIUSD",
      "ATOM/USD": "ATOMUSD",
      "LTC/USD": "LTCUSD",
      "BCH/USD": "BCHUSD",
      "XRP/USD": "XRPUSD",
      "XLM/USD": "XLMUSD",
      "AXS/USD": "AXSUSD",
      "SAND/USD": "SANDUSD",
      "MANA/USD": "MANAUSD",
      "FTM/USD": "FTMUSD",
      "ALGO/USD": "ALGOUSD",
      "VET/USD": "VETUSD",
      "ICP/USD": "ICPUSD",
      "FIL/USD": "FILUSD",
      "THETA/USD": "THETAUSD",
      "TRX/USD": "TRXUSD",
      "EOS/USD": "EOSUSD",
      "XTZ/USD": "XTZUSD",
      "NEAR/USD": "NEARUSD",
      "FLOW/USD": "FLOWUSD",
      "EGLD/USD": "EGLDUSD",
      "APE/USD": "APEUSD",
      "CRV/USD": "CRVUSD",
      "LDO/USD": "LDOUSD",
      "ARB/USD": "ARBUSD",
      "OP/USD": "OPUSD",
      "RNDR/USD": "RNDRUSD",
      "GOLD": "XAUUSD",
      "SILVER": "XAGUSD",
      "WTI": "USOIL",
      "BRENT": "UKOIL",
      "COPPER": "COPPER",
      "PLATINUM": "XPTUSD",
      "PALLADIUM": "XPDUSD",
      "ALUMINUM": "ALUMINUM",
      "ZINC": "ZINC",
      "NICKEL": "NICKEL",
      "NATGAS": "NATGAS",
      "HEATING_OIL": "HEATING_OIL",
      "GASOLINE": "GASOLINE",
      "WHEAT": "WHEAT",
      "CORN": "CORN",
      "SOYBEANS": "SOYBEANS",
      "RICE": "RICE",
      "OATS": "OATS",
      "SUGAR": "SUGAR",
      "COFFEE": "COFFEE",
      "COCOA": "COCOA",
      "COTTON": "COTTON",
      "ORANGE_JUICE": "ORANGE_JUICE",
      "LUMBER": "LUMBER",
      "LIVE_CATTLE": "LIVE_CATTLE",
      "LEAN_HOGS": "LEAN_HOGS"
    };
    return symbolMap[instrument] || "EURUSD";
  };

  // Update selected symbol when instrument changes
  React.useEffect(() => {
    const newSymbol = mapInstrumentToSymbol(parameters.instrument);
    setSelectedSymbol(newSymbol);
  }, [parameters.instrument]);
  const generateTradeSetup = async () => {
    // CRITICAL: Check credits before allowing request (Investment Ideas)
    if (!checkCredits('ai_trade_setup')) {
      toast({
        title: "No credits remaining",
        description: "You have no remaining credits for AI Setup. Please upgrade your plan.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setN8nResult(null);
    console.log('🔄 [Loader] Starting AI trade setup generation');

    // Create loading request
    const requestId = await globalLoading.createRequest('ai_trade_setup', parameters.instrument, `Generate AI trade setup for ${parameters.instrument} with ${parameters.strategy} strategy`, parameters);

    // Start processing immediately
    const progressInterval = globalLoading.startProcessing(requestId);
    
    let channel: any = null;
    
    try {
      // SINGLE JOB: Merged macro commentary + trade setup request
      
      // 1. Build merged payload with all fields at root level
      const mergedPayload = {
        // Macro commentary structure (base)
        type: "RAG",
        mode: "run",
        instrument: parameters.instrument,
        question: buildQuestion(parameters),
        
        // Trade query flag
        isTradeQuery: true,
        
        // Trade setup data at root level (flattened)
        timeframe: parameters.timeframe,
        riskLevel: parameters.riskLevel,
        positionSize: parameters.positionSize,
        strategy: parameters.strategy,
        customNotes: parameters.customNotes
      };

      // 2. Create single job with macro_commentary type
      const jobId = await createJob(
        'macro_commentary',
        parameters.instrument,
        mergedPayload,
        'AI Trade Setup'
      );

      console.log('📊[AISetup] Single request with trade query, jobId =', jobId);
      
      const responsePromise = new Promise<void>((resolve, reject) => {
        // 3. Subscribe to Realtime BEFORE sending POST request
        console.log('📡 [Realtime] Subscribing to job updates before POST');
        channel = supabase
          .channel(`ai-setup-${jobId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'jobs',
              filter: `id=eq.${jobId}`
            },
            async (payload) => {
              const job = payload.new as any;
              console.log(`📡 [Realtime] Job update received:`, job);
              
              if (job.status === 'completed' && job.response_payload) {
                try {
                  console.log('✅ [Realtime] Trade setup response received');
                  console.log('🔄 [Loader] Stopping loader - Realtime response received');
                  
                  // Parse response_payload JSON if it's a string
                  let parsedPayload = job.response_payload;
                  if (typeof job.response_payload === 'string') {
                    try {
                      parsedPayload = JSON.parse(job.response_payload);
                    } catch (parseError) {
                      console.error('❌ [Realtime] Failed to parse response_payload JSON:', parseError);
                      setError("No result available yet.");
                      resolve();
                      return;
                    }
                  }
                  
                  setRawN8nResponse(parsedPayload);
                  const normalized = normalizeN8n(parsedPayload);

                  if (normalized && normalized.setups && normalized.setups.length > 0) {
                    setN8nResult(normalized);
                    setTradeSetup(null);
                    globalLoading.completeRequest(requestId, normalized);
                    
                    // Log AI interaction and decrement credit
                    await logInteraction({
                      featureName: 'ai_trade_setup',
                      userQuery: `Generate AI trade setup for ${parameters.instrument} with ${parameters.strategy} strategy, ${parameters.riskLevel} risk, position size ${parameters.positionSize}. ${parameters.customNotes}`,
                      aiResponse: normalized,
                      jobId: jobId
                    });
                    
                    toast({ title: "Trade Setup Generated", description: "AI trade setup generated successfully." });
                  } else {
                    setN8nResult(null);
                    setTradeSetup(null);
                    setError("No result available yet.");
                    globalLoading.failRequest(requestId, "No exploitable setups returned");
                    toast({ title: "No Setups Returned", description: "The response contains no setups.", variant: "destructive" });
                  }
                  
                  setStep("generated");
                  setIsGenerating(false);
                  resolve();
                } catch (error) {
                  console.error('❌ [Realtime] Error processing trade setup response:', error);
                  reject(error);
                }
              } else if (job.status === 'error') {
                console.log('❌ [Realtime] Job failed:', job.error_message);
                console.log('🔄 [Loader] Stopping loader - Realtime error received');
                setIsGenerating(false);
                setError(job.error_message || 'Job failed');
                globalLoading.failRequest(requestId, job.error_message || 'Job failed');
                reject(new Error(job.error_message || 'Job failed'));
              }
            }
          )
          .subscribe();
      });

      // 4. Send POST request after subscription is active (fire-and-forget)
      console.log('📊 [AISetup] Trade setup request:', {
        url: 'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
        payload: mergedPayload,
        jobId: jobId,
        timestamp: new Date().toISOString()
      });

      // HTTP request: log timeouts internally, don't break workflow
      try {
        const { response } = await enhancedPostRequest(
          'https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1',
          mergedPayload,
          {
            enableJobTracking: true,
            jobType: 'macro_commentary',
            instrument: parameters.instrument,
            feature: 'AI Trade Setup',
            jobId: jobId
          }
        );
        console.log('📩 [HTTP] Response received (ignored, waiting for Realtime)');
      } catch (httpError) {
        // Expected timeout - log internally, don't stop workflow
        console.log('⏱️ [HTTP] Request timeout (expected, waiting for Realtime)', httpError);
      }

      // 5. Wait for Realtime response (source of truth)
      await responsePromise;
      
      // Clean up channel after response
      if (channel) {
        supabase.removeChannel(channel);
      }
    } catch (error) {
      // This catch only handles unexpected errors (not HTTP timeouts)
      console.error('❌ [AISetup] Unexpected error:', error);
      clearInterval(progressInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
      setIsGenerating(false);
    }
  };
  // Check for pending results from View Result navigation
  useEffect(() => {
    const pendingResult = sessionStorage.getItem('pendingResult');
    if (pendingResult) {
      try {
        const result = JSON.parse(pendingResult);
        if (result.type === 'ai_trade_setup') {
          console.log('📍 [AISetup] Processing pending result from View Result:', result);
          
          // Inject the result data directly
          const parsedPayload = result.resultData;
          const normalized = normalizeN8n(parsedPayload);

          if (normalized && normalized.setups && normalized.setups.length > 0) {
            setRawN8nResponse(parsedPayload);
            setN8nResult(normalized);
            setTradeSetup(null);
            setStep("generated");
            
            toast({
              title: "Trade Setup Loaded",
              description: "Your AI trade setup has been loaded."
            });
          }
          
          // Clear the pending result
          sessionStorage.removeItem('pendingResult');
        }
      } catch (error) {
        console.error('❌ [AISetup] Error parsing pending result:', error);
        sessionStorage.removeItem('pendingResult');
      }
    }
  }, [toast]);

  const saveSetup = () => {
    toast({
      title: "Setup Saved",
      description: "Your trade configuration has been saved successfully."
    });
  };
  return <Layout activeModule="ai-setup" onModuleChange={() => {}}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')} className="shrink-0 min-h-[44px] w-11">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">AI Trade Setup</h1>
            <p className="text-sm sm:text-base text-muted-foreground break-words">Automated trade configuration and generation</p>
          </div>
        </div>

        {step === "parameters" && <Card className="gradient-card rounded-2xl shadow-sm border">
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
                  <Select value={parameters.instrument} onValueChange={value => setParameters({
                ...parameters,
                instrument: value
              })}>
                    <SelectTrigger className="h-11 text-sm touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Forex Currencies */}
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
                      
                      {/* Crypto Currencies */}
                      <SelectItem value="BTC/USD">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="ETH/USD">Ethereum (ETH)</SelectItem>
                      <SelectItem value="BNB/USD">Binance Coin (BNB)</SelectItem>
                      <SelectItem value="ADA/USD">Cardano (ADA)</SelectItem>
                      <SelectItem value="SOL/USD">Solana (SOL)</SelectItem>
                      <SelectItem value="DOT/USD">Polkadot (DOT)</SelectItem>
                      <SelectItem value="MATIC/USD">Polygon (MATIC)</SelectItem>
                      <SelectItem value="AVAX/USD">Avalanche (AVAX)</SelectItem>
                      <SelectItem value="LINK/USD">Chainlink (LINK)</SelectItem>
                      <SelectItem value="UNI/USD">Uniswap (UNI)</SelectItem>
                      <SelectItem value="ATOM/USD">Cosmos (ATOM)</SelectItem>
                      <SelectItem value="LTC/USD">Litecoin (LTC)</SelectItem>
                      <SelectItem value="BCH/USD">Bitcoin Cash (BCH)</SelectItem>
                      <SelectItem value="XRP/USD">Ripple (XRP)</SelectItem>
                      <SelectItem value="XLM/USD">Stellar (XLM)</SelectItem>
                      <SelectItem value="AXS/USD">Axie Infinity (AXS)</SelectItem>
                      <SelectItem value="SAND/USD">The Sandbox (SAND)</SelectItem>
                      <SelectItem value="MANA/USD">Decentraland (MANA)</SelectItem>
                      <SelectItem value="FTM/USD">Fantom (FTM)</SelectItem>
                      <SelectItem value="ALGO/USD">Algorand (ALGO)</SelectItem>
                      <SelectItem value="VET/USD">VeChain (VET)</SelectItem>
                      <SelectItem value="ICP/USD">Internet Computer (ICP)</SelectItem>
                      <SelectItem value="FIL/USD">Filecoin (FIL)</SelectItem>
                      <SelectItem value="THETA/USD">Theta Network (THETA)</SelectItem>
                      <SelectItem value="TRX/USD">TRON (TRX)</SelectItem>
                      <SelectItem value="EOS/USD">EOS (EOS)</SelectItem>
                      <SelectItem value="XTZ/USD">Tezos (XTZ)</SelectItem>
                      <SelectItem value="NEAR/USD">NEAR Protocol (NEAR)</SelectItem>
                      <SelectItem value="FLOW/USD">Flow (FLOW)</SelectItem>
                      <SelectItem value="EGLD/USD">MultiversX (EGLD)</SelectItem>
                      <SelectItem value="APE/USD">ApeCoin (APE)</SelectItem>
                      <SelectItem value="CRV/USD">Curve DAO (CRV)</SelectItem>
                      <SelectItem value="LDO/USD">Lido DAO (LDO)</SelectItem>
                      <SelectItem value="ARB/USD">Arbitrum (ARB)</SelectItem>
                      <SelectItem value="OP/USD">Optimism (OP)</SelectItem>
                      <SelectItem value="RNDR/USD">Render Token (RNDR)</SelectItem>
                      
                      {/* Commodities */}
                      <SelectItem value="GOLD">Gold</SelectItem>
                      <SelectItem value="SILVER">Silver</SelectItem>
                      <SelectItem value="WTI">Oil (WTI)</SelectItem>
                      <SelectItem value="BRENT">Oil (Brent)</SelectItem>
                      <SelectItem value="COPPER">Copper</SelectItem>
                      <SelectItem value="PLATINUM">Platinum</SelectItem>
                      <SelectItem value="PALLADIUM">Palladium</SelectItem>
                      <SelectItem value="ALUMINUM">Aluminum</SelectItem>
                      <SelectItem value="ZINC">Zinc</SelectItem>
                      <SelectItem value="NICKEL">Nickel</SelectItem>
                      <SelectItem value="NATGAS">Natural Gas</SelectItem>
                      <SelectItem value="HEATING_OIL">Heating Oil</SelectItem>
                      <SelectItem value="GASOLINE">Gasoline</SelectItem>
                      <SelectItem value="WHEAT">Wheat</SelectItem>
                      <SelectItem value="CORN">Corn</SelectItem>
                      <SelectItem value="SOYBEANS">Soybeans</SelectItem>
                      <SelectItem value="RICE">Rice</SelectItem>
                      <SelectItem value="OATS">Oats</SelectItem>
                      <SelectItem value="SUGAR">Sugar</SelectItem>
                      <SelectItem value="COFFEE">Coffee</SelectItem>
                      <SelectItem value="COCOA">Cocoa</SelectItem>
                      <SelectItem value="COTTON">Cotton</SelectItem>
                      <SelectItem value="ORANGE_JUICE">Orange Juice</SelectItem>
                      <SelectItem value="LUMBER">Lumber</SelectItem>
                      <SelectItem value="LIVE_CATTLE">Live Cattle</SelectItem>
                      <SelectItem value="LEAN_HOGS">Lean Hogs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeframe">Timeframe</Label>
                  <Select value={parameters.timeframe} onValueChange={value => setParameters({
                ...parameters,
                timeframe: value
              })}>
                    <SelectTrigger className="h-11 text-sm touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="1m">1 Minute</SelectItem>
                       <SelectItem value="5m">5 Minutes</SelectItem>
                       <SelectItem value="15m">15 Minutes</SelectItem>
                       <SelectItem value="30m">30 Minutes</SelectItem>
                       <SelectItem value="1h">1 Hour</SelectItem>
                       <SelectItem value="4h">4 Hours</SelectItem>
                       <SelectItem value="D">1 Day</SelectItem>
                       <SelectItem value="W">1 Week</SelectItem>
                       <SelectItem value="M">1 Month</SelectItem>
                     </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riskLevel">Risk Level</Label>
                  <Select value={parameters.riskLevel} onValueChange={value => setParameters({
                ...parameters,
                riskLevel: value
              })}>
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
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select value={parameters.strategy} onValueChange={value => setParameters({
                ...parameters,
                strategy: value
              })}>
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
                <div className="relative">
                  <Textarea id="customNotes" value={parameters.customNotes} onChange={e => {
                const value = e.target.value;
                if (value.length <= 500) {
                  setParameters({
                    ...parameters,
                    customNotes: value
                  });
                }
              }} placeholder="Add specific instructions for the AI..." rows={3} className="pb-8" maxLength={500} />
                  <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                    {parameters.customNotes.length}/500
                  </div>
                </div>
              </div>

              <Button onClick={generateTradeSetup} disabled={isGenerating} className="w-full min-h-[44px]" size="lg">
                {isGenerating ? <>
                    <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </> : <>
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Trade Setup
                  </>}
              </Button>
            </CardContent>
          </Card>}

        {step === "generated" && <div className="space-y-6">
            {error && <Card className="border-red-200 bg-red-50/50">
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
                  <Button onClick={() => setStep("parameters")} variant="outline" className="mt-4">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </CardContent>
              </Card>}

            {/* TradingView Chart Integration */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 order-2 lg:order-none">
                <TradingViewWidget selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} className="h-[500px]" />
              </div>
              
              <div className="space-y-4 order-1 lg:order-none">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trade Visualization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {n8nResult ? <div className="space-y-3">
                        <div className="text-sm">
                          <strong>Instrument:</strong> {n8nResult.instrument}
                        </div>
                        {n8nResult.setups?.[0] && <div className="space-y-2">
                            <div className="text-sm">
                              <strong>Entry:</strong> {fmt(n8nResult.setups[0].entryPrice)}
                            </div>
                            <div className="text-sm">
                              <strong>Stop Loss:</strong> {fmt(n8nResult.setups[0].stopLoss)}
                            </div>
                            <div className="text-sm">
                              <strong>Direction:</strong> {n8nResult.setups[0].direction}
                            </div>
                          </div>}
                      </div> : <p className="text-sm text-muted-foreground">
                        Generate a trade setup to see levels on the chart
                      </p>}
                  </CardContent>
                </Card>
              </div>
            </div>

            {n8nResult && <Card className="border bg-background">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold">
                    {n8nResult.instrument || 'Instrument'} 
                    {n8nResult.asOf ? <span className="ml-2 text-sm text-muted-foreground">as of {new Date(n8nResult.asOf).toLocaleString()}</span> : null}
                  </CardTitle>
                  {n8nResult.market_commentary_anchor?.summary ? <p className="text-sm text-muted-foreground mt-2">{n8nResult.market_commentary_anchor.summary}</p> : null}
                  {Array.isArray(n8nResult.market_commentary_anchor?.key_drivers) && n8nResult.market_commentary_anchor.key_drivers.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">
                      {n8nResult.market_commentary_anchor.key_drivers.map((d: string, i: number) => <Badge key={i} variant="outline" className="rounded-full">{d}</Badge>)}
                    </div> : null}
                </CardHeader>
                <CardContent className="space-y-6">
                  {(n8nResult.setups || []).map((s, idx) => <Card key={idx} className="border">
                      <CardHeader>
                        <div className="flex flex-wrap items-center gap-2">
                          {s.horizon ? <Badge variant="secondary">{s.horizon}</Badge> : null}
                          {s.timeframe ? <Badge variant="secondary">{s.timeframe}</Badge> : null}
                          {s.strategy ? <Badge variant="secondary">{s.strategy}</Badge> : null}
                          {s.direction ? <Badge variant="secondary" className={s.direction.toLowerCase() === 'buy' ? 'text-green-700' : 'text-red-700'}>
                            {s.direction.toUpperCase()}
                          </Badge> : null}
                          {s.strategyMeta?.confidence != null ? <Badge variant="outline" className="ml-auto">Confidence: {pct(s.strategyMeta.confidence)}</Badge> : null}
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

                        {s.supports && s.supports.length || s.resistances && s.resistances.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          </div> : null}

                        {s.context ? <div className="p-4 rounded-lg border">
                            <h4 className="font-medium mb-1">Context</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{s.context}</p>
                          </div> : null}

                        {s.riskNotes ? <div className="p-4 rounded-lg border">
                            <h4 className="font-medium mb-1">Risk Notes</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{s.riskNotes}</p>
                          </div> : null}

                        {s.strategyMeta?.indicators?.length ? <div className="flex flex-wrap gap-2">
                            {s.strategyMeta.indicators.map((ind, i) => <Badge key={i} variant="outline" className="rounded-full">{ind}</Badge>)}
                          </div> : null}
                      </CardContent>
                    </Card>)}

                  {n8nResult.disclaimer ? <p className="text-xs text-muted-foreground border-t pt-4">{n8nResult.disclaimer}</p> : null}

                  {/* Structured Response Display */}
                  {rawN8nResponse && <Card className="mt-6 border bg-muted/30">
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
                        const content = rawN8nResponse?.content || Array.isArray(rawN8nResponse) && rawN8nResponse[0]?.content || rawN8nResponse;
                        if (!content || typeof content !== 'object') {
                          return <div className="p-4 rounded-lg border bg-background">
                                  <h4 className="font-medium mb-2">Raw Response</h4>
                                  <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                                    {JSON.stringify(rawN8nResponse, null, 2)}
                                  </pre>
                                </div>;
                        }
                        return <>
                                {/* Header Info */}
                                {(content.instrument || content.asOf) && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {content.instrument && <div className="p-3 rounded-lg border bg-background">
                                        <Label className="text-xs text-muted-foreground uppercase">Instrument</Label>
                                        <div className="font-medium">{content.instrument}</div>
                                      </div>}
                                    {content.asOf && <div className="p-3 rounded-lg border bg-background">
                                        <Label className="text-xs text-muted-foreground uppercase">As Of</Label>
                                        <div className="font-medium">{content.asOf}</div>
                                      </div>}
                                  </div>}

                                {/* User Inputs */}
                                {(content.timeframe || content.riskLevel || content.strategy || content.positionSize || content.customNote) && <div className="p-4 rounded-lg border bg-background">
                                    <h4 className="font-medium mb-3">User Inputs</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                      {content.timeframe && <div><span className="text-muted-foreground">Timeframe:</span> {content.timeframe}</div>}
                                      {content.riskLevel && <div><span className="text-muted-foreground">Risk Level:</span> {content.riskLevel}</div>}
                                      {content.strategy && <div><span className="text-muted-foreground">Strategy:</span> {content.strategy}</div>}
                                      {content.positionSize && <div><span className="text-muted-foreground">Position Size:</span> {content.positionSize}</div>}
                                      {content.customNote && <div className="col-span-full"><span className="text-muted-foreground">Notes:</span> {content.customNote}</div>}
                                    </div>
                                  </div>}

                                {/* Market Commentary */}
                                {content.market_commentary_anchor && <div className="p-4 rounded-lg border bg-background">
                                    <h4 className="font-medium mb-3">Market Commentary</h4>
                                    {content.market_commentary_anchor.summary && <div className="mb-3">
                                        <Label className="text-xs text-muted-foreground uppercase">Summary</Label>
                                        <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">{content.market_commentary_anchor.summary}</p>
                                      </div>}
                                    {content.market_commentary_anchor.key_drivers && Array.isArray(content.market_commentary_anchor.key_drivers) && <div>
                                        <Label className="text-xs text-muted-foreground uppercase">Key Drivers</Label>
                                        <ul className="text-sm mt-1 space-y-1">
                                          {content.market_commentary_anchor.key_drivers.map((driver, i) => <li key={i} className="flex items-start gap-2">
                                              <span className="text-muted-foreground">•</span>
                                              <span>{driver}</span>
                                            </li>)}
                                        </ul>
                                      </div>}
                                  </div>}

                                {/* Data Fresheners */}
                                {(content.macro_recent || content.macro_upcoming || content.cb_signals || content.positioning || content.citations_news) && <div className="p-4 rounded-lg border bg-background">
                                    <h4 className="font-medium mb-3">Data Fresheners</h4>
                                    <div className="space-y-3 text-sm">
                                      {content.macro_recent && Array.isArray(content.macro_recent) && <div>
                                          <Label className="text-xs text-muted-foreground uppercase">Macro Recent</Label>
                                          <ul className="mt-1 space-y-1">
                                            {content.macro_recent.map((item, i) => <li key={i} className="flex items-start gap-2">
                                                <span className="text-muted-foreground">•</span>
                                                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                              </li>)}
                                          </ul>
                                        </div>}
                                      {content.macro_upcoming && Array.isArray(content.macro_upcoming) && <div>
                                          <Label className="text-xs text-muted-foreground uppercase">Macro Upcoming</Label>
                                          <ul className="mt-1 space-y-1">
                                            {content.macro_upcoming.map((item, i) => <li key={i} className="flex items-start gap-2">
                                                <span className="text-muted-foreground">•</span>
                                                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                              </li>)}
                                          </ul>
                                        </div>}
                                      {content.cb_signals && Array.isArray(content.cb_signals) && <div>
                                          <Label className="text-xs text-muted-foreground uppercase">CB Signals</Label>
                                          <ul className="mt-1 space-y-1">
                                            {content.cb_signals.map((item, i) => <li key={i} className="flex items-start gap-2">
                                                <span className="text-muted-foreground">•</span>
                                                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                              </li>)}
                                          </ul>
                                        </div>}
                                      {content.positioning && Array.isArray(content.positioning) && <div>
                                          <Label className="text-xs text-muted-foreground uppercase">Positioning</Label>
                                          <ul className="mt-1 space-y-1">
                                            {content.positioning.map((item, i) => <li key={i} className="flex items-start gap-2">
                                                <span className="text-muted-foreground">•</span>
                                                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                              </li>)}
                                          </ul>
                                        </div>}
                                      {content.citations_news && Array.isArray(content.citations_news) && <div>
                                          <Label className="text-xs text-muted-foreground uppercase">Citations News</Label>
                                          <ul className="mt-1 space-y-1">
                                            {content.citations_news.map((item, i) => <li key={i} className="flex items-start gap-2">
                                                <span className="text-muted-foreground">•</span>
                                                <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                              </li>)}
                                          </ul>
                                        </div>}
                                    </div>
                                  </div>}

                                {/* Setups */}
                                {content.setups && Array.isArray(content.setups) && content.setups.length > 0 && <div className="space-y-4">
                                    <h4 className="font-medium">Detailed Setups</h4>
                                    {content.setups.map((setup, index) => <Card key={index} className="border bg-background">
                                        <CardContent className="p-4 space-y-4">
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            {setup.horizon && <div><span className="text-muted-foreground">Horizon:</span> {setup.horizon}</div>}
                                            {setup.timeframe && <div><span className="text-muted-foreground">Timeframe:</span> {setup.timeframe}</div>}
                                            {setup.strategy && <div><span className="text-muted-foreground">Strategy:</span> {setup.strategy}</div>}
                                            {setup.direction && <div><span className="text-muted-foreground">Direction:</span> {setup.direction}</div>}
                                          </div>
                                          
                                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            {setup.entryPrice !== undefined && <div className="p-2 rounded border">
                                                <Label className="text-xs text-muted-foreground uppercase">Entry</Label>
                                                <div className="font-medium">{fmt(setup.entryPrice)}</div>
                                              </div>}
                                            {setup.stopLoss !== undefined && <div className="p-2 rounded border">
                                                <Label className="text-xs text-muted-foreground uppercase">Stop Loss</Label>
                                                <div className="font-medium">{fmt(setup.stopLoss)}</div>
                                              </div>}
                                            {setup.takeProfits && Array.isArray(setup.takeProfits) && <div className="p-2 rounded border">
                                                <Label className="text-xs text-muted-foreground uppercase">Take Profits</Label>
                                                <div className="text-xs space-y-1">
                                                  {setup.takeProfits.map((tp, i) => <div key={i}>{fmt(tp)}</div>)}
                                                </div>
                                              </div>}
                                            {setup.riskRewardRatio !== undefined && <div className="p-2 rounded border">
                                                <Label className="text-xs text-muted-foreground uppercase">R/R</Label>
                                                <div className="font-medium">{fmt(setup.riskRewardRatio, 2)}</div>
                                              </div>}
                                            {setup.positionSize !== undefined && <div className="p-2 rounded border">
                                                <Label className="text-xs text-muted-foreground uppercase">Position</Label>
                                                <div className="font-medium">{setup.positionSize}</div>
                                              </div>}
                                          </div>

                                          {(setup.supports || setup.resistances) && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              {setup.supports && Array.isArray(setup.supports) && <div className="p-3 rounded border bg-muted/30">
                                                  <Label className="text-xs text-muted-foreground uppercase">Supports</Label>
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                    {setup.supports.map((s, i) => <Badge key={i} variant="outline" className="text-xs">{fmt(s)}</Badge>)}
                                                  </div>
                                                </div>}
                                              {setup.resistances && Array.isArray(setup.resistances) && <div className="p-3 rounded border bg-muted/30">
                                                  <Label className="text-xs text-muted-foreground uppercase">Resistances</Label>
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                    {setup.resistances.map((r, i) => <Badge key={i} variant="outline" className="text-xs">{fmt(r)}</Badge>)}
                                                  </div>
                                                </div>}
                                            </div>}

                                          {setup.context && <div className="p-3 rounded border">
                                              <Label className="text-xs text-muted-foreground uppercase">Context</Label>
                                              <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{setup.context}</p>
                                            </div>}

                                          {setup.riskNotes && <div className="p-3 rounded border">
                                              <Label className="text-xs text-muted-foreground uppercase">Risk Notes</Label>
                                              <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{setup.riskNotes}</p>
                                            </div>}

                                          {setup.strategyMeta && <div className="p-3 rounded border bg-muted/30">
                                              <Label className="text-xs text-muted-foreground uppercase">Strategy Meta</Label>
                                              <div className="mt-2 space-y-2 text-sm">
                                                {setup.strategyMeta.indicators && Array.isArray(setup.strategyMeta.indicators) && <div>
                                                    <span className="text-muted-foreground">Indicators:</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                      {setup.strategyMeta.indicators.map((ind, i) => <Badge key={i} variant="outline" className="text-xs">{ind}</Badge>)}
                                                    </div>
                                                  </div>}
                                                {setup.strategyMeta.atrMultipleSL !== undefined && <div><span className="text-muted-foreground">ATR Multiple:</span> {fmt(setup.strategyMeta.atrMultipleSL, 2)}</div>}
                                                {setup.strategyMeta.confidence !== undefined && <div><span className="text-muted-foreground">Confidence:</span> {pct(setup.strategyMeta.confidence)}</div>}
                                              </div>
                                            </div>}
                                        </CardContent>
                                      </Card>)}
                                  </div>}

                                {/* Disclaimer */}
                                {content.disclaimer && <div className="p-3 rounded border bg-muted/30">
                                    <p className="text-xs text-muted-foreground">{content.disclaimer}</p>
                                  </div>}
                              </>;
                      } catch (error) {
                        return <div className="p-4 rounded-lg border bg-background">
                                <h4 className="font-medium mb-2">Raw Response (Fallback)</h4>
                                <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                                  {JSON.stringify(rawN8nResponse, null, 2)}
                                </pre>
                              </div>;
                      }
                    })()}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>}
                </CardContent>
              </Card>}

            {tradeSetup && !n8nResult && <Card className="border-green-200 bg-green-50/50">
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
              </Card>}

            <div className="flex gap-3">
              <Button onClick={() => setStep("parameters")} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                New Configuration
              </Button>
            </div>
          </div>}
      </div>
    </Layout>;
}