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
import { FlaskConical, ChevronDown, ChevronRight, Play, AlertCircle, Clock, Settings2, BarChart3, Eye } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

interface PredictionPoint {
  horizon: number;
  value: number;
  [key: string]: unknown;
}

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

  // Extract predictions for chart (only when needed)
  const getPredictionsForChart = (): PredictionPoint[] => {
    if (!result?.data || typeof result.data !== "object") return [];
    const data = result.data as { predictions?: unknown };
    if (!Array.isArray(data.predictions)) return [];
    
    return data.predictions
      .filter((p): p is PredictionPoint => 
        typeof p === "object" && p !== null && 
        typeof (p as PredictionPoint).horizon === "number" && 
        typeof (p as PredictionPoint).value === "number"
      )
      .sort((a, b) => a.horizon - b.horizon);
  };

  const chartData = showChart ? getPredictionsForChart() : [];
  const hasValidChartData = chartData.length > 0;

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
                {/* Optional chart toggle */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showChart"
                    checked={showChart}
                    onCheckedChange={setShowChart}
                  />
                  <Label htmlFor="showChart" className="flex items-center gap-2 text-sm cursor-pointer">
                    <BarChart3 className="h-4 w-4" />
                    Show Forecast Chart
                  </Label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Optional Chart Section */}
              {showChart && (
                <div className="rounded-lg border bg-card p-4">
                  {hasValidChartData ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Predictions by Horizon</h4>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis 
                              dataKey="horizon" 
                              label={{ value: 'Horizon', position: 'insideBottomRight', offset: -5 }}
                              className="text-xs fill-muted-foreground"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                              label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                              className="text-xs fill-muted-foreground"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                              tickFormatter={(value) => value.toFixed(4)}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--foreground))'
                              }}
                              formatter={(value: number) => [value.toFixed(6), 'Predicted Value']}
                              labelFormatter={(label) => `Horizon: ${label}`}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No valid prediction data available for chart.</p>
                      <p className="text-sm mt-1">Ensure the response contains <code className="bg-muted px-1 rounded">data.predictions</code> with horizon and value fields.</p>
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
