import React, { useState } from "react";
import Layout from "@/components/Layout";
import { SuperUserGuard } from "@/components/SuperUserGuard";
import { LabsComingSoon } from "@/components/labs/LabsComingSoon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Play,
  AlertCircle,
  Settings2,
  Target,
  ArrowLeft,
  Layers,
  TrendingUp,
  TrendingDown,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForceLanguage } from "@/hooks/useForceLanguage";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ============================================================================
// TYPES
// ============================================================================

interface N8nSetup {
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
    confidence?: number;
  };
}

interface N8nTradeResult {
  instrument?: string;
  asOf?: string;
  market_commentary_anchor?: {
    summary?: string;
    key_drivers?: string[];
  };
  setups?: N8nSetup[];
  disclaimer?: string;
}

interface ForecastHorizon {
  h: string;
  direction?: string;
  entry_price?: number;
  entry_type?: string;
  entry_method?: string;
  forecast?: {
    medianPrice?: number;
    p20?: number;
    p80?: number;
  };
  tp?: number;
  sl?: number;
  riskReward?: number;
  prob_hit_tp_before_sl?: number;
  confidence?: number;
  position_size?: number;
  model?: {
    mean?: string;
    vol?: string;
  };
}

interface TradeSetupResponse {
  payload?: {
    horizons?: ForecastHorizon[] | Record<string, ForecastHorizon>;
    entry_price?: number;
  };
  metadata?: Record<string, unknown>;
  predictions?: Record<string, unknown>;
}

interface CombinedResponse extends N8nTradeResult {
  trade_setup?: TradeSetupResponse;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALLOWED_ASSETS = ["AUD/USD", "EUR/USD", "BTC/USD", "ETH/USD", "XAU/USD", "XLM/USD"];
const TIMEFRAMES = ["15min", "30min", "1h", "4h"];
const RISK_LEVELS = [
  { value: "low", label: "Conservative" },
  { value: "medium", label: "Moderate" },
  { value: "high", label: "Aggressive" },
];
const STRATEGIES = [
  { value: "breakout", label: "Breakout" },
  { value: "trend_following", label: "Trend Following" },
  { value: "mean_reversion", label: "Mean Reversion" },
  { value: "momentum", label: "Momentum" },
];

// ============================================================================
// HELPERS
// ============================================================================

function normalizeN8n(raw: unknown): N8nTradeResult | null {
  try {
    let maybeContent: unknown;
    const rawObj = raw as Record<string, unknown>;
    
    // Priority 1: output.final_answer (Trade Generator response format)
    if (rawObj?.output && typeof rawObj.output === "object") {
      const output = rawObj.output as Record<string, unknown>;
      if (output?.final_answer) {
        maybeContent = output.final_answer;
      }
    }
    
    // Fallback paths for other formats
    if (!maybeContent) {
      if (Array.isArray(raw) && (raw[0] as { message?: { content?: unknown } })?.message?.content) {
        maybeContent = (raw[0] as { message: { content: unknown } }).message.content;
      } else if (Array.isArray(raw) && (raw[0] as { content?: unknown })?.content) {
        maybeContent = (raw[0] as { content: unknown }).content;
      } else if (rawObj?.content) {
        maybeContent = rawObj.content;
      } else {
        maybeContent = raw;
      }
    }
    
    // Parse JSON strings (backend may return stringified JSON in final_answer)
    if (typeof maybeContent === "string") {
      try {
        maybeContent = JSON.parse(maybeContent);
      } catch {
        return null;
      }
    }
    
    if (!maybeContent || typeof maybeContent !== "object") return null;
    const c = maybeContent as Record<string, unknown>;
    const r: N8nTradeResult = {
      instrument: c.instrument as string | undefined,
      asOf: c.asOf as string | undefined,
      market_commentary_anchor: c.market_commentary_anchor as N8nTradeResult["market_commentary_anchor"],
      setups: Array.isArray(c.setups) ? (c.setups as N8nSetup[]) : [],
      disclaimer: (c.disclaimer as string) || "Illustrative ideas, not investment advice.",
    };
    r.setups?.forEach((s) => {
      if (s?.strategyMeta?.confidence != null) {
        s.strategyMeta.confidence = Math.max(0, Math.min(1, Number(s.strategyMeta.confidence)));
      }
    });
    return r;
  } catch {
    return null;
  }
}

function getPayloadHorizons(responseData: unknown): ForecastHorizon[] {
  // Try multiple paths to find horizons data
  const data = responseData as Record<string, unknown>;
  
  // Path 1: data.payload.horizons (current API response format)
  let horizons: ForecastHorizon[] | Record<string, ForecastHorizon> | undefined;
  
  if (data?.data && typeof data.data === "object") {
    const innerData = data.data as Record<string, unknown>;
    if (innerData?.payload && typeof innerData.payload === "object") {
      const payload = innerData.payload as Record<string, unknown>;
      horizons = payload.horizons as ForecastHorizon[] | Record<string, ForecastHorizon>;
    }
  }
  
  // Path 2: trade_setup.payload.horizons (expected combined format)
  if (!horizons && data?.trade_setup && typeof data.trade_setup === "object") {
    const tradeSetup = data.trade_setup as Record<string, unknown>;
    if (tradeSetup?.payload && typeof tradeSetup.payload === "object") {
      const payload = tradeSetup.payload as Record<string, unknown>;
      horizons = payload.horizons as ForecastHorizon[] | Record<string, ForecastHorizon>;
    }
  }
  
  // Path 3: Direct payload.horizons
  if (!horizons && data?.payload && typeof data.payload === "object") {
    const payload = data.payload as Record<string, unknown>;
    horizons = payload.horizons as ForecastHorizon[] | Record<string, ForecastHorizon>;
  }
  
  if (!horizons) return [];
  if (Array.isArray(horizons)) return horizons;
  
  // Object-style horizons
  return Object.entries(horizons).map(([key, val]) => ({
    ...val,
    h: val.h || key,
  }));
}

function formatPrice(val?: number): string {
  if (val == null || isNaN(val)) return "—";
  return val.toFixed(5);
}

function formatPercent(val?: number): string {
  if (val == null || isNaN(val)) return "—";
  return `${(val * 100).toFixed(1)}%`;
}

function formatRatio(val?: number): string {
  if (val == null || isNaN(val)) return "—";
  return val.toFixed(2);
}

// ============================================================================
// STYLED JSON VIEWER
// ============================================================================

function StyledJsonViewer({ data, depth = 0 }: { data: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 1);

  if (data === null) return <span className="text-muted-foreground italic">null</span>;
  if (typeof data === "boolean") return <span className={data ? "text-emerald-500" : "text-rose-500"}>{String(data)}</span>;
  if (typeof data === "number") return <span className="text-amber-500">{data}</span>;
  if (typeof data === "string") return <span className="text-emerald-400">"{data}"</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground">[]</span>;
    return (
      <div className="inline">
        <button onClick={() => setCollapsed(!collapsed)} className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span className="ml-1 text-xs">Array({data.length})</span>
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-border pl-3">
            {data.map((item, index) => (
              <div key={index} className="py-0.5">
                <span className="text-muted-foreground mr-2">{index}:</span>
                <StyledJsonViewer data={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length === 0) return <span className="text-muted-foreground">{"{}"}</span>;
    return (
      <div className="inline">
        <button onClick={() => setCollapsed(!collapsed)} className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          <span className="ml-1 text-xs">Object({entries.length})</span>
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-border pl-3">
            {entries.map(([key, value]) => (
              <div key={key} className="py-0.5">
                <span className="text-primary font-medium">"{key}"</span>
                <span className="text-muted-foreground">: </span>
                <StyledJsonViewer data={value} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

// ============================================================================
// TRADE SETUP CARD (from AI Setup display)
// ============================================================================

function TradeSetupCard({ setup, index }: { setup: N8nSetup; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {setup.horizon || `Setup ${index + 1}`}
            </Badge>
            {setup.timeframe && (
              <Badge variant="secondary" className="text-xs">
                {setup.timeframe}
              </Badge>
            )}
            {setup.strategy && (
              <Badge variant="outline" className="text-xs capitalize">
                {setup.strategy}
              </Badge>
            )}
          </div>
          <Badge
            variant="outline"
            className={
              setup.direction?.toLowerCase() === "long"
                ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10"
                : "border-rose-500/50 text-rose-600 bg-rose-500/10"
            }
          >
            {setup.direction?.toLowerCase() === "long" && <TrendingUp className="h-3 w-3 mr-1" />}
            {setup.direction?.toLowerCase() === "short" && <TrendingDown className="h-3 w-3 mr-1" />}
            {setup.direction || "—"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Levels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Entry</p>
            <p className="font-mono font-semibold text-primary">{formatPrice(setup.entryPrice)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-rose-500/10">
            <p className="text-xs text-muted-foreground">Stop Loss</p>
            <p className="font-mono font-semibold text-rose-600">{formatPrice(setup.stopLoss)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-500/10">
            <p className="text-xs text-muted-foreground">Take Profit</p>
            <p className="font-mono font-semibold text-emerald-600">
              {setup.takeProfits && setup.takeProfits.length > 0 ? formatPrice(setup.takeProfits[0]) : "—"}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">R/R Ratio</p>
            <p className="font-mono font-semibold">{formatRatio(setup.riskRewardRatio)}</p>
          </div>
        </div>

        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="text-xs">Details</span>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {setup.context && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Context</p>
                <p className="text-sm">{setup.context}</p>
              </div>
            )}
            {setup.riskNotes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Risk Notes</p>
                <p className="text-sm text-rose-600">{setup.riskNotes}</p>
              </div>
            )}
            {setup.supports && setup.supports.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Supports</p>
                <div className="flex flex-wrap gap-1">
                  {setup.supports.map((s, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs">
                      {formatPrice(s)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {setup.resistances && setup.resistances.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Resistances</p>
                <div className="flex flex-wrap gap-1">
                  {setup.resistances.map((r, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs">
                      {formatPrice(r)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FORECAST DATA TABLE (simplified from ForecastPlaygroundTool)
// ============================================================================

function ForecastDataTable({ horizons }: { horizons: ForecastHorizon[] }) {
  if (horizons.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No forecast data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-semibold text-xs uppercase">Horizon</TableHead>
            <TableHead className="font-semibold text-xs uppercase">Direction</TableHead>
            <TableHead className="font-semibold text-xs uppercase text-right">Entry</TableHead>
            <TableHead className="font-semibold text-xs uppercase text-right">Forecast (Med)</TableHead>
            <TableHead className="font-semibold text-xs uppercase text-right">TP</TableHead>
            <TableHead className="font-semibold text-xs uppercase text-right">SL</TableHead>
            <TableHead className="font-semibold text-xs uppercase text-right">R/R</TableHead>
            <TableHead className="font-semibold text-xs uppercase text-right">Prob TP</TableHead>
            <TableHead className="font-semibold text-xs uppercase text-right">Conf.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {horizons.map((h, idx) => (
            <TableRow key={h.h || idx} className={idx % 2 === 0 ? "bg-transparent" : "bg-muted/20"}>
              <TableCell className="font-mono font-medium">{h.h}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    h.direction?.toLowerCase() === "long"
                      ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10"
                      : h.direction?.toLowerCase() === "short"
                        ? "border-rose-500/50 text-rose-600 bg-rose-500/10"
                        : ""
                  }
                >
                  {h.direction?.toLowerCase() === "long" && <TrendingUp className="h-3 w-3 mr-1" />}
                  {h.direction?.toLowerCase() === "short" && <TrendingDown className="h-3 w-3 mr-1" />}
                  {h.direction || "—"}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-primary font-semibold">{formatPrice(h.entry_price)}</TableCell>
              <TableCell className="text-right font-mono">{formatPrice(h.forecast?.medianPrice)}</TableCell>
              <TableCell className="text-right font-mono text-emerald-600">{formatPrice(h.tp)}</TableCell>
              <TableCell className="text-right font-mono text-rose-600">{formatPrice(h.sl)}</TableCell>
              <TableCell className="text-right font-mono">{formatRatio(h.riskReward)}</TableCell>
              <TableCell className="text-right font-mono">{formatPercent(h.prob_hit_tp_before_sl)}</TableCell>
              <TableCell className="text-right font-mono">{formatPercent(h.confidence)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

function ForecastTradeGeneratorContent() {
  useForceLanguage("en");
  const navigate = useNavigate();

  // Forecast params
  const [symbol, setSymbol] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("15min");
  const [horizons, setHorizons] = useState("24");
  const [useMonteCarlo, setUseMonteCarlo] = useState(true);
  const [paths, setPaths] = useState(3000);
  const [skew, setSkew] = useState(0.0);

  // AI Setup params
  const [riskLevel, setRiskLevel] = useState("medium");
  const [strategy, setStrategy] = useState("breakout");
  const [customNotes, setCustomNotes] = useState("");

  // Advanced options
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [includePredictions, setIncludePredictions] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);

  // Request state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<CombinedResponse | null>(null);
  const [aiSetupResult, setAiSetupResult] = useState<N8nTradeResult | null>(null);
  const [forecastHorizons, setForecastHorizons] = useState<ForecastHorizon[]>([]);
  const [requestDuration, setRequestDuration] = useState<number | null>(null);

  // Debug toggle
  const [showDebug, setShowDebug] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setRawResponse(null);
    setAiSetupResult(null);
    setForecastHorizons([]);
    setRequestDuration(null);

    const startTime = performance.now();

    // Parse horizons
    const parsedHorizons = horizons
      .split(",")
      .map((h) => parseInt(h.trim(), 10))
      .filter((h) => !isNaN(h) && h > 0);

    if (parsedHorizons.length === 0) {
      setError("Invalid horizons. Please enter comma-separated positive integers.");
      setLoading(false);
      return;
    }

    // Build combined payload
    const requestBody: Record<string, unknown> = {
      // Forecast Playground params
      symbol,
      timeframe,
      horizons: parsedHorizons,
      trade_mode: "forward",
      use_montecarlo: useMonteCarlo,
      paths: useMonteCarlo ? paths : undefined,
      include_predictions: includePredictions,
      include_metadata: includeMetadata,
      include_model_info: false,
      skew,

      // AI Setup params
      instrument: symbol,
      riskLevel,
      strategy,
      customNotes,

      // CRITICAL: Mode identifier for backend
      mode: "trade_generation",
    };

    try {
      const response = await fetch("https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/forecast-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setRawResponse(data);
      setRequestDuration(performance.now() - startTime);

      // Parse AI Setup data (root level or from setups field)
      const normalized = normalizeN8n(data);
      if (normalized && normalized.setups && normalized.setups.length > 0) {
        setAiSetupResult(normalized);
      } else {
        // No AI Setup data in response yet (backend might not support combined mode)
        setAiSetupResult(null);
      }

      // Parse Forecast data - try multiple paths
      const horizonsData = getPayloadHorizons(data);
      setForecastHorizons(horizonsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const hasResults = aiSetupResult || forecastHorizons.length > 0;

  return (
    <Layout>
      <main className="space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate("/forecast-playground")} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-10 w-10 rounded-xl border bg-card flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Trade Generator</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Combines Forecast + AI Setup in one unified workflow.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">Internal</Badge>
            <Badge variant="outline" className="text-xs">SuperUser</Badge>
          </div>
        </header>

        {/* Form Section */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Market Context Card */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Market Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_ASSETS.map((asset) => (
                      <SelectItem key={asset} value={asset}>
                        {asset}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map((tf) => (
                      <SelectItem key={tf} value={tf}>
                        {tf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="horizons">Horizons (hours, comma-separated)</Label>
                <Input id="horizons" value={horizons} onChange={(e) => setHorizons(e.target.value)} placeholder="24, 48, 72" />
              </div>
            </CardContent>
          </Card>

          {/* Trade Parameters Card */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                Trade Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="strategy">Strategy</Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="riskLevel">Risk Level</Label>
                <Select value={riskLevel} onValueChange={setRiskLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customNotes">Custom Notes</Label>
                <Textarea
                  id="customNotes"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Optional trading context or preferences..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Model Options Card */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                Model Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="montecarlo" className="text-sm">
                  Monte Carlo Simulation
                </Label>
                <Switch id="montecarlo" checked={useMonteCarlo} onCheckedChange={setUseMonteCarlo} />
              </div>

              {useMonteCarlo && (
                <div className="space-y-2">
                  <Label htmlFor="paths">MC Paths</Label>
                  <Input
                    id="paths"
                    type="number"
                    value={paths}
                    onChange={(e) => setPaths(parseInt(e.target.value, 10) || 1000)}
                    min={100}
                    max={10000}
                  />
                </div>
              )}

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="text-xs">Advanced Options</span>
                    {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="skew" className="text-xs">
                      Skew (-1 to +1)
                    </Label>
                    <Input
                      id="skew"
                      type="number"
                      step="0.1"
                      value={skew}
                      onChange={(e) => setSkew(parseFloat(e.target.value) || 0)}
                      min={-1}
                      max={1}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="predictions" className="text-xs">
                      Include Predictions
                    </Label>
                    <Switch id="predictions" checked={includePredictions} onCheckedChange={setIncludePredictions} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="metadata" className="text-xs">
                      Include Metadata
                    </Label>
                    <Switch id="metadata" checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSubmit} disabled={loading} size="lg" className="min-w-[160px]">
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Generate Trade
              </>
            )}
          </Button>

          {requestDuration && (
            <Badge variant="outline" className="font-mono text-xs">
              {(requestDuration / 1000).toFixed(2)}s
            </Badge>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Label htmlFor="debug" className="text-xs text-muted-foreground">
              Debug JSON
            </Label>
            <Switch id="debug" checked={showDebug} onCheckedChange={setShowDebug} />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        )}

        {/* Results Section */}
        {hasResults && !loading && (
          <Tabs defaultValue="trade-setup" className="space-y-4">
            <TabsList>
              <TabsTrigger value="trade-setup">Trade Setup</TabsTrigger>
              <TabsTrigger value="forecast-data">Forecast Data</TabsTrigger>
              {showDebug && <TabsTrigger value="debug">Debug JSON</TabsTrigger>}
            </TabsList>

            {/* Trade Setup Tab (AI Setup format) */}
            <TabsContent value="trade-setup" className="space-y-4">
              {aiSetupResult ? (
                <>
                  {/* Market Commentary */}
                  {aiSetupResult.market_commentary_anchor?.summary && (
                    <Card className="rounded-xl border shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Market Commentary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{aiSetupResult.market_commentary_anchor.summary}</p>
                        {aiSetupResult.market_commentary_anchor.key_drivers && aiSetupResult.market_commentary_anchor.key_drivers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {aiSetupResult.market_commentary_anchor.key_drivers.map((driver, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {driver}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Setups */}
                  {aiSetupResult.setups && aiSetupResult.setups.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {aiSetupResult.setups.map((setup, idx) => (
                        <TradeSetupCard key={idx} setup={setup} index={idx} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No trade setups available in response</p>
                    </div>
                  )}

                  {/* Disclaimer */}
                  {aiSetupResult.disclaimer && (
                    <p className="text-xs text-muted-foreground italic text-center">{aiSetupResult.disclaimer}</p>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No AI trade setup data in response</p>
                </div>
              )}
            </TabsContent>

            {/* Forecast Data Tab */}
            <TabsContent value="forecast-data" className="space-y-4">
              <Card className="rounded-xl border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Forecast Summary by Horizon
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Quantitative forecast data from trade_setup field
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ForecastDataTable horizons={forecastHorizons} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Debug Tab */}
            {showDebug && (
              <TabsContent value="debug">
                <Card className="rounded-xl border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Raw Response</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="font-mono text-xs p-4 bg-muted/30 rounded-lg">
                        <StyledJsonViewer data={rawResponse} />
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>
    </Layout>
  );
}

// ============================================================================
// EXPORT WITH SUPERUSER GUARD
// ============================================================================

export default function ForecastTradeGenerator() {
  return (
    <SuperUserGuard fallback={<LabsComingSoon title="Trade Generator" description="This feature is currently in private beta." />}>
      <ForecastTradeGeneratorContent />
    </SuperUserGuard>
  );
}
