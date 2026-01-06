import { useState, useCallback, useMemo } from "react";
import Plot from "react-plotly.js";
import type { PlotMouseEvent, Data, Layout } from "plotly.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, TrendingUp, TrendingDown, AlertCircle, MousePointer } from "lucide-react";
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
  // NEW: Pips info
  slPips?: number;
  tpPips?: number;
  pipUnit?: string;
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

  // Calculate price from sigma
  const sigmaToPrice = useCallback((sigma: number, entryPrice: number, sigmaRef: number, isLoss: boolean) => {
    const delta = sigma * sigmaRef;
    return isLoss ? entryPrice - delta : entryPrice + delta;
  }, []);

  // Handle click on surface
  const handlePlotClick = useCallback((event: PlotMouseEvent) => {
    if (!data || !event.points || event.points.length === 0) return;
    
    const point = event.points[0];
    const slSigma = point.x as number;      // X is now Stop-Loss
    const targetProb = point.y as number;  // Y is now Target Probability
    // Access z from the point data - use type assertion for surface plot data
    const pointData = point as unknown as { z: number };
    const tpSigma = pointData.z;

    if (typeof tpSigma !== 'number') return;

    const slPrice = sigmaToPrice(slSigma, data.entry_price, data.sigma_ref, true);
    const tpPrice = sigmaToPrice(tpSigma, data.entry_price, data.sigma_ref, false);

    // NEW: Calculate pips if symbol is available
    let slPips: number | undefined;
    let tpPips: number | undefined;
    let pipUnit: string | undefined;

    if (symbol && timeframe && data.sigma_ref) {
      const pipSize = pipSizeForSymbol(symbol);
      pipUnit = pipUnitLabel(symbol);
      
      // Calculate horizon-scaled sigma
      const horizon = horizonHours ?? 1;
      const steps = computeSteps(horizon, timeframe);
      const sigmaH = sigmaHFromSigmaRef(data.sigma_ref, steps);
      
      // Calculate price distances using horizon-scaled sigma
      const slDistance = data.entry_price * (slSigma * sigmaH);
      const tpDistance = data.entry_price * (tpSigma * sigmaH);
      
      slPips = priceDistanceToPips(slDistance, pipSize);
      tpPips = priceDistanceToPips(tpDistance, pipSize);
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
    });
  }, [data, sigmaToPrice, symbol, timeframe, horizonHours]);

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
      {/* Header with Entry Info - Institutional Grade */}
      <Card className="border-0 bg-gradient-to-r from-card to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Target className="h-5 w-5 text-primary" />
                Risk / Reward Surface
              </CardTitle>
              <CardDescription className="text-sm max-w-md">
                Probability-adjusted take-profit as a function of stop-loss intensity
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {symbol && (
                <Badge variant="outline" className="font-mono text-xs">
                  {symbol}
                </Badge>
              )}
              <Badge variant="secondary" className="font-mono text-xs" title="Entry price for scenario calculations">
                Entry: {formatPrice(data.entry_price)}
              </Badge>
              {data.atr != null && data.atr > 0 && (
                <Badge className="font-mono text-xs bg-emerald-600 hover:bg-emerald-700" title="ATR(14) - Average True Range in price units">
                  ATR: {data.atr.toFixed(5)}
                </Badge>
              )}
              <Badge variant="outline" className="font-mono text-xs" title="Reference volatility (standard deviation)">
                σ ref: {data.sigma_ref.toFixed(6)}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 3D Surface Chart - Enhanced Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-b from-background to-muted/10 p-4 sm:p-6">
            <div className="relative w-full rounded-lg overflow-hidden" style={{ height: "480px" }}>
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
          <div className="flex items-center justify-center gap-2 py-3 border-t bg-muted/20">
            <MousePointer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Click on the surface to select a trade scenario</span>
          </div>
        </CardContent>
      </Card>

      {/* Selected Point Panel - Professional Scenario Insight */}
      {selectedPoint && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent animate-in fade-in-50 duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Selected Trade Scenario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Stop-Loss Card */}
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-rose-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">Stop-Loss</span>
                </div>
                <div className="font-mono text-xl font-bold" title="Stop-loss in standard deviations">
                  {formatSigma(selectedPoint.slSigma)}σ
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    SL Price: <span className="font-mono">{formatPrice(selectedPoint.slPrice)}</span>
                  </div>
                  {selectedPoint.slPips != null && (
                    <div className="text-base font-mono font-bold text-rose-600 dark:text-rose-400">
                      {selectedPoint.slPips.toFixed(1)} <span className="text-xs font-normal">{selectedPoint.pipUnit}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Take-Profit Card */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Take-Profit</span>
                </div>
                <div className="font-mono text-xl font-bold" title="Take-profit in standard deviations">
                  {formatSigma(selectedPoint.tpSigma)}σ
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    TP Price: <span className="font-mono">{formatPrice(selectedPoint.tpPrice)}</span>
                  </div>
                  {selectedPoint.tpPips != null && (
                    <div className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedPoint.tpPips.toFixed(1)} <span className="text-xs font-normal">{selectedPoint.pipUnit}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Probability Card */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">Target Probability</span>
                </div>
                <div className="font-mono text-xl font-bold" title="Probability of hitting TP before SL">
                  {formatPercent(selectedPoint.targetProb)}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    R/R Ratio: <span className="font-mono font-semibold">{(selectedPoint.tpSigma / selectedPoint.slSigma).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Entry Context */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
              <span>Entry Price: <span className="font-mono font-medium text-foreground">{formatPrice(data.entry_price)}</span></span>
              {symbol && <span>Symbol: <span className="font-medium text-foreground">{symbol}</span></span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
