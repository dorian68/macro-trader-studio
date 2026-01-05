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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Play,
  AlertCircle,
  Clock,
  Settings2,
  BarChart3,
  Eye,
  TrendingUp,
  TrendingDown,
  Database,
  Cpu,
  FileText,
  Zap,
  Target,
  Layers,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  RISK_PROFILES,
  pipSizeForSymbol,
  pipUnitLabel,
  sigmaHProxyFromQuantiles,
  sigmaHFromSigmaRef,
  tpSlFromSigmas,
  priceDistanceToPips,
  computeSteps,
} from "@/lib/forecastUtils";

const ALLOWED_ASSETS = ["AUD/USD", "EUR/USD", "BTC/USD", "ETH/USD", "XAU/USD", "XLM/USD"];

const TIMEFRAMES = ["15min"];

interface RequestInfo {
  params: Record<string, unknown>;
  timestamp: string;
  duration: number;
}

// Actual API prediction format
interface PredictionDataPoint {
  ds: string;
  yhat: number;
}

// Correct interface matching actual API response from data.payload.horizons[]
interface HorizonForecast {
  h: string; // Horizon identifier
  direction: string;
  trade_mode?: "spot" | "forward"; // Trade mode
  entry_price?: number; // CRITICAL: Entry price
  entry_type?: string; // Entry type description
  entry_method?: string; // e.g., "last_price", "median"
  forecast?: {
    // Nested forecast object
    medianPrice?: number;
    p20?: number;
    p80?: number;
  };
  tp?: number;
  sl?: number;
  riskReward?: number; // camelCase from API
  prob_hit_tp_before_sl?: number; // Correct field name
  confidence?: number;
  position_size?: number; // Position size
  model?: {
    // Nested model object
    mean?: string;
    vol?: string;
  };
  // Legacy fields for backward compatibility
  forecast_price_median?: number;
  forecast_price?: number;
  risk_reward?: number;
  prob_tp_before_sl?: number;
}

interface ApiMetadata {
  symbol?: string;
  timeframe?: string;
  as_of?: string;
  n_obs?: number;
  mc_paths?: number;
  exec_ms_mean?: number;
  exec_ms_vol?: number;
  mean_model?: string;
  vol_model?: string;
}

interface ModelStatus {
  mean_model?: string;
  vol_model?: string;
  device?: string;
  loaded?: boolean;
  mean_status?: string;
  vol_status?: string;
}

// Chart color palette for multiple horizons
const HORIZON_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 45%)", // emerald
  "hsl(38, 92%, 50%)", // amber
  "hsl(262, 83%, 58%)", // violet
  "hsl(198, 93%, 60%)", // sky
];

// Local styled JSON viewer component (not shared)
function StyledJsonViewer({ data, depth = 0 }: { data: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 1);

  if (data === null) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  if (typeof data === "boolean") {
    return <span className={data ? "text-emerald-500" : "text-rose-500"}>{String(data)}</span>;
  }

  if (typeof data === "number") {
    return <span className="text-amber-500">{data}</span>;
  }

  if (typeof data === "string") {
    return <span className="text-emerald-400">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-muted-foreground">[]</span>;
    }

    return (
      <div className="inline">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
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
    if (entries.length === 0) {
      return <span className="text-muted-foreground">{"{}"}</span>;
    }

    return (
      <div className="inline">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
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

// NEW: Risk Profiles Panel Component (expandable per horizon row)
function RiskProfilesPanel({
  horizonData,
  symbol,
  sigmaRef,
  timeframe,
}: {
  horizonData: HorizonForecast;
  symbol?: string;
  sigmaRef?: number;
  timeframe?: string;
}) {
  const entryPrice = horizonData.entry_price;
  const direction = (horizonData.direction?.toLowerCase() || "long") as "long" | "short";
  const p20 = horizonData.forecast?.p20;
  const p80 = horizonData.forecast?.p80;

  // Calculate sigma_h for this horizon
  let sigmaH: number | null = null;
  let sigmaSource = "";

  // Method 1: From quantiles (preferred) - approximates horizon volatility from p20/p80
  if (p20 != null && p80 != null && entryPrice) {
    sigmaH = sigmaHProxyFromQuantiles(p20, p80) / entryPrice; // Normalize by entry price
    sigmaSource = "quantiles";
  }
  // Method 2: Fallback to sigma_ref (if surface data available)
  else if (sigmaRef != null && timeframe) {
    // Parse horizon from h field (e.g., "1h" → 1)
    const horizonMatch = horizonData.h?.match(/^(\d+)/);
    const horizonHours = horizonMatch ? parseInt(horizonMatch[1], 10) : 1;
    const steps = computeSteps(horizonHours, timeframe);
    sigmaH = sigmaHFromSigmaRef(sigmaRef, steps);
    sigmaSource = "sigma_ref";
  }

  if (!entryPrice || sigmaH == null) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Insufficient data to calculate risk profiles (need entry price and volatility estimate)
      </div>
    );
  }

  const pipSize = symbol ? pipSizeForSymbol(symbol) : 0.0001;
  const pipUnit = symbol ? pipUnitLabel(symbol) : "pips";

  const profiles = Object.entries(RISK_PROFILES).map(([key, profile]) => {
    const { tpPrice, slPrice, tpDistance, slDistance } = tpSlFromSigmas(
      entryPrice,
      direction,
      sigmaH as number,
      profile.tpSigma,
      profile.slSigma,
    );

    const tpPips = priceDistanceToPips(tpDistance, pipSize);
    const slPips = priceDistanceToPips(slDistance, pipSize);
    const riskReward = slDistance > 0 ? tpDistance / slDistance : 0;

    return {
      key,
      ...profile,
      tpPrice,
      slPrice,
      tpPips,
      slPips,
      riskReward,
    };
  });

  const formatPrice = (val: number) => val.toFixed(5);

  // Profile badge colors - institutional look
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Suggested TP/SL based on risk appetite</span>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          σ: {sigmaSource}
        </Badge>
      </div>
      <div className="rounded-lg border overflow-x-auto bg-background/80 backdrop-blur-sm">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="bg-muted/30 border-b">
              <TableHead className="text-xs font-semibold uppercase tracking-wide">Profile</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-center">Target Prob</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">SL (σ)</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">TP (σ)</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">SL Price</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">TP Price</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">SL ({pipUnit})</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">TP ({pipUnit})</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">R/R</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.key} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">
                  <Badge variant="outline" className={getProfileStyles(p.key)}>
                    {p.name}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-center">{(p.targetProb * 100).toFixed(0)}%</TableCell>
                <TableCell className="text-right font-mono text-rose-600 dark:text-rose-400">
                  {p.slSigma.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {p.tpSigma.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono text-rose-600 dark:text-rose-400">
                  {formatPrice(p.slPrice)}
                </TableCell>
                <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                  {formatPrice(p.tpPrice)}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                  {p.slPips.toFixed(1)}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {p.tpPips.toFixed(1)}
                </TableCell>
                <TableCell className="text-right font-mono font-bold">{p.riskReward.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground italic">
        {direction === "long" ? "LONG" : "SHORT"} position: TP {direction === "long" ? "above" : "below"} entry, SL{" "}
        {direction === "long" ? "below" : "above"} entry
      </p>
    </div>
  );
}

// Professional Trade Forecast Summary Table - FIXED field mappings
function ForecastSummaryTable({
  horizons,
  symbol,
  sigmaRef,
  timeframe,
}: {
  horizons: HorizonForecast[] | Record<string, HorizonForecast>;
  symbol?: string;
  sigmaRef?: number;
  timeframe?: string;
}) {
  // NEW: Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (horizon: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(horizon)) {
        next.delete(horizon);
      } else {
        next.add(horizon);
      }
      return next;
    });
  };

  // Handle both array and object formats from API
  const entries: [string, HorizonForecast][] = Array.isArray(horizons)
    ? horizons.map((h, i) => [h.h || `H${i + 1}`, h])
    : Object.entries(horizons);

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No horizon data available</p>
      </div>
    );
  }

  const formatPrice = (val?: number) => (val != null ? val.toFixed(5) : "—");
  const formatPercent = (val?: number) => (val != null ? `${(val * 100).toFixed(1)}%` : "—");
  const formatRatio = (val?: number) => (val != null ? val.toFixed(2) : "—");

  // Helper to get forecast price from nested or flat structure
  const getForecastPrice = (data: HorizonForecast): number | undefined => {
    return data.forecast?.medianPrice ?? data.forecast_price_median ?? data.forecast_price;
  };

  // Helper to get risk/reward from correct field
  const getRiskReward = (data: HorizonForecast): number | undefined => {
    return data.riskReward ?? data.risk_reward;
  };

  // Helper to get prob TP > SL from correct field
  const getProbTpBeforeSl = (data: HorizonForecast): number | undefined => {
    return data.prob_hit_tp_before_sl ?? data.prob_tp_before_sl;
  };

  // Get entry type label
  const getEntryTypeLabel = (data: HorizonForecast): string => {
    if (data.entry_type) return data.entry_type;
    if (data.trade_mode === "forward") return "Conditional Entry";
    if (data.trade_mode === "spot") return "Market Entry";
    return "Market Entry"; // Default
  };

  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Forecast Summary by Horizon</h3>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          {entries.length} horizon{entries.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="rounded-lg border overflow-x-auto bg-card">
        <Table className="min-w-[1100px]">
          <TableHeader>
            <TableRow className="bg-muted/30 border-b hover:bg-muted/30">
              <TableHead className="font-semibold text-xs uppercase tracking-wide whitespace-nowrap w-8"></TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide whitespace-nowrap">Horizon</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide whitespace-nowrap">
                Direction
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide whitespace-nowrap">
                Trade Mode
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-right whitespace-nowrap">
                Entry Price
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide whitespace-nowrap">
                Entry Type
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-right whitespace-nowrap">
                Forecast
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-right whitespace-nowrap">
                TP
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-right whitespace-nowrap">
                SL
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-right whitespace-nowrap">
                R/R
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-right whitespace-nowrap">
                Conf.
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-right whitespace-nowrap">
                Prob TP
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-right whitespace-nowrap">
                Size
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide whitespace-nowrap">Model</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([horizon, data], idx) => {
              const rowKey = data.h || horizon;
              const isExpanded = expandedRows.has(rowKey);

              return (
                <React.Fragment key={rowKey}>
                  <TableRow
                    className={`hover:bg-muted/50 transition-colors ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/20"}`}
                  >
                    {/* Expand/Collapse Button */}
                    <TableCell className="text-center p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-primary/10"
                        onClick={() => toggleRow(rowKey)}
                        title="Show Risk Profiles"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>

                    {/* Horizon */}
                    <TableCell className="font-medium font-mono">{data.h || horizon}</TableCell>

                    {/* Direction Badge */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          data.direction?.toLowerCase() === "long"
                            ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
                            : data.direction?.toLowerCase() === "short"
                              ? "border-rose-500/50 text-rose-600 bg-rose-500/10 dark:text-rose-400"
                              : ""
                        }
                      >
                        {data.direction?.toLowerCase() === "long" && <TrendingUp className="h-3 w-3 mr-1" />}
                        {data.direction?.toLowerCase() === "short" && <TrendingDown className="h-3 w-3 mr-1" />}
                        {data.direction || "—"}
                      </Badge>
                    </TableCell>

                    {/* Trade Mode Badge */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          data.trade_mode === "spot"
                            ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30"
                            : data.trade_mode === "forward"
                              ? "border-violet-500 text-violet-600 bg-violet-50 dark:bg-violet-950/30"
                              : "border-muted-foreground/50"
                        }
                      >
                        {data.trade_mode === "spot"
                          ? "Spot"
                          : data.trade_mode === "forward"
                            ? "Forward"
                            : data.trade_mode || "—"}
                      </Badge>
                    </TableCell>

                    {/* Entry Price - CRITICAL */}
                    <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                      {formatPrice(data.entry_price)}
                    </TableCell>

                    {/* Entry Type */}
                    <TableCell className="text-sm">
                      <span className="text-muted-foreground">{getEntryTypeLabel(data)}</span>
                      {data.entry_method && (
                        <span className="text-xs text-muted-foreground/70 ml-1">({data.entry_method})</span>
                      )}
                    </TableCell>

                    {/* Forecast (Med) */}
                    <TableCell className="text-right font-mono text-sm">
                      {formatPrice(getForecastPrice(data))}
                    </TableCell>

                    {/* TP */}
                    <TableCell className="text-right font-mono text-sm text-emerald-600">
                      {formatPrice(data.tp)}
                    </TableCell>

                    {/* SL */}
                    <TableCell className="text-right font-mono text-sm text-rose-600">{formatPrice(data.sl)}</TableCell>

                    {/* R/R */}
                    <TableCell className="text-right font-mono text-sm">{formatRatio(getRiskReward(data))}</TableCell>

                    {/* Confidence */}
                    <TableCell className="text-right font-mono text-sm">{formatPercent(data.confidence)}</TableCell>

                    {/* Prob TP > SL */}
                    <TableCell className="text-right font-mono text-sm">
                      {formatPercent(getProbTpBeforeSl(data))}
                    </TableCell>

                    {/* Position Size */}
                    <TableCell className="text-right font-mono text-sm">
                      {data.position_size != null ? data.position_size.toFixed(4) : "—"}
                    </TableCell>

                    {/* Model Info */}
                    <TableCell className="text-xs text-muted-foreground">
                      {data.model ? (
                        <span>
                          {data.model.mean || "—"} / {data.model.vol || "—"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>

                  {/* NEW: Expandable Risk Profiles Row */}
                  {isExpanded && (
                    <TableRow key={`${horizon}-profiles`} className="hover:bg-transparent">
                      <TableCell colSpan={14} className="p-0 border-t-0">
                        <RiskProfilesPanel
                          horizonData={data}
                          symbol={symbol}
                          sigmaRef={sigmaRef}
                          timeframe={timeframe}
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
    </div>
  );
}

// Metadata Table (Optional, professional format)
function MetadataTable({ metadata }: { metadata: ApiMetadata }) {
  const items = [
    { label: "Symbol", value: metadata.symbol },
    { label: "Timeframe", value: metadata.timeframe },
    { label: "As-of Timestamp", value: metadata.as_of ? new Date(metadata.as_of).toLocaleString() : undefined },
    { label: "Observations", value: metadata.n_obs?.toLocaleString() },
    { label: "Monte Carlo Paths", value: metadata.mc_paths?.toLocaleString() },
    { label: "Mean Model Exec (ms)", value: metadata.exec_ms_mean?.toFixed(1) },
    { label: "Vol Model Exec (ms)", value: metadata.exec_ms_vol?.toFixed(1) },
    { label: "Mean Model", value: metadata.mean_model },
    { label: "Volatility Model", value: metadata.vol_model },
  ].filter((item) => item.value != null);

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No metadata available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.label}>
              <TableCell className="font-medium text-muted-foreground w-1/3">{item.label}</TableCell>
              <TableCell className="font-mono text-sm">{item.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Model Status Card (Optional)
function ModelStatusCard({ status }: { status: ModelStatus }) {
  const items = [
    { label: "Mean Model", value: status.mean_model, status: status.mean_status },
    { label: "Volatility Model", value: status.vol_model, status: status.vol_status },
    { label: "Device", value: status.device },
    { label: "Loaded", value: status.loaded != null ? (status.loaded ? "Yes" : "No") : undefined },
  ].filter((item) => item.value != null);

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Cpu className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No model status available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.label}>
              <TableCell className="font-medium text-muted-foreground w-1/3">{item.label}</TableCell>
              <TableCell className="font-mono text-sm">
                {item.value}
                {item.status && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {item.status}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ForecastPlaygroundContent() {
  // Form state
  const [symbol, setSymbol] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("15min");
  const [horizons, setHorizons] = useState("1, 3, 6");
  const [tradeMode, setTradeMode] = useState<"spot" | "forward">("spot"); // NEW: Trade mode selector
  const [useMonteCarlo, setUseMonteCarlo] = useState(true);
  const [paths, setPaths] = useState(3000);
  // Skew parameter for Surface API: 0 = symmetric, >0 = right skew (bullish), <0 = left skew (bearish)
  const [skew, setSkew] = useState(0.0);
  const [includePredictions, setIncludePredictions] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [includeModelInfo, setIncludeModelInfo] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Request state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);

  // Surface API state (NEW - additive)
  const [surfaceResult, setSurfaceResult] = useState<SurfaceApiResponse | null>(null);
  const [surfaceLoading, setSurfaceLoading] = useState(false);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);

  // Optional enhancement toggles (disabled by default)
  const [showChart, setShowChart] = useState(false);
  const [showStyledJson, setShowStyledJson] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    // Reset surface state too
    setSurfaceLoading(true);
    setSurfaceError(null);
    setSurfaceResult(null);

    const startTime = performance.now();

    // Parse horizons
    const parsedHorizons = horizons
      .split(",")
      .map((h) => parseInt(h.trim(), 10))
      .filter((h) => !isNaN(h) && h > 0);

    if (parsedHorizons.length === 0) {
      setError("Invalid horizons. Please enter comma-separated positive integers.");
      setLoading(false);
      setSurfaceLoading(false);
      return;
    }

    const requestBody: Record<string, unknown> = {
      symbol,
      timeframe,
      horizons: parsedHorizons,
      trade_mode: tradeMode, // NEW: Include trade mode in request
      use_montecarlo: useMonteCarlo,
      include_predictions: includePredictions,
      include_metadata: includeMetadata,
      include_model_info: includeModelInfo,
    };

    if (useMonteCarlo) {
      requestBody.paths = paths;
    }

    // Execute BOTH API calls in parallel (forecast + surface)
    const forecastPromise = fetch("https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/forecast-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const surfacePromise = fetch("https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/surface-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol,
        timeframe,
        horizon_hours: parsedHorizons,
        skew, // Skew parameter: 0 = symmetric, >0 = right skew, <0 = left skew
        paths: 1000,
        dof: 3.0,
        target_prob: { min: 0.05, max: 0.95, steps: 50 },
        sl_sigma: { min: 0.1, max: 8.0, steps: 50 },
      }),
    });

    // Handle forecast API (existing behavior preserved)
    try {
      const response = await forecastPromise;

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      setRequestInfo({
        params: requestBody,
        timestamp: new Date().toISOString(),
        duration: performance.now() - startTime,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }

    // Handle surface API (NEW - additive, independent error handling)
    try {
      const surfaceResponse = await surfacePromise;

      if (!surfaceResponse.ok) {
        throw new Error(`Surface API error: ${surfaceResponse.status}`);
      }

      const surfaceData = await surfaceResponse.json();
      setSurfaceResult(surfaceData);
    } catch (err) {
      console.error("[Surface API] Error:", err);
      setSurfaceError(err instanceof Error ? err.message : "Surface API error");
    } finally {
      setSurfaceLoading(false);
    }
  };

  // FIXED: Extract predictions for chart with CORRECT format
  // Try multiple possible paths: data.predictions OR data.payload.predictions
  const getMultiHorizonChartData = () => {
    if (!result?.data || typeof result.data !== "object") return { series: [], allPoints: [] };

    const responseData = result.data as Record<string, unknown>;
    
    // DEBUG: Log actual data structure to diagnose
    console.log("[ForecastPlayground] result.data structure:", {
      hasData: !!responseData,
      dataKeys: Object.keys(responseData),
      hasPredictions: !!responseData.predictions,
      hasPayloadPredictions: !!(responseData.payload as any)?.predictions,
    });
    
    // Try multiple possible paths for predictions
    const predictions = 
      (responseData.predictions as Record<string, PredictionDataPoint[]>) ||
      ((responseData.payload as Record<string, unknown>)?.predictions as Record<string, PredictionDataPoint[]>) ||
      null;

    if (!predictions || typeof predictions !== "object" || Array.isArray(predictions)) {
      console.warn("[ForecastPlayground] No predictions found in expected paths");
      return { series: [], allPoints: [] };
    }

    const horizonEntries = Object.entries(predictions);
    if (horizonEntries.length === 0) return { series: [], allPoints: [] };

    // Build series metadata
    const series = horizonEntries.map(([horizonKey], index) => ({
      key: horizonKey,
      color: HORIZON_COLORS[index % HORIZON_COLORS.length],
    }));

    // Flatten all points with horizon labels for unified X-axis
    // We'll create a combined dataset where each unique ds maps to multiple yhat values
    const allTimestamps = new Set<string>();
    horizonEntries.forEach(([, points]) => {
      if (Array.isArray(points)) {
        points.forEach((p) => {
          if (p.ds) allTimestamps.add(p.ds);
        });
      }
    });

    const sortedTimestamps = Array.from(allTimestamps).sort();

    // Build chart data: each row has ds and yhat_{horizon} for each horizon
    const allPoints = sortedTimestamps.map((ds) => {
      const point: Record<string, unknown> = { ds, dsFormatted: formatTimestamp(ds) };
      horizonEntries.forEach(([horizonKey, points]) => {
        if (Array.isArray(points)) {
          const match = points.find((p) => p.ds === ds);
          if (match) {
            point[`yhat_${horizonKey}`] = match.yhat;
          }
        }
      });
      return point;
    });

    return { series, allPoints };
  };

  const formatTimestamp = (ds: string) => {
    try {
      const date = new Date(ds);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return ds;
    }
  };

  const { series: chartSeries, allPoints: chartData } = showChart
    ? getMultiHorizonChartData()
    : { series: [], allPoints: [] };
  const hasValidChartData = chartSeries.length > 0 && chartData.length > 0;

  // Extract structured data for detailed view
  // FIXED: Handle both array and object formats from API (data.payload.horizons)
  const getPayloadHorizons = (): HorizonForecast[] => {
    if (!result?.data || typeof result.data !== "object") return [];
    const data = result.data as { payload?: { horizons?: HorizonForecast[] | Record<string, HorizonForecast> } };
    const horizonsData = data.payload?.horizons;
    if (!horizonsData) return [];
    // If it's already an array, return it directly
    if (Array.isArray(horizonsData)) return horizonsData;
    // If it's an object, convert to array
    return Object.entries(horizonsData).map(([key, val]) => ({ ...val, h: val.h || key }));
  };

  const getMetadata = (): ApiMetadata => {
    if (!result?.data || typeof result.data !== "object") return {};
    const data = result.data as { metadata?: ApiMetadata };
    return data.metadata || {};
  };

  const getModelStatus = (): ModelStatus => {
    if (!result?.data || typeof result.data !== "object") return {};
    const data = result.data as { model_status?: ModelStatus };
    return data.model_status || {};
  };

  const payloadHorizons = showDetailedView ? getPayloadHorizons() : [];
  const metadata = showDetailedView ? getMetadata() : {};
  const modelStatus = showDetailedView ? getModelStatus() : {};
  const hasDetailedData =
    payloadHorizons.length > 0 || Object.keys(metadata).length > 0 || Object.keys(modelStatus).length > 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-8 w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Forecast Playground</h1>
            </div>
            <p className="text-muted-foreground">
              Configure and test the forecasting pipeline. Internal debugging tool.
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-amber-600 border-amber-600 bg-amber-50 dark:bg-amber-950/20">
            🔬 Internal Tool — Super Users Only
          </Badge>
        </div>

        {/* Configuration Form - Grouped into logical sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Market Context Card */}
          <Card className="border bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Market Context
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Asset & Timeframe Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asset" className="text-xs font-medium">
                    Symbol
                  </Label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger id="asset" className="h-9">
                      <SelectValue placeholder="Select asset" />
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
                  <Label htmlFor="timeframe" className="text-xs font-medium">
                    Timeframe
                  </Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger id="timeframe" className="h-9">
                      <SelectValue placeholder="Select" />
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
              </div>

              {/* Horizons input */}
              <div className="space-y-2">
                <Label htmlFor="horizons" className="text-xs font-medium">
                  Horizons
                </Label>
                <Input
                  id="horizons"
                  value={horizons}
                  onChange={(e) => setHorizons(e.target.value)}
                  placeholder="1, 3, 6"
                  className="h-9 font-mono"
                />
                <p className="text-xs text-muted-foreground">Forecast horizons in hours (comma-separated)</p>
              </div>

              {/* Trade Mode */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Trade Mode</Label>
                <RadioGroup
                  value={tradeMode}
                  onValueChange={(value) => setTradeMode(value as "spot" | "forward")}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="flex items-center space-x-2 p-2 rounded-md border bg-background hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="spot" id="spot" />
                    <Label htmlFor="spot" className="flex items-center gap-1.5 cursor-pointer font-normal text-sm">
                      <Zap className="h-3.5 w-3.5 text-blue-500" />
                      Spot (Market)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-md border bg-background hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="forward" id="forward" />
                    <Label htmlFor="forward" className="flex items-center gap-1.5 cursor-pointer font-normal text-sm">
                      <Target className="h-3.5 w-3.5 text-violet-500" />
                      Forward (Conditional)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Model Assumptions Card */}
          <Card className="border bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Model Assumptions
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Monte Carlo toggle and paths */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center space-x-3">
                  <Switch id="montecarlo" checked={useMonteCarlo} onCheckedChange={setUseMonteCarlo} />
                  <Label htmlFor="montecarlo" className="text-sm font-medium cursor-pointer">
                    Use Monte Carlo
                  </Label>
                </div>
                {useMonteCarlo && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="paths" className="text-xs text-muted-foreground">
                      Paths:
                    </Label>
                    <Input
                      id="paths"
                      type="number"
                      value={paths}
                      onChange={(e) => setPaths(parseInt(e.target.value, 10) || 0)}
                      className="w-24 h-8 text-sm font-mono"
                      min={100}
                      max={10000}
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground -mt-2 ml-1">Higher paths = more precise, slower</p>

              {/* Advanced options */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 w-full justify-start hover:bg-muted/50">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`}
                    />
                    <span className="text-xs font-medium">Advanced Options</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3 pl-2 border-l-2 border-primary/20 ml-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includePredictions"
                      checked={includePredictions}
                      onCheckedChange={setIncludePredictions}
                    />
                    <Label htmlFor="includePredictions" className="text-sm cursor-pointer">
                      Include Predictions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="includeMetadata" checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
                    <Label htmlFor="includeMetadata" className="text-sm cursor-pointer">
                      Include Metadata
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="includeModelInfo" checked={includeModelInfo} onCheckedChange={setIncludeModelInfo} />
                    <Label htmlFor="includeModelInfo" className="text-sm cursor-pointer">
                      Include Model Info
                    </Label>
                  </div>

                  {/* Skew parameter */}
                  <div className="space-y-2 pt-3 border-t border-border/50">
                    <Label
                      htmlFor="skew"
                      className="flex items-center gap-2 text-sm"
                      title="Controls distribution asymmetry. 0 = symmetric, >0 = bullish tail, <0 = bearish tail"
                    >
                      Skew (σ asymmetry)
                      <Badge variant="outline" className="text-xs font-mono">
                        {skew === 0 ? "Symmetric" : skew > 0 ? "Right" : "Left"}
                      </Badge>
                    </Label>
                    <Input
                      id="skew"
                      type="number"
                      step="0.1"
                      min={-2}
                      max={2}
                      value={skew}
                      onChange={(e) => setSkew(parseFloat(e.target.value) || 0)}
                      className="w-full max-w-[140px] h-8 font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Controls tail risk assumptions</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        {/* Run Action - Prominent CTA */}
        <div className={`transition-opacity duration-200 ${loading ? "opacity-70" : "opacity-100"}`}>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto min-w-[200px] h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                <span className="animate-pulse">Simulating scenarios...</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Run Forecast
              </>
            )}
          </Button>
        </div>

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {loading && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Fetching forecast from backend...
              </div>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        )}

        {/* Results display */}
        {result && requestInfo && !loading && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Forecast Results</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Completed in {requestInfo.duration.toFixed(0)}ms at{" "}
                    {new Date(requestInfo.timestamp).toLocaleTimeString()}
                  </CardDescription>
                </div>
                {/* Optional toggles */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="showChart" checked={showChart} onCheckedChange={setShowChart} />
                    <Label htmlFor="showChart" className="flex items-center gap-2 text-sm cursor-pointer">
                      <BarChart3 className="h-4 w-4" />
                      Chart
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="showDetailedView" checked={showDetailedView} onCheckedChange={setShowDetailedView} />
                    <Label htmlFor="showDetailedView" className="flex items-center gap-2 text-sm cursor-pointer">
                      <FileText className="h-4 w-4" />
                      Detailed View
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Optional Chart Section - FIXED for actual API format */}
              {showChart && (
                <div className="rounded-lg border bg-card p-4">
                  {hasValidChartData ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Predictions by Horizon (Time Series)
                      </h4>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis
                              dataKey="dsFormatted"
                              className="text-xs fill-muted-foreground"
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              className="text-xs fill-muted-foreground"
                              tick={{ fill: "hsl(var(--muted-foreground))" }}
                              tickFormatter={(value) => value.toFixed(4)}
                              domain={["auto", "auto"]}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                color: "hsl(var(--foreground))",
                              }}
                              formatter={(value: number, name: string) => [
                                value.toFixed(6),
                                name.replace("yhat_", "Horizon "),
                              ]}
                              labelFormatter={(label) => `Time: ${label}`}
                            />
                            <Legend formatter={(value) => value.replace("yhat_", "")} />
                            {chartSeries.map((s) => (
                              <Line
                                key={s.key}
                                type="monotone"
                                dataKey={`yhat_${s.key}`}
                                name={`yhat_${s.key}`}
                                stroke={s.color}
                                strokeWidth={2}
                                dot={{ fill: s.color, strokeWidth: 1, r: 2 }}
                                activeDot={{ r: 5, fill: s.color }}
                                connectNulls
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No valid prediction data available for chart.</p>
                      <p className="text-sm mt-1">
                        Enable <code className="bg-muted px-1 rounded">Include Predictions</code> in Advanced Options
                        and run the forecast again.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Optional Detailed View Section - Professional Tables */}
              {showDetailedView && (
                <div className="space-y-4">
                  {/* Forecast Summary Table */}
                  {payloadHorizons.length > 0 && (
                    <ForecastSummaryTable
                      horizons={payloadHorizons}
                      symbol={symbol}
                      sigmaRef={surfaceResult?.sigma_ref}
                      timeframe={timeframe}
                    />
                  )}

                  {/* Metadata Table */}
                  {Object.keys(metadata).length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                          <Database className="h-4 w-4" />
                          Metadata
                          <ChevronDown className="h-4 w-4 ml-auto" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <MetadataTable metadata={metadata} />
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Model Status */}
                  {Object.keys(modelStatus).length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                          <Cpu className="h-4 w-4" />
                          Model Status
                          <ChevronDown className="h-4 w-4 ml-auto" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <ModelStatusCard status={modelStatus} />
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {!hasDetailedData && (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No detailed data available.</p>
                      <p className="text-sm mt-1">
                        Enable <code className="bg-muted px-1 rounded">Include Metadata</code> and{" "}
                        <code className="bg-muted px-1 rounded">Include Model Info</code> in Advanced Options.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Existing Tabs - Updated to include Risk Surface */}
              <Tabs defaultValue="predictions" className="w-full">
                <TabsList className="grid w-full grid-cols-4 text-xs sm:text-sm">
                  <TabsTrigger value="predictions">Predictions</TabsTrigger>
                  <TabsTrigger value="risk-surface">Risk Surface</TabsTrigger>
                  <TabsTrigger value="request">Request Info</TabsTrigger>
                  <TabsTrigger value="raw">Raw Response</TabsTrigger>
                </TabsList>

                <TabsContent value="predictions" className="mt-4">
                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    {(() => {
                      const responseData = result.data as Record<string, unknown>;
                      const predictions = responseData?.predictions || 
                        (responseData?.payload as Record<string, unknown>)?.predictions;
                      
                      if (predictions) {
                        return (
                          <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                            {JSON.stringify(predictions, null, 2)}
                          </pre>
                        );
                      }
                      return (
                        <div className="text-muted-foreground">
                          <p>No predictions data found in response.</p>
                          <p className="text-sm mt-2">Check the "Raw Response" tab for the full response structure.</p>
                        </div>
                      );
                    })()}
                  </ScrollArea>
                </TabsContent>

                {/* NEW: Risk Surface Tab - Additive */}
                <TabsContent value="risk-surface" className="mt-4">
                  <RiskSurfaceChart
                    data={surfaceResult}
                    loading={surfaceLoading}
                    error={surfaceError}
                    symbol={symbol}
                    timeframe={timeframe}
                    horizonHours={
                      horizons
                        .split(",")
                        .map((h) => parseInt(h.trim(), 10))
                        .filter((h) => !isNaN(h) && h > 0)[0] ?? 1
                    }
                  />
                </TabsContent>

                <TabsContent value="request" className="mt-4">
                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Request Parameters</h4>
                        <pre className="text-sm font-mono bg-muted p-3 rounded-md whitespace-pre-wrap break-words">
                          {JSON.stringify(requestInfo.params, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Timing</h4>
                        <ul className="text-sm space-y-1">
                          <li>
                            <span className="text-muted-foreground">Timestamp:</span> {requestInfo.timestamp}
                          </li>
                          <li>
                            <span className="text-muted-foreground">Duration:</span> {requestInfo.duration.toFixed(2)}ms
                          </li>
                        </ul>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="raw" className="mt-4">
                  <div className="space-y-3">
                    {/* Optional styled JSON toggle */}
                    <div className="flex items-center space-x-2">
                      <Switch id="showStyledJson" checked={showStyledJson} onCheckedChange={setShowStyledJson} />
                      <Label htmlFor="showStyledJson" className="flex items-center gap-2 text-sm cursor-pointer">
                        <Eye className="h-4 w-4" />
                        Show Styled View
                      </Label>
                    </div>
                    <ScrollArea className="h-[400px] rounded-md border p-4">
                      {showStyledJson ? (
                        <div className="text-sm font-mono">
                          <StyledJsonViewer data={result} />
                        </div>
                      ) : (
                        <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

export default function ForecastPlayground() {
  return (
    <SuperUserGuard
      fallback={
        <Layout>
          <LabsComingSoon
            title="Forecast Playground"
            description="Internal forecasting tool for testing and debugging the AI pipeline."
          />
        </Layout>
      }
    >
      <ForecastPlaygroundContent />
    </SuperUserGuard>
  );
}
