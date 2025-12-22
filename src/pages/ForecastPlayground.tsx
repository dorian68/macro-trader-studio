import { useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FlaskConical, ChevronDown, ChevronRight, Play, AlertCircle, Clock, Settings2, BarChart3, Eye, TrendingUp, TrendingDown, Database, Cpu, FileText } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const ALLOWED_ASSETS = [
  "AUD/USD",
  "EUR/USD",
  "BTC/USD",
  "ETH/USD",
  "XAU/USD",
  "XLM/USD",
];

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

interface HorizonForecast {
  direction: string;
  forecast_price_median?: number;
  forecast_price?: number;
  tp?: number;
  sl?: number;
  risk_reward?: number;
  confidence?: number;
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
  "hsl(38, 92%, 50%)",  // amber
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

// Professional Forecast Summary Table (Optional)
function ForecastSummaryTable({ horizons }: { horizons: Record<string, HorizonForecast> }) {
  const entries = Object.entries(horizons);
  
  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No horizon data available</p>
      </div>
    );
  }

  const formatPrice = (val?: number) => val != null ? val.toFixed(5) : "—";
  const formatPercent = (val?: number) => val != null ? `${(val * 100).toFixed(1)}%` : "—";
  const formatRatio = (val?: number) => val != null ? val.toFixed(2) : "—";

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Horizon</TableHead>
            <TableHead className="font-semibold">Direction</TableHead>
            <TableHead className="font-semibold text-right">Forecast Price</TableHead>
            <TableHead className="font-semibold text-right">TP</TableHead>
            <TableHead className="font-semibold text-right">SL</TableHead>
            <TableHead className="font-semibold text-right">R/R</TableHead>
            <TableHead className="font-semibold text-right">Confidence</TableHead>
            <TableHead className="font-semibold text-right">Prob TP/SL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([horizon, data]) => (
            <TableRow key={horizon}>
              <TableCell className="font-medium">{horizon}</TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={
                    data.direction?.toLowerCase() === "long" 
                      ? "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" 
                      : data.direction?.toLowerCase() === "short"
                        ? "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/30"
                        : ""
                  }
                >
                  {data.direction?.toLowerCase() === "long" && <TrendingUp className="h-3 w-3 mr-1" />}
                  {data.direction?.toLowerCase() === "short" && <TrendingDown className="h-3 w-3 mr-1" />}
                  {data.direction || "—"}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatPrice(data.forecast_price_median ?? data.forecast_price)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-emerald-600">
                {formatPrice(data.tp)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-rose-600">
                {formatPrice(data.sl)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatRatio(data.risk_reward)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatPercent(data.confidence)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatPercent(data.prob_tp_before_sl)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
  ].filter(item => item.value != null);

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
  ].filter(item => item.value != null);

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
  const [useMonteCarlo, setUseMonteCarlo] = useState(true);
  const [paths, setPaths] = useState(3000);
  const [includePredictions, setIncludePredictions] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [includeModelInfo, setIncludeModelInfo] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Request state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);

  // Optional enhancement toggles (disabled by default)
  const [showChart, setShowChart] = useState(false);
  const [showStyledJson, setShowStyledJson] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
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

    const requestBody: Record<string, unknown> = {
      symbol,
      timeframe,
      horizons: parsedHorizons,
      use_montecarlo: useMonteCarlo,
      include_predictions: includePredictions,
      include_metadata: includeMetadata,
      include_model_info: includeModelInfo,
    };

    if (useMonteCarlo) {
      requestBody.paths = paths;
    }

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
  };

  // FIXED: Extract predictions for chart with CORRECT format
  // Actual format: data.predictions = { "1h": [{ ds, yhat }], "3h": [...], ... }
  const getMultiHorizonChartData = () => {
    if (!result?.data || typeof result.data !== "object") return { series: [], allPoints: [] };
    
    const data = result.data as { predictions?: Record<string, PredictionDataPoint[]> };
    if (!data.predictions || typeof data.predictions !== "object" || Array.isArray(data.predictions)) {
      return { series: [], allPoints: [] };
    }

    const horizonEntries = Object.entries(data.predictions);
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

  const { series: chartSeries, allPoints: chartData } = showChart ? getMultiHorizonChartData() : { series: [], allPoints: [] };
  const hasValidChartData = chartSeries.length > 0 && chartData.length > 0;

  // Extract structured data for detailed view
  const getPayloadHorizons = (): Record<string, HorizonForecast> => {
    if (!result?.data || typeof result.data !== "object") return {};
    const data = result.data as { payload?: { horizons?: Record<string, HorizonForecast> } };
    return data.payload?.horizons || {};
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

  const payloadHorizons = showDetailedView ? getPayloadHorizons() : {};
  const metadata = showDetailedView ? getMetadata() : {};
  const modelStatus = showDetailedView ? getModelStatus() : {};
  const hasDetailedData = Object.keys(payloadHorizons).length > 0 || Object.keys(metadata).length > 0 || Object.keys(modelStatus).length > 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-8 w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Forecast Playground
              </h1>
            </div>
            <p className="text-muted-foreground">
              Configure and test the forecasting pipeline. Internal debugging tool.
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-amber-600 border-amber-600 bg-amber-50 dark:bg-amber-950/20">
            🔬 Internal Tool — Super Users Only
          </Badge>
        </div>

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Forecast Configuration
            </CardTitle>
            <CardDescription>
              Configure the forecast request parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Asset selector */}
              <div className="space-y-2">
                <Label htmlFor="asset">Asset</Label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger id="asset">
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

              {/* Timeframe selector */}
              <div className="space-y-2">
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger id="timeframe">
                    <SelectValue placeholder="Select timeframe" />
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

              {/* Horizons input */}
              <div className="space-y-2">
                <Label htmlFor="horizons">Horizons (comma-separated)</Label>
                <Input
                  id="horizons"
                  value={horizons}
                  onChange={(e) => setHorizons(e.target.value)}
                  placeholder="1, 3, 6"
                />
              </div>
            </div>

            {/* Monte Carlo toggle and paths */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="montecarlo"
                  checked={useMonteCarlo}
                  onCheckedChange={setUseMonteCarlo}
                />
                <Label htmlFor="montecarlo">Use Monte Carlo</Label>
              </div>

              {useMonteCarlo && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="paths" className="whitespace-nowrap">
                    Paths:
                  </Label>
                  <Input
                    id="paths"
                    type="number"
                    value={paths}
                    onChange={(e) => setPaths(parseInt(e.target.value, 10) || 0)}
                    className="w-28"
                    min={100}
                    max={10000}
                  />
                </div>
              )}
            </div>

            {/* Advanced options */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      advancedOpen ? "rotate-180" : ""
                    }`}
                  />
                  Advanced Options
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4 pl-4 border-l-2 border-border">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includePredictions"
                    checked={includePredictions}
                    onCheckedChange={setIncludePredictions}
                  />
                  <Label htmlFor="includePredictions">Include Predictions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeMetadata"
                    checked={includeMetadata}
                    onCheckedChange={setIncludeMetadata}
                  />
                  <Label htmlFor="includeMetadata">Include Metadata</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeModelInfo"
                    checked={includeModelInfo}
                    onCheckedChange={setIncludeModelInfo}
                  />
                  <Label htmlFor="includeModelInfo">Include Model Info</Label>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full sm:w-auto"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Running Forecast...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Forecast
                </>
              )}
            </Button>
          </CardContent>
        </Card>

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
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showChart"
                      checked={showChart}
                      onCheckedChange={setShowChart}
                    />
                    <Label htmlFor="showChart" className="flex items-center gap-2 text-sm cursor-pointer">
                      <BarChart3 className="h-4 w-4" />
                      Chart
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showDetailedView"
                      checked={showDetailedView}
                      onCheckedChange={setShowDetailedView}
                    />
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
                      <h4 className="text-sm font-medium text-muted-foreground">Predictions by Horizon (Time Series)</h4>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis 
                              dataKey="dsFormatted" 
                              className="text-xs fill-muted-foreground"
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                              interval="preserveStartEnd"
                            />
                            <YAxis 
                              className="text-xs fill-muted-foreground"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              tickFormatter={(value) => value.toFixed(4)}
                              domain={['auto', 'auto']}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--foreground))'
                              }}
                              formatter={(value: number, name: string) => [
                                value.toFixed(6), 
                                name.replace('yhat_', 'Horizon ')
                              ]}
                              labelFormatter={(label) => `Time: ${label}`}
                            />
                            <Legend 
                              formatter={(value) => value.replace('yhat_', '')}
                            />
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
                        Enable <code className="bg-muted px-1 rounded">Include Predictions</code> in Advanced Options and run the forecast again.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Optional Detailed View Section - Professional Tables */}
              {showDetailedView && (
                <div className="space-y-4">
                  {/* Forecast Summary Table */}
                  {Object.keys(payloadHorizons).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Trade Forecast Summary
                      </h4>
                      <ForecastSummaryTable horizons={payloadHorizons} />
                    </div>
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

              {/* Existing Tabs */}
              <Tabs defaultValue="predictions" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="predictions">Predictions</TabsTrigger>
                  <TabsTrigger value="request">Request Info</TabsTrigger>
                  <TabsTrigger value="raw">Raw Response</TabsTrigger>
                </TabsList>

                <TabsContent value="predictions" className="mt-4">
                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    {result.data && typeof result.data === "object" && "predictions" in (result.data as object) ? (
                      <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                        {JSON.stringify((result.data as { predictions: unknown }).predictions, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-muted-foreground">
                        <p>No predictions data found in response.</p>
                        <p className="text-sm mt-2">
                          Check the "Raw Response" tab for the full response structure.
                        </p>
                      </div>
                    )}
                  </ScrollArea>
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
                            <span className="text-muted-foreground">Timestamp:</span>{" "}
                            {requestInfo.timestamp}
                          </li>
                          <li>
                            <span className="text-muted-foreground">Duration:</span>{" "}
                            {requestInfo.duration.toFixed(2)}ms
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
                      <Switch
                        id="showStyledJson"
                        checked={showStyledJson}
                        onCheckedChange={setShowStyledJson}
                      />
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
