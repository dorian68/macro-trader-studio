import { useState, useCallback, useMemo } from "react";
import Plot from "react-plotly.js";
import type { PlotMouseEvent, Data, Layout } from "plotly.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, TrendingUp, TrendingDown, AlertCircle, MousePointer, DollarSign, Activity, Sigma, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  pipSizeForSymbol,
  pipUnitLabel,
  computeSteps,
  sigmaHFromSigmaRef,
  priceDistanceToPips
} from "@/lib/forecastUtils";

// Interface for Surface API response
export interface SurfaceApiResponse {
  sigma_ref: number;
  entry_price: number;
  atr?: number;  // NEW: ATR(14) in PRICE units (optional, from backend)
  surface: {
    target_probs: number[];  // Y-axis values (Target Probability)
    sl_sigma: number[];      // X-axis values (Stop-Loss σ)
    tp_sigma: number[][];    // Z-axis matrix [target_prob_index][sl_sigma_index]
  };
  horizons?: Array<{
    h: string;
    direction: string;
  }>;
}

interface SelectedPoint {
  slSigma: number;
  tpSigma: number;
  targetProb: number;
  slPrice: number;
  tpPrice: number;
  slPips?: number;
  tpPips?: number;
  pipUnit?: string;
  calculationMethod?: "ATR" | "σ";  // Indicates which method was used for price/pip calculation
}

interface RiskSurfaceChartProps {
  data: SurfaceApiResponse | null;
  loading?: boolean;
  error?: string | null;
  symbol?: string;       // NEW: for pip calculation
  timeframe?: string;    // NEW: for horizon scaling
  horizonHours?: number; // NEW: for horizon scaling
}

export function RiskSurfaceChart({ 
  data, 
  loading, 
  error,
  symbol,
  timeframe,
  horizonHours
}: RiskSurfaceChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);

  // Calculate price from multiplier - supports ATR (priority) or sigma_ref (fallback)
  const calculatePrice = useCallback((
    multiplier: number,
    entryPrice: number,
    sigmaRef: number,
    atr: number | undefined,
    isLoss: boolean
  ) => {
    // Prioritize ATR if available and valid, otherwise use sigma_ref
    const useATR = atr != null && atr > 0;
    const delta = useATR ? multiplier * atr : multiplier * sigmaRef;
    return isLoss ? entryPrice - delta : entryPrice + delta;
  }, []);

  // Handle click on surface
  const handlePlotClick = useCallback((event: PlotMouseEvent) => {
    if (!data || !event.points || event.points.length === 0) return;
    
    const point = event.points[0];
    const slSigma = point.x as number;      // X is now Stop-Loss
    const targetProb = point.y as number;   // Y is now Target Probability
    const pointData = point as unknown as { z: number };
    const tpSigma = pointData.z;

    if (typeof tpSigma !== 'number') return;

    // Determine calculation method: ATR (priority) or sigma (fallback)
    const useATR = data.atr != null && data.atr > 0;

    // Calculate SL/TP prices using ATR or sigma_ref
    const slPrice = calculatePrice(slSigma, data.entry_price, data.sigma_ref, data.atr, true);
    const tpPrice = calculatePrice(tpSigma, data.entry_price, data.sigma_ref, data.atr, false);

    // Calculate pips if symbol is available
    let slPips: number | undefined;
    let tpPips: number | undefined;
    let pipUnit: string | undefined;
    let calculationMethod: "ATR" | "σ" | undefined;

    if (symbol) {
      const pipSize = pipSizeForSymbol(symbol);
      pipUnit = pipUnitLabel(symbol);
      
      if (useATR && data.atr) {
        // ATR-based calculation
        const slDistance = slSigma * data.atr;
        const tpDistance = tpSigma * data.atr;
        slPips = priceDistanceToPips(slDistance, pipSize);
        tpPips = priceDistanceToPips(tpDistance, pipSize);
        calculationMethod = "ATR";
      } else if (timeframe && data.sigma_ref) {
        // Fallback: Sigma-based calculation
        const horizon = horizonHours ?? 1;
        const steps = computeSteps(horizon, timeframe);
        const sigmaH = sigmaHFromSigmaRef(data.sigma_ref, steps);
        const slDistance = data.entry_price * (slSigma * sigmaH);
        const tpDistance = data.entry_price * (tpSigma * sigmaH);
        slPips = priceDistanceToPips(slDistance, pipSize);
        tpPips = priceDistanceToPips(tpDistance, pipSize);
        calculationMethod = "σ";
      }
    }

    setSelectedPoint({
      slSigma,
      tpSigma,
      targetProb,
      slPrice,
      tpPrice,
      slPips,
      tpPips,
      pipUnit,
      calculationMethod,
    });
  }, [data, calculatePrice, symbol, timeframe, horizonHours]);

  // Memoize plot data and layout
  const { plotData, layout } = useMemo(() => {
    if (!data?.surface) {
      return { plotData: [], layout: {} };
    }

    const { target_probs, sl_sigma, tp_sigma } = data.surface;

    // New axis config: X = sl_sigma, Y = target_probs
    // Original matrix: tp_sigma[target_prob_index][sl_sigma_index]
    // Plotly expects z[y_index][x_index] = z[target_prob_index][sl_sigma_index] ✓
    // No transpose needed - matrix already matches the new orientation

    const plotData: Data[] = [
      {
        type: "surface",
        x: sl_sigma,       // X-axis: Stop-Loss (σ)
        y: target_probs,   // Y-axis: Target Probability
        z: tp_sigma,       // Z-axis: Take-Profit (σ) - no transpose needed
        colorscale: [
          [0, "hsl(220, 70%, 50%)"],      // Blue for low TP
          [0.25, "hsl(180, 60%, 45%)"],   // Teal
          [0.5, "hsl(140, 60%, 45%)"],    // Green for medium TP
          [0.75, "hsl(45, 80%, 50%)"],    // Yellow/Orange
          [1, "hsl(0, 70%, 50%)"],        // Red for high TP
        ],
        colorbar: {
          title: { text: "TP (σ)", side: "right" },
          tickfont: { size: 10 },
          len: 0.8,
        },
        hovertemplate: 
          "<b>Stop-Loss:</b> %{x:.2f}σ<br>" +
          "<b>Target Prob:</b> %{y:.1%}<br>" +
          "<b>Take-Profit:</b> %{z:.2f}σ<br>" +
          "<extra></extra>",
        lighting: {
          ambient: 0.8,
          diffuse: 0.5,
          specular: 0.3,
          roughness: 0.5,
        },
        contours: {
          z: {
            show: true,
            usecolormap: true,
            highlightcolor: "#ffffff",
            project: { z: false },
          },
        },
      } as Data,
    ];

    const layout: Partial<Layout> = {
      autosize: true,
      margin: { l: 0, r: 0, t: 30, b: 0 },
      scene: {
        xaxis: {
          title: { text: "Stop-Loss (σ)", font: { size: 11 } },
          tickfont: { size: 9 },
          gridcolor: "rgba(255,255,255,0.1)",
        },
        yaxis: {
          title: { text: "Target Probability", font: { size: 11 } },
          tickformat: ".0%",
          tickfont: { size: 9 },
          gridcolor: "rgba(255,255,255,0.1)",
        },
        zaxis: {
          title: { text: "Take-Profit (σ)", font: { size: 11 } },
          tickfont: { size: 9 },
          gridcolor: "rgba(255,255,255,0.1)",
        },
        camera: {
          eye: { x: 1.5, y: 1.5, z: 1.2 },
          center: { x: 0, y: 0, z: -0.1 },
        },
        aspectmode: "cube",
        bgcolor: "rgba(0,0,0,0)",
      },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: {
        color: "hsl(var(--foreground))",
        family: "system-ui, sans-serif",
      },
    };

    return { plotData, layout };
  }, [data]);

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load Risk Surface: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            No surface data available. Run a forecast to generate the risk surface.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (price: number) => price.toFixed(5);
  const formatSigma = (sigma: number) => sigma.toFixed(2);
  const formatPercent = (prob: number) => `${(prob * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header with Entry Info - Institutional Grade Premium */}
      <Card className="border-0 bg-gradient-to-r from-card via-card to-muted/30 shadow-sm">
        <CardHeader className="pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="p-2 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                Risk / Reward Surface
              </CardTitle>
              <CardDescription className="text-sm max-w-md text-muted-foreground/80">
                Probability-adjusted take-profit as a function of stop-loss intensity
              </CardDescription>
            </div>
            {/* Premium Key Indicators */}
            <div className="flex flex-wrap gap-3">
              {symbol && (
                <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-primary/5 border border-primary/20 transition-all duration-200 hover:bg-primary/10 hover:border-primary/30">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Symbol</span>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-base font-bold text-foreground">{symbol}</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 transition-all duration-200 hover:bg-amber-500/10 hover:border-amber-500/30" title="Entry price for scenario calculations">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Entry Price</span>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="font-mono text-base font-bold text-foreground">{formatPrice(data.entry_price)}</span>
                </div>
              </div>
              {data.atr != null && data.atr > 0 && (
                <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 transition-all duration-200 hover:bg-emerald-500/10 hover:border-emerald-500/30" title="ATR(14) - Average True Range in price units">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ATR(14)</span>
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-mono text-base font-bold text-foreground">{data.atr.toFixed(5)}</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-violet-500/5 border border-violet-500/20 transition-all duration-200 hover:bg-violet-500/10 hover:border-violet-500/30" title="Reference volatility (standard deviation)">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">σ Ref</span>
                <div className="flex items-center gap-1.5">
                  <Sigma className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  <span className="font-mono text-base font-bold text-foreground">{data.sigma_ref.toFixed(6)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Chart + Panel Side-by-Side Layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 3D Surface Chart - Premium Interactive Container */}
        <div className={cn(
          "flex-1 transition-all duration-300 ease-out",
          selectedPoint ? "lg:max-w-[calc(100%-280px)]" : "w-full"
        )}>
          <Card className="overflow-hidden border-primary/10 shadow-lg shadow-primary/5 ring-1 ring-primary/5 h-full">
            <CardContent className="p-0">
              <div className="relative bg-gradient-to-br from-slate-950/50 via-background to-primary/5 p-4 sm:p-6">
                {/* Subtle glow effect behind chart */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
                <div className="relative w-full rounded-xl overflow-hidden ring-1 ring-white/5 shadow-xl" style={{ height: "500px" }}>
                  <Plot
                    data={plotData}
                    layout={layout}
                    config={{
                      responsive: true,
                      displayModeBar: true,
                      modeBarButtonsToRemove: ["toImage", "sendDataToCloud"],
                      displaylogo: false,
                    }}
                    style={{ width: "100%", height: "100%" }}
                    onClick={handlePlotClick}
                    useResizeHandler
                  />
                </div>
              </div>
              {/* Interactive CTA - More Engaging */}
              <div className="flex items-center justify-center gap-3 py-4 border-t bg-gradient-to-r from-primary/5 via-muted/30 to-primary/5">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 border border-primary/20 shadow-sm">
                  <MousePointer className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Click anywhere</span>
                    <span className="text-primary font-medium ml-1">to explore risk scenarios</span>
                  </span>
                </div>
                <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary/80">
                  Interactive 3D
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Point Panel - Slide-in from Right */}
        {selectedPoint && (
          <div className="w-full lg:w-fit lg:min-w-[240px] lg:max-w-[280px] flex-shrink-0 animate-in slide-in-from-right-8 fade-in-0 duration-300">
            <Card className="border-l-4 border-l-primary border-primary/20 bg-gradient-to-br from-primary/5 via-background to-transparent shadow-lg h-full">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/15 ring-1 ring-primary/30">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 block mb-0.5">Selected Scenario</span>
                      <CardTitle className="text-base font-bold">Trade Configuration</CardTitle>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="p-1.5 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                    title="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {selectedPoint.calculationMethod && (
                  <Badge 
                    variant={selectedPoint.calculationMethod === "ATR" ? "default" : "outline"} 
                    className={cn(
                      "text-xs font-mono mt-2 w-fit",
                      selectedPoint.calculationMethod === "ATR" 
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-sm" 
                        : ""
                    )}
                  >
                    {selectedPoint.calculationMethod === "ATR" ? "ATR-based" : "σ-based"}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Stop-Loss Card */}
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-rose-500/10">
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Stop-Loss</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-foreground" title="Stop-loss in standard deviations">
                    {formatSigma(selectedPoint.slSigma)}σ
                  </div>
                  <div className="space-y-1 pt-2 border-t border-rose-500/10">
                    <div className="text-xs text-muted-foreground">
                      Price: <span className="font-mono font-medium text-foreground">{formatPrice(selectedPoint.slPrice)}</span>
                    </div>
                    {selectedPoint.slPips != null && (
                      <div className="text-base font-mono font-bold text-rose-600 dark:text-rose-400">
                        {selectedPoint.slPips.toFixed(1)} <span className="text-xs font-normal opacity-70">{selectedPoint.pipUnit}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Take-Profit Card */}
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-emerald-500/10">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Take-Profit</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-foreground" title="Take-profit in standard deviations">
                    {formatSigma(selectedPoint.tpSigma)}σ
                  </div>
                  <div className="space-y-1 pt-2 border-t border-emerald-500/10">
                    <div className="text-xs text-muted-foreground">
                      Price: <span className="font-mono font-medium text-foreground">{formatPrice(selectedPoint.tpPrice)}</span>
                    </div>
                    {selectedPoint.tpPips != null && (
                      <div className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedPoint.tpPips.toFixed(1)} <span className="text-xs font-normal opacity-70">{selectedPoint.pipUnit}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Probability & R/R Card */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Probability</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-foreground" title="Probability of hitting TP before SL">
                    {formatPercent(selectedPoint.targetProb)}
                  </div>
                  <div className="space-y-1 pt-2 border-t border-primary/10">
                    <div className="text-xs text-muted-foreground">Risk/Reward Ratio</div>
                    <div className="text-base font-mono font-bold text-primary">
                      {(selectedPoint.tpSigma / selectedPoint.slSigma).toFixed(2)} <span className="text-xs font-normal opacity-70">R/R</span>
                    </div>
                  </div>
                </div>

                {/* Footer with Entry Context */}
                <div className="flex items-center justify-between pt-3 border-t border-border/30 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Entry:</span>
                    <span className="font-mono font-semibold text-foreground">{formatPrice(data.entry_price)}</span>
                  </div>
                  {symbol && (
                    <Badge variant="outline" className="font-medium text-xs">
                      {symbol}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
