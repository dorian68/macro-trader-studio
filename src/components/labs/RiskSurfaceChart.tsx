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
  surface: {
    target_probs: number[];  // X-axis values (swapped)
    sl_sigma: number[];      // Y-axis values (swapped)
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
    const targetProb = point.x as number;  // X is now Target Probability
    const slSigma = point.y as number;     // Y is now Stop-Loss
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

    // Transpose tp_sigma matrix to swap axes: original is [target_prob_index][sl_sigma_index]
    // After swap: X = target_probs, Y = sl_sigma, so we need [sl_sigma_index][target_prob_index]
    const transposedZ = sl_sigma.map((_, slIdx) =>
      target_probs.map((_, tpIdx) => tp_sigma[tpIdx][slIdx])
    );

    const plotData: Data[] = [
      {
        type: "surface",
        x: target_probs,   // Swapped: Target Probability on X-axis
        y: sl_sigma,       // Swapped: Stop-Loss on Y-axis
        z: transposedZ,    // Transposed matrix to match new axes
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
          "<b>Target Prob:</b> %{x:.1%}<br>" +
          "<b>Stop-Loss:</b> %{y:.2f}σ<br>" +
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
          title: { text: "Target Probability", font: { size: 11 } },
          tickformat: ".0%",
          tickfont: { size: 9 },
          gridcolor: "rgba(255,255,255,0.1)",
        },
        yaxis: {
          title: { text: "Stop-Loss (σ)", font: { size: 11 } },
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
    <div className="space-y-4">
      {/* Header with Entry Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />
                Risk / Reward Probability Surface
              </CardTitle>
              <CardDescription>
                Interactive 3D visualization of SL/TP relationships
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono">
                Entry: {formatPrice(data.entry_price)}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                σ ref: {data.sigma_ref.toFixed(6)}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 3D Surface Chart */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="relative w-full" style={{ height: "450px" }}>
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
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
            <MousePointer className="h-3 w-3" />
            <span>Click on the surface to select a trade scenario</span>
          </div>
        </CardContent>
      </Card>

      {/* Selected Point Panel */}
      {selectedPoint && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-primary" />
              Selected Trade Scenario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Stop-Loss */}
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-rose-500" />
                  <span className="text-sm font-medium text-rose-600 dark:text-rose-400">Stop-Loss</span>
                </div>
                <div className="font-mono text-lg font-bold">
                  {formatSigma(selectedPoint.slSigma)}σ
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Price: {formatPrice(selectedPoint.slPrice)}
                </div>
                {/* NEW: Pips display */}
                {selectedPoint.slPips != null && (
                  <div className="text-sm font-mono font-semibold text-rose-600 dark:text-rose-400 mt-1">
                    {selectedPoint.slPips.toFixed(1)} {selectedPoint.pipUnit}
                  </div>
                )}
              </div>

              {/* Take-Profit */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Take-Profit</span>
                </div>
                <div className="font-mono text-lg font-bold">
                  {formatSigma(selectedPoint.tpSigma)}σ
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Price: {formatPrice(selectedPoint.tpPrice)}
                </div>
                {/* NEW: Pips display */}
                {selectedPoint.tpPips != null && (
                  <div className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    {selectedPoint.tpPips.toFixed(1)} {selectedPoint.pipUnit}
                  </div>
                )}
              </div>

              {/* Probability */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Implied Probability</span>
                </div>
                <div className="font-mono text-lg font-bold">
                  {formatPercent(selectedPoint.targetProb)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  R/R: {(selectedPoint.tpSigma / selectedPoint.slSigma).toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
