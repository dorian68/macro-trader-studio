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
import { FlaskConical, ChevronDown, Play, AlertCircle, Clock, Settings2 } from "lucide-react";

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
      const response = await fetch("http://3.17.224.165:8000/forecast", {
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
              <CardTitle>Forecast Results</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Completed in {requestInfo.duration.toFixed(0)}ms at{" "}
                {new Date(requestInfo.timestamp).toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </ScrollArea>
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
