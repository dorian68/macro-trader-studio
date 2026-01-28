import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { StyledJsonViewer } from "@/components/ui/styled-json-viewer";
import {
  ArrowLeft,
  Brain,
  Globe,
  TrendingUp,
  Copy,
  ExternalLink,
  Loader2,
  BarChart3,
  Activity,
  ChevronDown,
  Target,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { enhancedPostRequest } from "@/lib/enhanced-request";
import { useRealtimeJobManager } from "@/hooks/useRealtimeJobManager";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { TechnicalDashboard } from "@/components/TechnicalDashboard";
import { useAIInteractionLogger } from "@/hooks/useAIInteractionLogger";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { SuperUserGuard } from "@/components/SuperUserGuard";
import { LabsComingSoon } from "@/components/labs/LabsComingSoon";
import { useForceLanguage } from "@/hooks/useForceLanguage";

const { useState, useEffect } = React;

// Use HTTPS Edge Function proxy to avoid Mixed Content / Failed to fetch in https preview
const FORECAST_PLAYGROUND_MACRO_WEBHOOK_URL = "https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/macro-lab-proxy";

interface AnalysisSection {
  title: string;
  content: string;
  type: "overview" | "technical" | "fundamental" | "outlook";
  expanded: boolean;
}

interface MacroAnalysis {
  query: string;
  timestamp: Date;
  sections: AnalysisSection[];
  sources: Array<{
    title: string;
    url: string;
    type: "news" | "data" | "research";
  }>;
}

interface TradingLevels {
  supports: string[];
  resistances: string[];
  indicators: { [key: string]: string };
  invalidation?: string;
}

interface AssetInfo {
  symbol: string;
  display: string;
  market: "FX" | "CRYPTO" | "COMMODITY";
  tradingViewSymbol: string;
}

export default function ForecastMacroLab() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { logInteraction } = useAIInteractionLogger();
  const { createJob } = useRealtimeJobManager();
  const { t } = useTranslation(["dashboard", "toasts", "common"]);

  // Forecast Playground is an internal tool: keep UI in English.
  useForceLanguage("en");

  const [isGenerating, setIsGenerating] = useState(false);
  const [analyses, setAnalyses] = useState<MacroAnalysis[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedAsset, setSelectedAsset] = useState<AssetInfo>({
    symbol: "EUR/USD",
    display: "EUR/USD",
    market: "FX",
    tradingViewSymbol: "EURUSD",
  });
  const [jobStatus, setJobStatus] = useState<string>("");
  const [timeframe, setTimeframe] = useState("1h");

  const [showHttpDebug, setShowHttpDebug] = useState(false);

   const [lastHttpDebug, setLastHttpDebug] = useState<
     | {
         at: string;
         url: string;
         jobId: string;
         ok: boolean;
         status: number;
         statusText: string;
         bodyText: string;
       }
     | {
         at: string;
         url: string;
         jobId: string | null;
         error: string;
       }
     | null
   >(null);

  // Check for pending results from persistent notifications
  useEffect(() => {
    const pendingResult = sessionStorage.getItem("pendingResult");
    if (pendingResult) {
      try {
        const result = JSON.parse(pendingResult);
        if (result.type.includes("macro") || result.type.includes("commentary")) {
          handleRealtimeResponse(result.resultData, result.jobId);
          sessionStorage.removeItem("pendingResult");
        }
      } catch (error) {
        console.error("Error parsing pending result:", error);
        sessionStorage.removeItem("pendingResult");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [queryParams, setQueryParams] = useState({
    query: "",
    assetType: "currency",
    analysisDepth: "detailed",
    period: "weekly",
    adresse: "",
  });

  // Handler functions for Realtime responses
  const handleRealtimeResponse = async (responsePayload: any, jobId: string) => {
    console.log("📩 [Realtime] Processing response payload:", responsePayload);

    let analysisContent = "";
    const extractStringContent = (obj: any): string => {
      if (typeof obj === "string") return obj;
      if (obj && typeof obj === "object") {
        if ((obj as any)._type === "MaxDepthReached" && (obj as any).value) {
          return String((obj as any).value);
        }
        if ((obj as any).content) {
          return extractStringContent((obj as any).content);
        }
        if ((obj as any).weekly_outlook && (obj as any).trade_idea) {
          let content = String((obj as any).weekly_outlook);
          if ((obj as any).trade_idea && typeof (obj as any).trade_idea === "object") {
            content += "\n\nTrade Idea:\n";
            Object.entries((obj as any).trade_idea).forEach(([key, value]) => {
              if (value && typeof value === "object" && (value as any)._type === "MaxDepthReached") {
                content += `${key}: ${(value as any).value}\n`;
              } else {
                content += `${key}: ${value}\n`;
              }
            });
          }
          return content;
        }
        return JSON.stringify(obj, null, 2);
      }
      return String(obj);
    };

    if (Array.isArray(responsePayload) && responsePayload.length > 0) {
      const deepContent = (responsePayload as any)[0]?.message?.message?.content?.content;
      analysisContent = extractStringContent(deepContent);
    } else if (responsePayload?.message?.content?.content) {
      analysisContent = extractStringContent(responsePayload.message.content.content);
    } else {
      analysisContent = extractStringContent(responsePayload);
    }

    const realAnalysis: MacroAnalysis = {
      query: queryParams.query,
      timestamp: new Date(),
      sections: [
        {
          title: t("dashboard:macro.analysisResults"),
          content: analysisContent,
          type: "overview",
          expanded: true,
        },
      ],
      sources: [
        {
          title: t("dashboard:macro.analysisRealtime"),
          url: "#",
          type: "research",
        },
      ],
    };

    setAnalyses((prev) => [realAnalysis, ...prev]);
    setJobStatus("done");
    setIsGenerating(false);

    toast({
      title: t("toasts:macro.analysisCompleted"),
      description: t("toasts:macro.analysisCompletedDescription"),
    });

    await logInteraction({
      featureName: "market_commentary",
      userQuery: `${queryParams.query} for ${selectedAsset.display}`,
      aiResponse: realAnalysis,
      jobId,
    });

    setQueryParams((prev) => ({ ...prev, query: "" }));
  };

  const handleRealtimeError = (errorMessage: string) => {
    console.log("❌ [Realtime] Error received:", errorMessage);
    setIsGenerating(false);
    setJobStatus("error");
    toast({
      title: t("toasts:macro.analysisError"),
      description: errorMessage || t("toasts:macro.analysisErrorDescription"),
      variant: "destructive",
    });
  };

  // All available assets from Supabase
  const assets: AssetInfo[] = [
    // Major FX Pairs
    { symbol: "EUR/USD", display: "EUR/USD", market: "FX", tradingViewSymbol: "EURUSD" },
    { symbol: "GBP/USD", display: "GBP/USD", market: "FX", tradingViewSymbol: "GBPUSD" },
    { symbol: "USD/JPY", display: "USD/JPY", market: "FX", tradingViewSymbol: "USDJPY" },
    { symbol: "AUDUSD=X", display: "AUD/USD", market: "FX", tradingViewSymbol: "AUDUSD" },
    { symbol: "NZDUSD=X", display: "NZD/USD", market: "FX", tradingViewSymbol: "NZDUSD" },
    { symbol: "USDCAD=X", display: "USD/CAD", market: "FX", tradingViewSymbol: "USDCAD" },
    { symbol: "USDCHF=X", display: "USD/CHF", market: "FX", tradingViewSymbol: "USDCHF" },
    // Cross Pairs
    { symbol: "EURGBP=X", display: "EUR/GBP", market: "FX", tradingViewSymbol: "EURGBP" },
    { symbol: "EURJPY=X", display: "EUR/JPY", market: "FX", tradingViewSymbol: "EURJPY" },
    { symbol: "GBPJPY=X", display: "GBP/JPY", market: "FX", tradingViewSymbol: "GBPJPY" },
    // Additional Currencies
    { symbol: "USD/SEK", display: "USD/SEK", market: "FX", tradingViewSymbol: "USDSEK" },
    { symbol: "USD/NOK", display: "USD/NOK", market: "FX", tradingViewSymbol: "USDNOK" },
    { symbol: "USD/DKK", display: "USD/DKK", market: "FX", tradingViewSymbol: "USDDKK" },
    { symbol: "USD/PLN", display: "USD/PLN", market: "FX", tradingViewSymbol: "USDPLN" },
    { symbol: "USD/HUF", display: "USD/HUF", market: "FX", tradingViewSymbol: "USDHUF" },
    { symbol: "USD/CZK", display: "USD/CZK", market: "FX", tradingViewSymbol: "USDCZK" },
    { symbol: "USD/TRY", display: "USD/TRY", market: "FX", tradingViewSymbol: "USDTRY" },
    { symbol: "USD/ZAR", display: "USD/ZAR", market: "FX", tradingViewSymbol: "USDZAR" },
    { symbol: "USD/MXN", display: "USD/MXN", market: "FX", tradingViewSymbol: "USDMXN" },
    { symbol: "USD/SGD", display: "USD/SGD", market: "FX", tradingViewSymbol: "USDSGD" },
    { symbol: "USD/HKD", display: "USD/HKD", market: "FX", tradingViewSymbol: "USDHKD" },
    { symbol: "USD/CNY", display: "USD/CNY", market: "FX", tradingViewSymbol: "USDCNH" },
    // Crypto
    { symbol: "BTC-USD", display: "Bitcoin", market: "CRYPTO", tradingViewSymbol: "BTCUSD" },
    { symbol: "ETH-USD", display: "Ethereum", market: "CRYPTO", tradingViewSymbol: "ETHUSD" },
    { symbol: "ADA-USD", display: "Cardano", market: "CRYPTO", tradingViewSymbol: "ADAUSD" },
    { symbol: "DOGE-USD", display: "Dogecoin", market: "CRYPTO", tradingViewSymbol: "DOGEUSD" },
    { symbol: "SOL-USD", display: "Solana", market: "CRYPTO", tradingViewSymbol: "SOLUSD" },
    { symbol: "DOT-USD", display: "Polkadot", market: "CRYPTO", tradingViewSymbol: "DOTUSD" },
    { symbol: "AVAX-USD", display: "Avalanche", market: "CRYPTO", tradingViewSymbol: "AVAXUSD" },
    { symbol: "LINK-USD", display: "Chainlink", market: "CRYPTO", tradingViewSymbol: "LINKUSD" },
    { symbol: "UNI-USD", display: "Uniswap", market: "CRYPTO", tradingViewSymbol: "UNIUSD" },
    { symbol: "LTC-USD", display: "Litecoin", market: "CRYPTO", tradingViewSymbol: "LTCUSD" },
    { symbol: "BCH-USD", display: "Bitcoin Cash", market: "CRYPTO", tradingViewSymbol: "BCHUSD" },
    { symbol: "XRP-USD", display: "XRP", market: "CRYPTO", tradingViewSymbol: "XRPUSD" },
    { symbol: "XLM-USD", display: "Stellar", market: "CRYPTO", tradingViewSymbol: "XLMUSD" },
    { symbol: "MATIC-USD", display: "Polygon", market: "CRYPTO", tradingViewSymbol: "MATICUSD" },
    { symbol: "ATOM-USD", display: "Cosmos", market: "CRYPTO", tradingViewSymbol: "ATOMUSD" },
    { symbol: "ALGO-USD", display: "Algorand", market: "CRYPTO", tradingViewSymbol: "ALGOUSD" },
    { symbol: "VET-USD", display: "VeChain", market: "CRYPTO", tradingViewSymbol: "VETUSD" },
    { symbol: "ICP-USD", display: "Internet Computer", market: "CRYPTO", tradingViewSymbol: "ICPUSD" },
    { symbol: "FIL-USD", display: "Filecoin", market: "CRYPTO", tradingViewSymbol: "FILUSD" },
    { symbol: "SAND-USD", display: "The Sandbox", market: "CRYPTO", tradingViewSymbol: "SANDUSD" },
    { symbol: "MANA-USD", display: "Decentraland", market: "CRYPTO", tradingViewSymbol: "MANAUSD" },
    { symbol: "APE-USD", display: "ApeCoin", market: "CRYPTO", tradingViewSymbol: "APEUSD" },
    // Commodities
    { symbol: "GOLD", display: "Gold", market: "COMMODITY", tradingViewSymbol: "XAUUSD" },
    { symbol: "SILVER", display: "Silver", market: "COMMODITY", tradingViewSymbol: "XAGUSD" },
    { symbol: "WTI", display: "Oil (WTI)", market: "COMMODITY", tradingViewSymbol: "USOIL" },
    { symbol: "BRENT", display: "Oil (Brent)", market: "COMMODITY", tradingViewSymbol: "UKOIL" },
    { symbol: "COPPER", display: "Copper", market: "COMMODITY", tradingViewSymbol: "COPPER" },
    { symbol: "PLATINUM", display: "Platinum", market: "COMMODITY", tradingViewSymbol: "XPTUSD" },
    { symbol: "PALLADIUM", display: "Palladium", market: "COMMODITY", tradingViewSymbol: "XPDUSD" },
    { symbol: "ALUMINUM", display: "Aluminum", market: "COMMODITY", tradingViewSymbol: "ALUMINUM" },
    { symbol: "ZINC", display: "Zinc", market: "COMMODITY", tradingViewSymbol: "ZINC" },
    { symbol: "NICKEL", display: "Nickel", market: "COMMODITY", tradingViewSymbol: "NICKEL" },
    { symbol: "NATGAS", display: "Natural Gas", market: "COMMODITY", tradingViewSymbol: "NGAS" },
    { symbol: "HEATING_OIL", display: "Heating Oil", market: "COMMODITY", tradingViewSymbol: "HEATING_OIL" },
    { symbol: "GASOLINE", display: "Gasoline", market: "COMMODITY", tradingViewSymbol: "GASOLINE" },
    { symbol: "WHEAT", display: "Wheat", market: "COMMODITY", tradingViewSymbol: "WHEAT" },
    { symbol: "CORN", display: "Corn", market: "COMMODITY", tradingViewSymbol: "CORN" },
    { symbol: "SOYBEANS", display: "Soybeans", market: "COMMODITY", tradingViewSymbol: "SOYBEAN" },
    { symbol: "RICE", display: "Rice", market: "COMMODITY", tradingViewSymbol: "RICE" },
    { symbol: "OATS", display: "Oats", market: "COMMODITY", tradingViewSymbol: "OATS" },
    { symbol: "SUGAR", display: "Sugar", market: "COMMODITY", tradingViewSymbol: "SUGAR" },
    { symbol: "COFFEE", display: "Coffee", market: "COMMODITY", tradingViewSymbol: "COFFEE" },
    { symbol: "COCOA", display: "Cocoa", market: "COMMODITY", tradingViewSymbol: "COCOA" },
    { symbol: "COTTON", display: "Cotton", market: "COMMODITY", tradingViewSymbol: "COTTON" },
    { symbol: "ORANGE_JUICE", display: "Orange Juice", market: "COMMODITY", tradingViewSymbol: "ORANGE_JUICE" },
    { symbol: "LUMBER", display: "Lumber", market: "COMMODITY", tradingViewSymbol: "LUMBER" },
    { symbol: "LIVE_CATTLE", display: "Live Cattle", market: "COMMODITY", tradingViewSymbol: "LIVE_CATTLE" },
    { symbol: "LEAN_HOGS", display: "Lean Hogs", market: "COMMODITY", tradingViewSymbol: "LEAN_HOGS" },
  ];

  const timeframes = [
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "15m", label: "15 Minutes" },
    { value: "30m", label: "30 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "4h", label: "4 Hours" },
    { value: "D", label: "1 Day" },
    { value: "W", label: "1 Week" },
    { value: "M", label: "1 Month" },
  ];

  const parseLevels = (text: string): TradingLevels => {
    const levels: TradingLevels = { supports: [], resistances: [], indicators: {} };

    const supportRegex = /(?:S\d+[:\s=]+|Support[s]?[:\s=]+)([0-9.,]+)/gi;
    let match;
    while ((match = supportRegex.exec(text)) !== null) {
      levels.supports.push(match[1]);
    }

    const resistanceRegex = /(?:R\d+[:\s=]+|Resistance[s]?[:\s=]+)([0-9.,]+)/gi;
    while ((match = resistanceRegex.exec(text)) !== null) {
      levels.resistances.push(match[1]);
    }

    const indicatorRegex = /(?:RSI|ATR|ADX|MACD|Stochastic)(?:\(\d+\))?[:\s=]+([0-9.,]+)/gi;
    while ((match = indicatorRegex.exec(text)) !== null) {
      const indicator = match[0].split(/[:\s=]/)[0].trim();
      levels.indicators[indicator] = match[1];
    }

    const invalidationRegex = /Invalidation[:\s]+(.*?)(?:\n|$)/i;
    const invalidationMatch = text.match(invalidationRegex);
    if (invalidationMatch) levels.invalidation = invalidationMatch[1].trim();
    return levels;
  };

  const getTradingViewUrl = (asset: AssetInfo) => {
    const exchange = asset.market === "FX" ? "FX" : "BINANCE";
    return `https://www.tradingview.com/symbols/${asset.tradingViewSymbol}/technicals/?exchange=${exchange}`;
  };

  const generateAnalysis = async () => {
    if (!queryParams.query.trim()) return;

    setIsGenerating(true);
    setJobStatus("running");
    setLastHttpDebug(null);

    try {
      const payload = {
        type: "RAG",
        question: queryParams.query,
        mode: "run",
        user_email: user?.email || null,
        filters: { region: "All", product: "All", category: "All" },
        analysis: { query: queryParams.query, timestamp: new Date().toISOString() },
        user_id: "default_user",
        instrument: selectedAsset.symbol,
        timeframe: "1H",
        assetType: queryParams.assetType,
        analysisDepth: queryParams.analysisDepth,
        period: queryParams.period,
        adresse: queryParams.adresse,
        isTradeQuery: false,
      };

      const responseJobId = await createJob("macro_analysis", selectedAsset.symbol, payload, "Macro Commentary");

      // Macro Lab is a superuser-only testing tool: do NOT require credits on this page.
      // (Credits remain enforced everywhere else.)

      const realtimeChannel = supabase
        .channel(`macro-analysis-${responseJobId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "jobs",
            filter: `user_id=eq.${user?.id}`,
          },
          (payload) => {
            const job = (payload as any).new as any;
            if (job && job.status && (job.id === responseJobId || job.request_payload?.job_id === responseJobId)) {
              if (job.status === "completed" && job.response_payload) {
                try {
                  let parsedPayload = job.response_payload;
                  if (typeof job.response_payload === "string") {
                    parsedPayload = JSON.parse(job.response_payload);
                  }
                  handleRealtimeResponse(parsedPayload, responseJobId);
                  supabase.removeChannel(realtimeChannel);
                } catch (parseError) {
                  console.error("❌ [Realtime] Error parsing response_payload:", parseError);
                  handleRealtimeError("Invalid response format received");
                  supabase.removeChannel(realtimeChannel);
                }
              } else if (job.status === "error") {
                handleRealtimeError(job.error_message || "Analysis failed");
                supabase.removeChannel(realtimeChannel);
              } else if (job.status === "completed" && !job.response_payload) {
                handleRealtimeError("No macro analysis available yet.");
                supabase.removeChannel(realtimeChannel);
              }
            }
          }
        )
        .subscribe();

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      console.log("📊 [ForecastPlaygroundMacroCommentary] Sending request:", {
        url: FORECAST_PLAYGROUND_MACRO_WEBHOOK_URL,
        jobId: responseJobId,
        hasJobId: !!responseJobId,
        payloadContainsJobId: !!(payload as any).job_id,
        userId: user?.id,
        sessionValid: !!currentSession,
        timestamp: new Date().toISOString(),
      });

      const { response } = await enhancedPostRequest(FORECAST_PLAYGROUND_MACRO_WEBHOOK_URL, payload, {
        enableJobTracking: true,
        jobType: "macro_analysis",
        instrument: selectedAsset.symbol,
        feature: "Macro Commentary",
        jobId: responseJobId,
      });

      let bodyText = "";
      try {
        // Best-effort: proxy might return empty body; realtime is still the source of truth.
        bodyText = await response.clone().text();
      } catch {
        bodyText = "";
      }

      setLastHttpDebug({
        at: new Date().toISOString(),
        url: FORECAST_PLAYGROUND_MACRO_WEBHOOK_URL,
        jobId: responseJobId,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        bodyText,
      });

      try {
        if (response.ok) {
          // intentionally ignore HTTP body; WebSocket is the source of truth
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (httpError) {
        console.log("❌ [HTTP] Request failed, continuing to wait for Realtime:", httpError);
        return;
      }
    } catch (error) {
      console.error("Analysis error:", error);

      setLastHttpDebug({
        at: new Date().toISOString(),
        url: FORECAST_PLAYGROUND_MACRO_WEBHOOK_URL,
        jobId: null,
        error: error instanceof Error ? error.message : String(error),
      });

      setIsGenerating(false);
      setJobStatus("error");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unable to complete analysis. Please retry.",
        variant: "destructive",
      });
    }
  };

  const toggleSection = (analysisIndex: number, sectionIndex: number) => {
    const sectionId = `${analysisIndex}-${sectionIndex}`;
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) newSet.delete(sectionId);
      else newSet.add(sectionId);
      return newSet;
    });
  };

  const quickQueries = [
    "EUR/USD macro analysis for this week",
    "NFP data impact on USD",
    "Bitcoin macro conditions outlook",
    "Global risk sentiment analysis",
    "Impact of inflation on major currencies",
    "Analysis of ECB vs Fed monetary policies",
    "Gold price drivers and outlook",
    "Crypto trends vs traditional markets",
    "Opportunities in commodities",
    "Central bank policy divergence effects",
    "Dollar strength analysis",
    "European economic outlook",
  ];

  return (
    <SuperUserGuard
      fallback={<LabsComingSoon title="Macro Commentary" description="This feature is currently in private beta." />}
    >
      <Layout activeModule="macro-analysis" onModuleChange={() => {}}>
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/forecast-playground")}
              className="shrink-0 min-h-[44px] w-11"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">{t("dashboard:macro.title")}</h1>
              <p className="text-sm sm:text-base text-muted-foreground break-words">{t("dashboard:macro.subtitle")}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-muted-foreground">HTTP debug</span>
              <Switch
                checked={showHttpDebug}
                onCheckedChange={setShowHttpDebug}
                aria-label="Toggle HTTP debug"
              />
            </div>
          </div>

          <Card className="gradient-card shadow-lg rounded-2xl border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">{t("dashboard:macro.analysisGenerator")}</h2>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Textarea
                    value={queryParams.query}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 500) {
                        setQueryParams((prev) => ({ ...prev, query: value }));
                      }
                    }}
                    placeholder={t("dashboard:macro.askQuestion")}
                    rows={3}
                    className="text-base resize-none pr-12 pb-8"
                    maxLength={500}
                  />
                  <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">{queryParams.query.length}/500</div>
                  <Button
                    onClick={generateAnalysis}
                    disabled={isGenerating || !queryParams.query.trim()}
                    size="sm"
                    className="absolute bottom-2 right-2"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="relative">
                  <Select
                    value={""}
                    onValueChange={(value) => setQueryParams((prev) => ({ ...prev, query: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="h-4 w-4" />
                        <span className="text-muted-foreground">{t("dashboard:macro.quickSuggestions")}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {quickQueries.map((query, index) => (
                        <SelectItem key={index} value={query}>
                          {query}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isGenerating && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {jobStatus === "queued" && t("dashboard:macro.analysisQueued")}
                    {jobStatus === "running" && t("dashboard:macro.analysisInProgress")}
                    {!jobStatus && t("dashboard:macro.generatingAnalysis")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {showHttpDebug && lastHttpDebug && (
            <Card className="rounded-2xl border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-semibold text-foreground">Debug — last HTTP response</CardTitle>
                  {"bodyText" in lastHttpDebug && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(lastHttpDebug.bodyText || "");
                          toast({ title: t("toasts:common.copied", { defaultValue: "Copied" }) });
                        } catch {
                          toast({
                            title: t("toasts:common.error", { defaultValue: "Error" }),
                            description: "Unable to copy content.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-muted-foreground space-y-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>at: {lastHttpDebug.at}</span>
                    <span>url: {lastHttpDebug.url}</span>
                    {lastHttpDebug.jobId ? <span>jobId: {lastHttpDebug.jobId}</span> : null}
                    {"status" in lastHttpDebug ? (
                      <span>
                        status: {lastHttpDebug.status} {lastHttpDebug.statusText}
                      </span>
                    ) : null}
                  </div>

                  {"error" in lastHttpDebug ? (
                    <div className="whitespace-pre-wrap rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-rose-400">
                      {lastHttpDebug.error}
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3">
                      <div className="font-mono text-xs">
                        {(() => {
                          try {
                            const parsed = JSON.parse(lastHttpDebug.bodyText || "{}");
                            return <StyledJsonViewer data={parsed} />;
                          } catch {
                            return (
                              <pre className="whitespace-pre-wrap text-muted-foreground">
                                {lastHttpDebug.bodyText?.trim() || "(empty body)"}
                              </pre>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {analyses.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                {t("dashboard:macro.analysisResults")}
              </h2>
              {analyses.map((analysis, index) => (
                <Card
                  key={index}
                  className="overflow-hidden animate-fade-in shadow-soft hover:shadow-medium transition-all"
                >
                  <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Activity className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-foreground mb-1">
                            {t("dashboard:macro.macroAnalysisFor")}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {t("dashboard:macro.analysisFor")} {analysis.query} • {analysis.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                        ✓ Complete
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {analysis.sections.map((section, sectionIndex) => {
                      const sectionKey = `${index}-${sectionIndex}`;
                      const isExpanded = section.expanded || expandedSections.has(sectionKey);
                      return (
                        <Collapsible
                          key={sectionIndex}
                          open={isExpanded}
                          onOpenChange={() => toggleSection(index, sectionIndex)}
                        >
                          <div className="border border-border rounded-lg overflow-hidden">
                            <CollapsibleTrigger className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors flex justify-between items-center group">
                              <div className="flex items-center gap-3">
                                {section.type === "overview" && <Brain className="h-4 w-4 text-primary" />}
                                {section.type === "technical" && <BarChart3 className="h-4 w-4 text-primary" />}
                                {section.type === "fundamental" && <TrendingUp className="h-4 w-4 text-primary" />}
                                {section.type === "outlook" && <Globe className="h-4 w-4 text-primary" />}
                                <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                                  {section.title}
                                </span>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 transition-transform text-muted-foreground group-hover:text-primary",
                                  isExpanded ? "rotate-180" : ""
                                )}
                              />
                            </CollapsibleTrigger>

                            <CollapsibleContent className="animate-accordion-down">
                              <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed bg-muted/20 p-4 rounded-lg border">
                                {section.content}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}

                    {analysis.sections.some(
                      (section) =>
                        typeof section.content === "string" &&
                        (section.content.includes("Support") || section.content.includes("Resistance"))
                    ) && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          Extracted Trading Levels
                        </h4>

                        {(() => {
                          const fullContent = analysis.sections
                            .map((s) => (typeof s.content === "string" ? s.content : ""))
                            .join("\n");
                          const levels = parseLevels(fullContent);
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              {levels.supports.length > 0 && (
                                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                                  <h5 className="font-medium text-success mb-2 flex items-center gap-1">
                                    <div className="w-2 h-2 bg-success rounded-full"></div>
                                    Support Levels
                                  </h5>
                                  <ul className="space-y-1">
                                    {levels.supports.slice(0, 3).map((level, i) => (
                                      <li key={i} className="text-muted-foreground">
                                        • {level}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {levels.resistances.length > 0 && (
                                <div className="p-3 bg-danger/10 rounded-lg border border-danger/20">
                                  <h5 className="font-medium text-danger mb-2 flex items-center gap-1">
                                    <div className="w-2 h-2 bg-danger rounded-full"></div>
                                    Resistance Levels
                                  </h5>
                                  <ul className="space-y-1">
                                    {levels.resistances.slice(0, 3).map((level, i) => (
                                      <li key={i} className="text-muted-foreground">
                                        • {level}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {Object.keys(levels.indicators).length > 0 && (
                                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                                  <h5 className="font-medium text-primary mb-2 flex items-center gap-1">
                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                    Key Indicators
                                  </h5>
                                  <ul className="space-y-1">
                                    {Object.entries(levels.indicators)
                                      .slice(0, 3)
                                      .map(([name, value], i) => (
                                        <li key={i} className="text-muted-foreground">
                                          • {name}: {value}
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div className="pt-4 border-t border-border flex gap-3 justify-between items-center">
                      <div className="text-xs text-muted-foreground">Response received in real-time</div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const fullContent = analysis.sections
                              .map((s) => `${s.title}\n${s.content}`)
                              .join("\n\n");
                            navigator.clipboard.writeText(fullContent);
                            toast({ title: "Copied!", description: "Analysis copied to clipboard" });
                          }}
                          className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(getTradingViewUrl(selectedAsset), "_blank")}
                          className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                          TradingView
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Market Analysis - {selectedAsset.display}
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedAsset.symbol}
                    onValueChange={(value) => {
                      const asset = assets.find((a) => a.symbol === value);
                      if (asset) setSelectedAsset(asset);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-card z-50">
                      <div className="p-2 font-semibold text-xs text-muted-foreground border-b">FX PAIRS</div>
                      {assets
                        .filter((a) => a.market === "FX")
                        .map((asset) => (
                          <SelectItem key={asset.symbol} value={asset.symbol}>
                            {asset.display}
                          </SelectItem>
                        ))}
                      <div className="p-2 font-semibold text-xs text-muted-foreground border-b border-t">CRYPTO</div>
                      {assets
                        .filter((a) => a.market === "CRYPTO")
                        .map((asset) => (
                          <SelectItem key={asset.symbol} value={asset.symbol}>
                            {asset.display}
                          </SelectItem>
                        ))}
                      <div className="p-2 font-semibold text-xs text-muted-foreground border-b border-t">COMMODITIES</div>
                      {assets
                        .filter((a) => a.market === "COMMODITY")
                        .map((asset) => (
                          <SelectItem key={asset.symbol} value={asset.symbol}>
                            {asset.display}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-32 bg-background/50 border-border-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeframes.map((tf) => (
                        <SelectItem key={tf.value} value={tf.value}>
                          {tf.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="chart" className="w-full">
                <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
                  <TabsTrigger value="chart" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Price Chart
                  </TabsTrigger>
                  <TabsTrigger value="technical" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Technical Analysis
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="chart" className="p-4 pt-2">
                  <TradingViewWidget
                    selectedSymbol={selectedAsset.tradingViewSymbol}
                    timeframe={timeframe}
                    onSymbolChange={(symbol) => {
                      const asset = assets.find((a) => a.symbol === symbol);
                      if (asset) setSelectedAsset(asset);
                    }}
                  />
                </TabsContent>
                <TabsContent value="technical" className="p-4 pt-2">
                  <TechnicalDashboard selectedAsset={selectedAsset} timeframe={timeframe} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </SuperUserGuard>
  );
}
