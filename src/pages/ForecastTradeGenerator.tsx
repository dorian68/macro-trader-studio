import React, { useState } from "react";
import Layout from "@/components/Layout";
import { SuperUserGuard } from "@/components/SuperUserGuard";
import { LabsComingSoon } from "@/components/labs/LabsComingSoon";
import { RiskSurfaceChart, SurfaceApiResponse } from "@/components/labs/RiskSurfaceChart";
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
import { StyledJsonViewer } from "@/components/ui/styled-json-viewer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForceLanguage } from "@/hooks/useForceLanguage";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  RISK_PROFILES,
  pipSizeForSymbol,
  pipUnitLabel,
  sigmaHProxyFromQuantiles,
  sigmaHFromSigmaRef,
  tpSlFromSigmas,
  tpSlFromATR,
  priceDistanceToPips,
  computeSteps,
} from "@/lib/forecastUtils";
import {
  getSymmetricFriction,
  getAssetClassLabel,
  SYMMETRIC_FRICTION_TOOLTIP,
} from "@/lib/marketFrictions";
import {
  interpolateProbability,
} from "@/lib/surfaceInterpolation";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ============================================================================
// CONSTANTS - API ENDPOINTS
// ============================================================================

const MACRO_LAB_PROXY_URL = "https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/macro-lab-proxy";

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

/**
 * Builds the question field required by the backend RAG API
 * Matches the pattern used in AISetup.tsx
 */
function buildQuestion(p: {
  instrument: string;
  timeframe: string;
  riskLevel: string;
  strategy: string;
  customNotes: string;
  horizons: number[];
}) {
  const lines = [
    `Provide an institutional macro outlook and risks for ${p.instrument}, then a macro-grounded trade idea (entry/SL/TP).`,
    `Prioritize central banks / Bloomberg / Reuters; ignore low-authority sources unless they synthesize institutional research.`,
    `Focus on policy divergence, inflation, growth, labor, real yields, financial conditions.`,
    `Use technicals only to refine entries after macro.`
  ];
  if (p?.timeframe) lines.push(`User timeframe: ${p.timeframe}.`);
  if (p?.riskLevel) lines.push(`User risk: ${p.riskLevel}.`);
  if (p?.strategy) lines.push(`Strategy: ${p.strategy}.`);
  if (p?.horizons?.length) lines.push(`Forecast horizons: ${p.horizons.join(', ')} hours.`);
  if (p?.customNotes) lines.push(`Note: ${p.customNotes}.`);
  return lines.join(' ');
}

function normalizeN8n(raw: unknown): N8nTradeResult | null {
  try {
    let maybeContent: unknown;
    const rawObj = raw as Record<string, unknown>;
    
    // Priority 1: body.message.message.content.content.final_answer (actual API response)
    try {
      const body = rawObj?.body as Record<string, unknown>;
      const message1 = body?.message as Record<string, unknown>;
      const message2 = message1?.message as Record<string, unknown>;
      const content1 = message2?.content as Record<string, unknown>;
      const content2 = content1?.content as Record<string, unknown>;
      if (typeof content2?.final_answer === "string") {
        maybeContent = content2.final_answer;
      }
    } catch {}
    
    // Priority 2: output.final_answer (Trade Generator response format)
    if (!maybeContent && rawObj?.output && typeof rawObj.output === "object") {
      const output = rawObj.output as Record<string, unknown>;
      if (output?.final_answer) {
        maybeContent = output.final_answer;
      }
    }
    
    // Priority 3: output.trade_generation_output.final_answer
    if (!maybeContent && rawObj?.output && typeof rawObj.output === "object") {
      const output = rawObj.output as Record<string, unknown>;
      if (output?.trade_generation_output && typeof output.trade_generation_output === "object") {
        const tgo = output.trade_generation_output as Record<string, unknown>;
        if (tgo?.final_answer) {
          maybeContent = tgo.final_answer;
        }
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

// ============================================================================
// TRADE GENERATION OUTPUT EXTRACTORS
// ============================================================================

/**
 * Extract trade_setup from trade_generation_output
 * Contains forecast horizons data for the EnhancedForecastTable
 */
function extractTradeSetup(raw: unknown): TradeSetupResponse | null {
  const obj = raw as Record<string, unknown>;
  
  // Path 1: body.message.message.content.content.trade_setup (actual API response)
  try {
    const body = obj?.body as Record<string, unknown>;
    const message1 = body?.message as Record<string, unknown>;
    const message2 = message1?.message as Record<string, unknown>;
    const content1 = message2?.content as Record<string, unknown>;
    const content2 = content1?.content as Record<string, unknown>;
    if (content2?.trade_setup) {
      let setup = content2.trade_setup;
      // Handle array format (API returns array of stringified JSON)
      if (Array.isArray(setup) && setup.length > 0) {
        const first = setup[0];
        if (typeof first === "string") {
          try { setup = JSON.parse(first); } catch { return null; }
        } else {
          setup = first;
        }
      } else if (typeof setup === "string") {
        try { setup = JSON.parse(setup); } catch { return null; }
      }
      return setup as TradeSetupResponse;
    }
  } catch {}
  
  // Path 2: output.trade_generation_output.trade_setup
  if (obj?.output && typeof obj.output === "object") {
    const output = obj.output as Record<string, unknown>;
    if (output?.trade_generation_output && typeof output.trade_generation_output === "object") {
      const tgo = output.trade_generation_output as Record<string, unknown>;
      if (tgo?.trade_setup) {
        let setup = tgo.trade_setup;
        if (typeof setup === "string") {
          try { setup = JSON.parse(setup); } catch { return null; }
        }
        return setup as TradeSetupResponse;
      }
    }
  }
  
  // Path 3: Direct trade_generation_output.trade_setup
  if (obj?.trade_generation_output && typeof obj.trade_generation_output === "object") {
    const tgo = obj.trade_generation_output as Record<string, unknown>;
    if (tgo?.trade_setup) {
      let setup = tgo.trade_setup;
      if (typeof setup === "string") {
        try { setup = JSON.parse(setup); } catch { return null; }
      }
      return setup as TradeSetupResponse;
    }
  }
  
  return null;
}

/**
 * Extract risk_surface from trade_generation_output
 * Contains data for the 3D RiskSurfaceChart (sigma_ref, surface, atr)
 */
function extractRiskSurface(raw: unknown): SurfaceApiResponse | null {
  const obj = raw as Record<string, unknown>;
  
  // Path 1: body.message.message.content.content.risk_surface (actual API response)
  try {
    const body = obj?.body as Record<string, unknown>;
    const message1 = body?.message as Record<string, unknown>;
    const message2 = message1?.message as Record<string, unknown>;
    const content1 = message2?.content as Record<string, unknown>;
    const content2 = content1?.content as Record<string, unknown>;
    if (content2?.risk_surface) {
      let surface = content2.risk_surface;
      if (typeof surface === "string") {
        try { surface = JSON.parse(surface); } catch { return null; }
      }
      return surface as SurfaceApiResponse;
    }
  } catch {}
  
  // Path 2: output.trade_generation_output.risk_surface
  if (obj?.output && typeof obj.output === "object") {
    const output = obj.output as Record<string, unknown>;
    if (output?.trade_generation_output && typeof output.trade_generation_output === "object") {
      const tgo = output.trade_generation_output as Record<string, unknown>;
      if (tgo?.risk_surface) {
        let surface = tgo.risk_surface;
        if (typeof surface === "string") {
          try { surface = JSON.parse(surface); } catch { return null; }
        }
        return surface as SurfaceApiResponse;
      }
    }
  }
  
  // Path 3: Direct trade_generation_output.risk_surface
  if (obj?.trade_generation_output && typeof obj.trade_generation_output === "object") {
    const tgo = obj.trade_generation_output as Record<string, unknown>;
    if (tgo?.risk_surface) {
      let surface = tgo.risk_surface;
      if (typeof surface === "string") {
        try { surface = JSON.parse(surface); } catch { return null; }
      }
      return surface as SurfaceApiResponse;
    }
  }
  
  return null;
}

/**
 * Extract final_answer (AI textual analysis) from trade_generation_output
 */
function extractFinalAnswer(raw: unknown): string | null {
  const obj = raw as Record<string, unknown>;
  
  // Path 1: body.message.message.content.content.final_answer (actual API response)
  try {
    const body = obj?.body as Record<string, unknown>;
    const message1 = body?.message as Record<string, unknown>;
    const message2 = message1?.message as Record<string, unknown>;
    const content1 = message2?.content as Record<string, unknown>;
    const content2 = content1?.content as Record<string, unknown>;
    if (typeof content2?.final_answer === "string") {
      return content2.final_answer;
    }
  } catch {}
  
  // Path 2: output.trade_generation_output.final_answer
  if (obj?.output && typeof obj.output === "object") {
    const output = obj.output as Record<string, unknown>;
    if (output?.trade_generation_output && typeof output.trade_generation_output === "object") {
      const tgo = output.trade_generation_output as Record<string, unknown>;
      if (typeof tgo?.final_answer === "string") {
        return tgo.final_answer;
      }
    }
  }
  
  // Path 3: Direct trade_generation_output.final_answer
  if (obj?.trade_generation_output && typeof obj.trade_generation_output === "object") {
    const tgo = obj.trade_generation_output as Record<string, unknown>;
    if (typeof tgo?.final_answer === "string") {
      return tgo.final_answer;
    }
  }
  
  return null;
}

/**
 * Extract confidence_note from trade_generation_output
 */
function extractConfidenceNote(raw: unknown): string | null {
  const obj = raw as Record<string, unknown>;
  
  // Path 1: body.message.message.content.content.confidence_note (actual API response)
  try {
    const body = obj?.body as Record<string, unknown>;
    const message1 = body?.message as Record<string, unknown>;
    const message2 = message1?.message as Record<string, unknown>;
    const content1 = message2?.content as Record<string, unknown>;
    const content2 = content1?.content as Record<string, unknown>;
    if (typeof content2?.confidence_note === "string") {
      return content2.confidence_note;
    }
  } catch {}
  
  // Path 2: output.trade_generation_output.confidence_note
  if (obj?.output && typeof obj.output === "object") {
    const output = obj.output as Record<string, unknown>;
    if (output?.trade_generation_output && typeof output.trade_generation_output === "object") {
      const tgo = output.trade_generation_output as Record<string, unknown>;
      if (typeof tgo?.confidence_note === "string") {
        return tgo.confidence_note;
      }
    }
  }
  
  // Path 3: Direct trade_generation_output.confidence_note
  if (obj?.trade_generation_output && typeof obj.trade_generation_output === "object") {
    const tgo = obj.trade_generation_output as Record<string, unknown>;
    if (typeof tgo?.confidence_note === "string") {
      return tgo.confidence_note;
    }
  }
  
  return null;
}

/**
 * Extract horizons from a TradeSetupResponse object
 */
function getHorizonsFromTradeSetup(setup: TradeSetupResponse): ForecastHorizon[] {
  const horizons = setup?.payload?.horizons;
  if (!horizons) return [];
  if (Array.isArray(horizons)) return horizons;
  // Object format
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

// StyledJsonViewer is now imported from shared component

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
// RISK PROFILES PANEL (ported from ForecastPlaygroundTool)
// ============================================================================

interface RiskProfilesPanelProps {
  horizonData: ForecastHorizon;
  symbol?: string;
  sigmaRef?: number;
  timeframe?: string;
  atr?: number;
  surface?: SurfaceApiResponse['surface'];
}

function RiskProfilesPanel({
  horizonData,
  symbol,
  sigmaRef,
  timeframe,
  atr,
  surface,
}: RiskProfilesPanelProps) {
  const entryPrice = horizonData.entry_price;
  const direction = (horizonData.direction?.toLowerCase() || "long") as "long" | "short";
  const p20 = horizonData.forecast?.p20;
  const p80 = horizonData.forecast?.p80;

  // Determine calculation method: ATR (priority) or Sigma (fallback)
  const useATR = atr != null && atr > 0;

  // Calculate sigma_h for this horizon (fallback + analytics display)
  let sigmaH: number | null = null;
  let sigmaSource = "";

  if (p20 != null && p80 != null && entryPrice) {
    sigmaH = sigmaHProxyFromQuantiles(p20, p80) / entryPrice;
    sigmaSource = "quantiles";
  } else if (sigmaRef != null && timeframe) {
    const horizonMatch = horizonData.h?.match(/^(\d+)/);
    const horizonHours = horizonMatch ? parseInt(horizonMatch[1], 10) : 1;
    const steps = computeSteps(horizonHours, timeframe);
    sigmaH = sigmaHFromSigmaRef(sigmaRef, steps);
    sigmaSource = "sigma_ref";
  }

  if (!entryPrice || (!useATR && sigmaH == null)) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Insufficient data to calculate risk profiles (need entry price and ATR or volatility estimate)
      </div>
    );
  }

  const pipSize = symbol ? pipSizeForSymbol(symbol) : 0.0001;
  const pipUnit = symbol ? pipUnitLabel(symbol) : "pips";

  // SYMMETRIC Market Friction calculation (50%/50% split)
  const frictionInfo = symbol && timeframe 
    ? getSymmetricFriction(symbol, timeframe)
    : { slFriction: 0, tpFriction: 0, enabled: false, assetClass: 'fx_major' as const, baseFriction: 0 };
  
  const slFriction = frictionInfo.enabled ? frictionInfo.slFriction : 0;
  const tpFriction = frictionInfo.enabled ? frictionInfo.tpFriction : 0;

  // Calculate profiles using ATR (priority) or sigma (fallback) WITH SYMMETRIC FRICTION
  const profiles = Object.entries(RISK_PROFILES).map(([key, profile]) => {
    let tpPrice: number, slPrice: number, tpDistance: number, slDistance: number;
    
    const slSigmaWithFriction = profile.slSigma + slFriction;
    const tpSigmaWithFriction = profile.tpSigma + tpFriction;

    if (useATR) {
      const result = tpSlFromATR(
        entryPrice,
        direction,
        atr as number,
        tpSigmaWithFriction,
        slSigmaWithFriction,
      );
      tpPrice = result.tpPrice;
      slPrice = result.slPrice;
      tpDistance = result.tpDistance;
      slDistance = result.slDistance;
    } else {
      const result = tpSlFromSigmas(entryPrice, direction, sigmaH as number, tpSigmaWithFriction, slSigmaWithFriction);
      tpPrice = result.tpPrice;
      slPrice = result.slPrice;
      tpDistance = result.tpDistance;
      slDistance = result.slDistance;
    }

    const tpPips = priceDistanceToPips(tpDistance, pipSize);
    const slPips = priceDistanceToPips(slDistance, pipSize);
    const riskReward = slDistance > 0 ? tpDistance / slDistance : 0;

    return {
      key,
      ...profile,
      slSigmaBase: profile.slSigma,
      slSigmaFinal: slSigmaWithFriction,
      tpSigmaBase: profile.tpSigma,
      tpSigmaFinal: tpSigmaWithFriction,
      tpPrice,
      slPrice,
      tpPips,
      slPips,
      riskReward,
      effectiveProb: profile.targetProb,
    };
  });

  const formatPriceValue = (val: number) => val.toFixed(5);
  const calculationLabel = useATR ? `ATR: ${atr?.toFixed(5)}` : `σ: ${sigmaSource}`;

  const getProfileStyles = (key: string) => {
    switch (key) {
      case "conservative":
        return "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400";
      case "moderate":
        return "bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400";
      case "aggressive":
        return "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400";
      default:
        return "";
    }
  };

  return (
    <div className="p-4 space-y-3 bg-gradient-to-b from-muted/30 to-muted/10 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Suggested TP/SL based on risk appetite</span>
        </div>
        <div className="flex items-center gap-2">
          {frictionInfo.enabled && (slFriction > 0 || tpFriction > 0) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="text-xs font-mono border-amber-500/50 text-amber-600 bg-amber-500/10 dark:text-amber-400"
                  >
                    +{slFriction.toFixed(2)}σ SL / +{tpFriction.toFixed(2)}σ TP ({getAssetClassLabel(frictionInfo.assetClass)})
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{SYMMETRIC_FRICTION_TOOLTIP}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {useATR ? (
            <Badge
              className="text-xs font-mono bg-emerald-600 hover:bg-emerald-700"
              title="Using ATR(14) for TP/SL calculation"
            >
              {calculationLabel}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-mono" title="Using sigma-based calculation">
              {calculationLabel}
            </Badge>
          )}
        </div>
      </div>
      <div className="rounded-lg border overflow-x-auto bg-background/80 backdrop-blur-sm">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="bg-muted/30 border-b">
              <TableHead className="text-xs font-semibold uppercase tracking-wide">Profile</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-center">Prob</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">SL (σ)</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">SL Price</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">SL ({pipUnit})</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">TP (σ)</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">TP Price</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">TP ({pipUnit})</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">R/R</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.key} className="hover:bg-muted/20 transition-colors">
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs capitalize", getProfileStyles(profile.key))}>
                    {profile.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-mono text-xs">
                  {(profile.effectiveProb * 100).toFixed(0)}%
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{profile.slSigmaFinal.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-rose-600">{formatPriceValue(profile.slPrice)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-rose-500">{profile.slPips.toFixed(1)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{profile.tpSigmaFinal.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-emerald-600">{formatPriceValue(profile.tpPrice)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-emerald-500">{profile.tpPips.toFixed(1)}</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">{profile.riskReward.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============================================================================
// ENHANCED FORECAST DATA TABLE (with expandable Risk Profiles rows)
// ============================================================================

interface EnhancedForecastTableProps {
  horizons: ForecastHorizon[];
  symbol: string;
  timeframe: string;
  surfaceResult: SurfaceApiResponse | null;
  expandedRows: Set<string>;
  onToggleRow: (key: string) => void;
}

function EnhancedForecastTable({ 
  horizons, 
  symbol, 
  timeframe, 
  surfaceResult,
  expandedRows,
  onToggleRow,
}: EnhancedForecastTableProps) {
  if (horizons.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No forecast data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-8"></TableHead>
              <TableHead className="font-semibold text-xs uppercase">Horizon</TableHead>
              <TableHead className="font-semibold text-xs uppercase">Direction</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">Entry</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">Forecast (Med)</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1 justify-end">
                      SL (strat.)
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">Strategic SL from API. Expand row to see Risk Profiles with effective levels (Market Frictions applied).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">TP (strat.)</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">R/R</TableHead>
              <TableHead className="font-semibold text-xs uppercase text-right">Prob TP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {horizons.map((h, idx) => {
              const rowKey = h.h || String(idx);
              const isExpanded = expandedRows.has(rowKey);
              
              return (
                <React.Fragment key={rowKey}>
                  <TableRow 
                    className={cn(
                      idx % 2 === 0 ? "bg-transparent" : "bg-muted/20",
                      "cursor-pointer hover:bg-muted/40 transition-colors"
                    )}
                    onClick={() => onToggleRow(rowKey)}
                  >
                    <TableCell className="w-8 px-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
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
                    <TableCell className="text-right font-mono text-rose-600">{formatPrice(h.sl)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">{formatPrice(h.tp)}</TableCell>
                    <TableCell className="text-right font-mono">{formatRatio(h.riskReward)}</TableCell>
                    <TableCell className="text-right font-mono">{formatPercent(h.prob_hit_tp_before_sl)}</TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={9} className="p-0 border-t-0">
                        <RiskProfilesPanel
                          horizonData={h}
                          symbol={symbol}
                          sigmaRef={surfaceResult?.sigma_ref}
                          timeframe={timeframe}
                          atr={surfaceResult?.atr}
                          surface={surfaceResult?.surface}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground italic px-1">
        💡 Click on a row to expand Risk Profiles with Conservative, Moderate, and Aggressive TP/SL suggestions.
      </p>
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

  // NEW: Trade Generation Output states (from trade_generation_output)
  const [riskSurfaceData, setRiskSurfaceData] = useState<SurfaceApiResponse | null>(null);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const [confidenceNote, setConfidenceNote] = useState<string | null>(null);

  // AI Setup API state (macro-lab-proxy)
  const [aiSetupLoading, setAiSetupLoading] = useState(false);
  const [aiSetupError, setAiSetupError] = useState<string | null>(null);

  // Expanded rows state for Risk Profiles
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Debug toggle and last sent payload
  const [showDebug, setShowDebug] = useState(false);
  const [lastPayload, setLastPayload] = useState<Record<string, unknown> | null>(null);
  const [lastHttpStatus, setLastHttpStatus] = useState<number | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setRawResponse(null);
    setAiSetupResult(null);
    setForecastHorizons([]);
    setRequestDuration(null);
    setRiskSurfaceData(null);
    setFinalAnswer(null);
    setConfidenceNote(null);
    setAiSetupError(null);
    setExpandedRows(new Set());

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

    try {
      // === SINGLE API CALL: macro-lab-proxy with RAG format (same as AISetup) ===
      const macroPayload = {
        type: "RAG",
        mode: "trade_generation",
        instrument: symbol,
        question: buildQuestion({
          instrument: symbol,
          timeframe,
          riskLevel,
          strategy,
          customNotes,
          horizons: parsedHorizons
        }),
        user_email: null,
        isTradeQuery: true,
        timeframe: timeframe,
        riskLevel: riskLevel,
        strategy: strategy,
        customNotes: customNotes,
        horizons: parsedHorizons,
        use_montecarlo: useMonteCarlo,
        ...(useMonteCarlo && { paths: paths, skew: skew })
      };

      // Store payload for debug display
      setLastPayload(macroPayload);

      const response = await fetch(MACRO_LAB_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(macroPayload),
      });

      setRequestDuration(performance.now() - startTime);
      setLastHttpStatus(response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        setRawResponse({ error: errorBody } as unknown as CombinedResponse);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setRawResponse(data);

      // Parse AI Setup data (legacy format)
      const normalized = normalizeN8n(data);
      if (normalized && normalized.setups && normalized.setups.length > 0) {
        setAiSetupResult(normalized);
      }

      // NEW: Extract trade_generation_output fields
      // Extract trade_setup (forecast_data) -> horizons for table
      const tradeSetup = extractTradeSetup(data);
      if (tradeSetup) {
        const horizonsFromSetup = getHorizonsFromTradeSetup(tradeSetup);
        if (horizonsFromSetup.length > 0) {
          setForecastHorizons(horizonsFromSetup);
        }
      }
      
      // Fallback: try legacy path if trade_setup didn't have horizons
      if (forecastHorizons.length === 0) {
        const horizonsData = getPayloadHorizons(data);
        if (horizonsData.length > 0) {
          setForecastHorizons(horizonsData);
        }
      }

      // Extract risk_surface -> 3D chart data
      const surface = extractRiskSurface(data);
      if (surface) {
        setRiskSurfaceData(surface);
      }

      // Extract final_answer -> AI textual analysis
      const answer = extractFinalAnswer(data);
      if (answer) {
        setFinalAnswer(answer);
      }

      // Extract confidence_note
      const note = extractConfidenceNote(data);
      setConfidenceNote(note);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpanded = (horizonKey: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(horizonKey)) {
        next.delete(horizonKey);
      } else {
        next.add(horizonKey);
      }
      return next;
    });
  };

  const hasResults = aiSetupResult || forecastHorizons.length > 0 || finalAnswer || riskSurfaceData;

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

        {/* Debug Card - Always visible when toggle is ON and we have data */}
        {showDebug && (lastPayload || rawResponse) && (
          <Card className="rounded-xl border border-amber-500/50 bg-amber-500/5 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <FlaskConical className="h-4 w-4" />
                HTTP Debug
              </CardTitle>
              <CardDescription className="text-xs">
                Request/Response details for technical audit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Request Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground mb-1">Endpoint</p>
                  <p className="font-mono break-all">{MACRO_LAB_PROXY_URL}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground mb-1">HTTP Status</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono",
                      lastHttpStatus && lastHttpStatus >= 200 && lastHttpStatus < 300
                        ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10"
                        : "border-rose-500/50 text-rose-600 bg-rose-500/10"
                    )}
                  >
                    {lastHttpStatus || "—"}
                  </Badge>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground mb-1">Duration</p>
                  <p className="font-mono">{requestDuration ? `${(requestDuration / 1000).toFixed(2)}s` : "—"}</p>
                </div>
              </div>

              {/* Request Payload */}
              {lastPayload && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                      <span>Request Payload</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="h-[200px] mt-2">
                      <div className="font-mono text-xs p-3 bg-muted/30 rounded-lg">
                        <StyledJsonViewer data={lastPayload} />
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Response Body */}
              {rawResponse && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                      <span>Response Body</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="h-[300px] mt-2">
                      <div className="font-mono text-xs p-3 bg-muted/30 rounded-lg">
                        <StyledJsonViewer data={rawResponse} />
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Market Analysis Card - Final Answer with Confidence Note */}
        {finalAnswer && !loading && (
          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                AI Market Analysis
                {confidenceNote && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "ml-auto text-xs",
                      confidenceNote.toLowerCase().includes("integrated") 
                        ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10" 
                        : "border-amber-500/50 text-amber-600 bg-amber-500/10"
                    )}
                  >
                    {confidenceNote}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {finalAnswer}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {hasResults && !loading && (
          <Tabs defaultValue="trade-setup" className="space-y-4">
            <TabsList>
              <TabsTrigger value="trade-setup">Trade Setup</TabsTrigger>
              <TabsTrigger value="forecast-data">Forecast Data</TabsTrigger>
            </TabsList>

            {/* Trade Setup Tab (AI Setup format) */}
            <TabsContent value="trade-setup" className="space-y-4">
              {aiSetupLoading ? (
                <Card className="rounded-xl border shadow-sm">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-muted-foreground font-medium">
                        Generating AI Trade Setup...
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Calling macro-lab-proxy with mode: trade_generation
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : aiSetupError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>AI Setup Error</AlertTitle>
                  <AlertDescription>{aiSetupError}</AlertDescription>
                </Alert>
              ) : aiSetupResult ? (
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
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>No AI Setup Data</AlertTitle>
                  <AlertDescription>
                    Click "Generate Trade" to fetch AI Trade Setups from macro-lab-proxy.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Forecast Data Tab */}
            <TabsContent value="forecast-data" className="space-y-6">
              {/* Enhanced Forecast Table with Risk Profiles */}
              <Card className="rounded-xl border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Forecast Summary by Horizon
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click on a row to expand Risk Profiles (Conservative / Moderate / Aggressive)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EnhancedForecastTable 
                    horizons={forecastHorizons} 
                    symbol={symbol}
                    timeframe={timeframe}
                    surfaceResult={riskSurfaceData}
                    expandedRows={expandedRows}
                    onToggleRow={toggleRowExpanded}
                  />
                </CardContent>
              </Card>

              {/* Risk Surface Chart - Source: risk_surface field from trade_generation_output */}
              {riskSurfaceData && (
                <Card className="rounded-xl border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Risk / Reward Surface
                    </CardTitle>
                    <CardDescription className="text-xs">
                      3D visualization of probability-adjusted TP as a function of SL intensity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RiskSurfaceChart
                      data={riskSurfaceData}
                      loading={false}
                      error={null}
                      symbol={symbol}
                      timeframe={timeframe}
                      horizonHours={parseInt(horizons.split(",")[0]?.trim() || "24", 10)}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
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
