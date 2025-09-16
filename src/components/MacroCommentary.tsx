import { useState } from "react";
import ApplyToPortfolioButton from "./ApplyToPortfolioButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAIInteractionLogger } from "@/hooks/useAIInteractionLogger";
import { enhancedPostRequest, handleResponseWithFallback } from "@/lib/enhanced-request";
import { useRealtimeJobManager } from "@/hooks/useRealtimeJobManager";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Send, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Copy,
  Save,
  ExternalLink,
  Maximize,
  Minimize,
  FileText,
  BarChart3,
  MessageSquare,
  Brain,
  Target,
  Plus,
  Trash2,
  Calendar,
  PieChart,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface MacroCommentaryProps {
  instrument?: string;
  timeframe?: string;
  onClose?: () => void;
}

const sampleAssets = [
  "EUR/USD", "GBP/USD", "USD/JPY", "Gold", "Silver", "Crude Oil", "Bitcoin", "Ethereum"
];

const regions = ["All", "Europe", "Americas", "Asia", "Middle East", "Africa"];
const products = ["All", "Equities", "Bonds", "Futures", "Commodities", "Forex", "Crypto"];
const categories = ["All", "Economics", "Politics", "Technology", "Central Banks", "Geopolitics"];

// Impact mapping for cause → effect relationships
const impactMapping = {
  "Central Banks": {
    "interest_rate_hike": ["currency_strength", "bond_yields_up", "equity_pressure"],
    "interest_rate_cut": ["currency_weakness", "bond_yields_down", "equity_boost"],
    "qe_announcement": ["currency_weakness", "equity_boost", "bond_rally"]
  },
  "Economics": {
    "inflation_rise": ["currency_strength", "bond_yields_up", "commodity_boost"],
    "gdp_growth": ["currency_strength", "equity_boost", "commodity_demand"],
    "recession_risk": ["currency_weakness", "bond_rally", "equity_selloff"]
  },
  "Geopolitics": {
    "conflict_escalation": ["safe_haven_bid", "commodity_spike", "risk_off"],
    "trade_tensions": ["currency_volatility", "equity_sector_rotation", "commodity_impact"]
  }
};

type AnalysisMode = "custom_analysis" | "article_analysis" | "market_temperature";

interface Definition {
  term: string;
  definition: string;
}

interface PortfolioAsset {
  symbol: string;
  weight: number;
  quantity?: number;
}

interface PortfolioAnalysisResult {
  portfolio_pnl: Array<{ date: string; pnl: number; baseline: number }>;
  asset_contributions: Array<{
    symbol: string;
    impact_percent: number;
    worst_case: number;
    best_case: number;
  }>;
  sentiment_score: number;
  overall_summary: string;
}

interface WebhookResponse {
  content: string;
  sources?: Array<{
    title: string;
    url: string;
    date?: string;
    last_updated?: string;
  }>;
  summary?: string;
  region?: string;
  products?: string[];
  categories?: string[];
  impacts?: Array<{
    cause: string;
    effect: string;
  }>;
  sentiment?: {
    tone: string;
    score: number;
  };
  themes?: string[];
  definitions?: Definition[];
}

export function MacroCommentary({ instrument, timeframe, onClose }: MacroCommentaryProps = {}) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [commentary, setCommentary] = useState<WebhookResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTwoThirdsWidth, setIsTwoThirdsWidth] = useState(false);
  const [activeMode, setActiveMode] = useState<AnalysisMode>("custom_analysis");
  const [articleText, setArticleText] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [inputValidationMessage, setInputValidationMessage] = useState("");
  const [detectedInputType, setDetectedInputType] = useState<"url" | "text" | "question" | null>(null);
  
  // Portfolio Analysis states
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([
    { symbol: "AAPL", weight: 0.25 },
    { symbol: "TSLA", weight: 0.15 },
    { symbol: "MSFT", weight: 0.20 },
    { symbol: "GOOGL", weight: 0.40 }
  ]);
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [isPortfolioAnalysisLoading, setIsPortfolioAnalysisLoading] = useState(false);
  const [portfolioAnalysisResult, setPortfolioAnalysisResult] = useState<PortfolioAnalysisResult | null>(null);
  
  const { toast } = useToast();
  const { logInteraction } = useAIInteractionLogger();
  const { createJob } = useRealtimeJobManager();
  const isMobile = useIsMobile();

  // Input validation and detection for Article Analysis mode
  const detectInputType = (input: string): "url" | "text" | "question" | null => {
    if (!input.trim()) return null;
    
    // URL detection
    if (input.match(/^https?:\/\/[^\s]+/)) {
      return "url";
    }
    
    // Article text detection (more than 100 characters, contains paragraphs)
    if (input.length > 100 && (input.includes('\n') || input.split(' ').length > 50)) {
      return "text";
    }
    
    // Assume it's a question if it's shorter
    return "question";
  };

  const validateArticleInput = (input: string): boolean => {
    const trimmed = input.trim();
    if (!trimmed) {
      setInputValidationMessage("Please provide an article link, article text, or a market question.");
      setDetectedInputType(null);
      return false;
    }
    
    const type = detectInputType(trimmed);
    setDetectedInputType(type);
    setInputValidationMessage("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputText = activeMode === "article_analysis" ? articleText.trim() : query.trim();
    
    // Special validation for Article Analysis mode
    if (activeMode === "article_analysis") {
      if (!validateArticleInput(inputText)) {
        return;
      }
    } else if (!inputText) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      let payload;
      
      if (activeMode === "article_analysis") {
        // Send EXACTLY the specified JSON structure for Article Analysis - NOTHING ELSE
        payload = {
          type: "article_analysis",
          query: inputText,
          user_id: "12345"
        };
      } else {
        // Keep existing structure for other modes
        payload = {
          type: "RAG",
          question: inputText,
          mode: activeMode,
          filters: {
            region: selectedRegion,
            product: selectedProduct,
            category: selectedCategory
          },
          analysis: {
            query: inputText,
            timestamp: new Date().toISOString(),
            impact_mapping: activeMode !== "custom_analysis" ? impactMapping : undefined
          },
          user_id: "default_user"
        };
      }

      const { response, jobId } = await enhancedPostRequest('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', payload, {
        enableJobTracking: true,
        jobType: 'macro_commentary',
        instrument: instrument || 'markets'
      });

      const rawData = await handleResponseWithFallback(response, jobId);
      console.log('Parsed JSON:', rawData);
      
      let data: WebhookResponse;
      
      if (activeMode === "article_analysis") {
        // Handle new Article Analysis response format
        let analysisContent;
        
        if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].message?.content) {
          // Format: [{ message: { content: "..." } }]
          analysisContent = JSON.parse(rawData[0].message.content);
        } else if (rawData.content && typeof rawData.content === 'string') {
          // Format: { content: "..." }
          analysisContent = JSON.parse(rawData.content);
        } else {
          console.log('Unexpected Article Analysis response structure:', rawData);
          throw new Error('Invalid Article Analysis response structure');
        }
        
        console.log('Article analysis content:', analysisContent);
          
          // Transform the analysis data to our WebhookResponse format
          data = {
            content: analysisContent.summary?.join('\n\n') || 'Analysis completed',
            summary: analysisContent.summary?.join('\n\n'),
            region: Array.isArray(analysisContent.region) ? analysisContent.region.join(', ') : analysisContent.region,
            products: analysisContent.products || [],
            categories: analysisContent.categories || [],
            impacts: analysisContent.impacts?.map((impact: any) => ({
              ...impact,
              // Convert 0-1 values to percentages for display
              confidence: impact.confidence ? Math.round(impact.confidence * 100) : impact.confidence,
              intensity_score: impact.intensity_score ? Math.round(impact.intensity_score * 100) : impact.intensity_score
            })) || [],
            sentiment: analysisContent.sentiment ? {
              ...analysisContent.sentiment,
              // Keep 0-1 score as is since it's already handled in display
              score: analysisContent.sentiment.score
            } : analysisContent.sentiment,
            themes: analysisContent.themes || [],
            definitions: analysisContent.definitions || [],
            sources: [{
              title: analysisContent.source || 'Article Analysis',
              url: inputText.startsWith('http') ? inputText : '#',
              date: analysisContent.analysis_timestamp
            }]
          };
      } else {
        // Keep existing logic for other modes
        if (!rawData.content || !rawData.content.content) {
          console.log('Response data structure:', rawData);
          throw new Error('Invalid response structure - missing content');
        }
        
        const content = rawData.content.content;
        const sources = rawData.citations?.map((url: string) => ({
          title: url.split('/').pop() || url,
          url: url
        }));

        data = {
          content,
          sources
        };
      }
      
      setCommentary(data);
      
      // Log the interaction to history
      await logInteraction({
        featureName: 'market_commentary',
        userQuery: query || `${activeMode === "article_analysis" ? "Article Analysis" : "Macro Commentary"} for ${instrument || "markets"}`,
        aiResponse: data
      });
      
      toast({
        title: "Analysis Generated",
        description: "Successfully generated macro commentary",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate commentary';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuery = (asset: string) => {
    setQuery(`Give me a macro view on ${asset} this week`);
  };

  const generateMarketTemperature = () => {
    const scope = selectedRegion !== "All" ? selectedRegion : "Global";
    const productScope = selectedProduct !== "All" ? selectedProduct : "All Markets";
    const categoryScope = selectedCategory !== "All" ? selectedCategory : "All Categories";
    
    setQuery(`Generate a market temperature briefing for ${scope} ${productScope} focusing on ${categoryScope}. Include sentiment gauge and session outlook.`);
  };

  const getImpactPredictions = (text: string, category: string) => {
    const categoryMappings = impactMapping[category as keyof typeof impactMapping];
    if (!categoryMappings) return [];
    
    // Simple keyword matching for demo - in production this would be more sophisticated
    const impacts = [];
    if (text.toLowerCase().includes("rate") || text.toLowerCase().includes("fed")) {
      impacts.push(...(categoryMappings["interest_rate_hike"] || []));
    }
    if (text.toLowerCase().includes("inflation")) {
      impacts.push(...(categoryMappings["inflation_rise"] || []));
    }
    return [...new Set(impacts)]; // Remove duplicates
  };

  // Portfolio management functions
  const addPortfolioAsset = () => {
    setPortfolio([...portfolio, { symbol: "", weight: 0 }]);
  };

  const removePortfolioAsset = (index: number) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
  };

  const updatePortfolioAsset = (index: number, field: keyof PortfolioAsset, value: string | number) => {
    const updated = [...portfolio];
    updated[index] = { ...updated[index], [field]: value };
    setPortfolio(updated);
  };

  const normalizePortfolioWeights = () => {
    const totalWeight = portfolio.reduce((sum, asset) => sum + asset.weight, 0);
    if (totalWeight > 0) {
      const normalized = portfolio.map(asset => ({
        ...asset,
        weight: Number((asset.weight / totalWeight).toFixed(4))
      }));
      setPortfolio(normalized);
    }
  };

  const runPortfolioAnalysis = async () => {
    if (!commentary) return;
    
    // Validate portfolio
    const validAssets = portfolio.filter(asset => asset.symbol.trim() && asset.weight > 0);
    if (validAssets.length === 0) {
      toast({
        title: "Invalid Portfolio",
        description: "Please add at least one asset with a valid symbol and weight.",
        variant: "destructive",
      });
      return;
    }

    setIsPortfolioAnalysisLoading(true);
    
    try {
      const payload = {
        type: "portfolio_scenario_analysis",
        scenario: {
          source: "macro_commentary",
          description: commentary.content.substring(0, 200) + "..."
        },
        portfolio: validAssets.map(asset => ({
          symbol: asset.symbol.toUpperCase(),
          weight: asset.weight
        })),
        backtest_range: {
          start: startDate,
          end: endDate
        },
        user_id: "12345"
      };

      const { response, jobId } = await enhancedPostRequest('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', payload, {
        enableJobTracking: true,
        jobType: 'portfolio_analysis',
        instrument: 'portfolio'
      });

      const result = await handleResponseWithFallback(response, jobId);
      setPortfolioAnalysisResult(result);
      
      toast({
        title: "Portfolio Analysis Complete",
        description: "Successfully analyzed portfolio impact for the scenario.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze portfolio';
      toast({
        title: "Analysis Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPortfolioAnalysisLoading(false);
    }
  };

  const handleGeneratePDFReport = async () => {
    if (!commentary) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-macro-report', {
        body: {
          content: commentary.content,
          summary: commentary.summary,
          sources: commentary.sources,
          timestamp: new Date().toISOString(),
          analysisType: activeMode === "article_analysis" ? "Article Analysis" : "Macro Commentary",
          metadata: {
            region: commentary.region,
            products: commentary.products,
            categories: commentary.categories,
            sentiment: commentary.sentiment,
            themes: commentary.themes
          }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "PDF Report Generated",
        description: "Your macro analysis report has been generated and sent via email.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate PDF report';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Component to render text with tooltips for defined terms
  const TextWithDefinitions = ({ text, definitions }: { text: string; definitions?: Definition[] }) => {
    if (!definitions || definitions.length === 0) {
      return <span>{text}</span>;
    }

    // Find terms in the text and create an array of text segments with their types
    const segments: { text: string; isDefinedTerm: boolean; definition?: string }[] = [];
    let remainingText = text;
    
    // Sort definitions by term length (longest first) to avoid substring issues
    const sortedDefinitions = [...definitions].sort((a, b) => b.term.length - a.term.length);
    
    // Track which positions are already processed to avoid overlapping matches
    const processedPositions: boolean[] = new Array(text.length).fill(false);
    
    for (const def of sortedDefinitions) {
      const regex = new RegExp(`\\b${def.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        
        // Check if this position is already processed
        const alreadyProcessed = processedPositions.slice(start, end).some(Boolean);
        if (alreadyProcessed) continue;
        
        // Mark these positions as processed
        for (let i = start; i < end; i++) {
          processedPositions[i] = true;
        }
        
        segments.push({
          text: match[0],
          isDefinedTerm: true,
          definition: def.definition,
          index: start
        } as any);
      }
    }
    
    if (segments.length === 0) {
      return <span>{text}</span>;
    }
    
    // Sort segments by position and fill in non-defined text
    const sortedSegments = segments.sort((a: any, b: any) => a.index - b.index);
    const finalSegments: { text: string; isDefinedTerm: boolean; definition?: string }[] = [];
    
    let currentIndex = 0;
    for (const segment of sortedSegments) {
      const segmentStart = (segment as any).index;
      
      // Add text before this segment if exists
      if (currentIndex < segmentStart) {
        finalSegments.push({
          text: text.slice(currentIndex, segmentStart),
          isDefinedTerm: false
        });
      }
      
      finalSegments.push(segment);
      currentIndex = segmentStart + segment.text.length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      finalSegments.push({
        text: text.slice(currentIndex),
        isDefinedTerm: false
      });
    }
    
    return (
      <TooltipProvider delayDuration={300}>
        <span>
          {finalSegments.map((segment, index) => {
            if (segment.isDefinedTerm && segment.definition) {
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <span className="border-b border-dotted border-primary/60 cursor-help hover:border-primary transition-colors">
                      {segment.text}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="max-w-xs p-3 text-sm leading-relaxed bg-popover border shadow-lg"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-primary">{segment.text}</div>
                      <div className="text-popover-foreground">{segment.definition}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }
            return <span key={index}>{segment.text}</span>;
          })}
        </span>
      </TooltipProvider>
    );
  };

  return (
    <div className={cn(
      "bg-card/95 backdrop-blur-xl rounded-xl border border-border/50 shadow-2xl transition-all duration-300 flex flex-col",
      // Mobile: Full screen minus safe areas
      isMobile ? "fixed inset-2 z-[10001] h-[calc(100vh-1rem)]" : "h-full max-h-[calc(100vh-8rem)]",
      // Desktop sizing
      !isMobile && isFullscreen && "fixed inset-4 z-[10001] max-h-[calc(100vh-2rem)]",
      !isMobile && isTwoThirdsWidth && !isFullscreen && "w-2/3"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Macro Analysis</h3>
            <p className="text-xs text-muted-foreground">AI market insights</p>
          </div>
        </div>
         <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/macro-analysis'}
            className="h-6 min-w-fit px-2 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs"
            title="Access complete macro analysis with advanced charting and detailed insights"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            <span>Full page</span>
          </Button>
          {/* Hide desktop-only controls on mobile */}
          {!isMobile && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTwoThirdsWidth(!isTwoThirdsWidth)}
                className="h-6 w-6 p-0 hover:bg-primary/10"
                title={isTwoThirdsWidth ? "Expand to full width" : "Resize to 2/3 width"}
              >
                {isTwoThirdsWidth ? <Maximize className="h-3 w-3" /> : <Minimize className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-6 w-6 p-0 hover:bg-primary/10"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
              </Button>
            </>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-destructive/10"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">
            <div className="w-1.5 h-1.5 bg-success rounded-full mr-1"></div>
            Live
          </Badge>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Enhanced Analysis Interface */}
      <Card className="gradient-card border-border-light shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Advanced Analysis Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as AnalysisMode)}>
            <TabsList className={cn(
              "grid w-full",
              isMobile ? "grid-cols-1 gap-1 h-auto" : "grid-cols-3"
            )}>
              <TabsTrigger 
                value="custom_analysis" 
                className={cn(
                  "flex items-center gap-2 text-xs sm:text-sm",
                  isMobile && "justify-start py-2 px-3"
                )}
              >
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                Custom Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="article_analysis" 
                className={cn(
                  "flex items-center gap-2 text-xs sm:text-sm",
                  isMobile && "justify-start py-2 px-3"
                )}
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                Article Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="market_temperature" 
                className={cn(
                  "flex items-center gap-2 text-xs sm:text-sm",
                  isMobile && "justify-start py-2 px-3"
                )}
              >
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                Market Temperature
              </TabsTrigger>
            </TabsList>

            <TabsContent value="custom_analysis" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., EUR/USD macro analysis for this week, Global risk sentiment analysis"
                  className="bg-background/50 border-border-light"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !query.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Generate Analysis
                </Button>
              </form>
              
              {/* Quick Queries */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Quick queries:</p>
                <div className={cn(
                  "flex gap-2",
                  isMobile ? "flex-col" : "flex-wrap"
                )}>
                  {sampleAssets.map((asset) => (
                    <Button
                      key={asset}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickQuery(asset)}
                      className={cn(
                        "text-xs touch-friendly",
                        isMobile && "w-full justify-start"
                      )}
                    >
                      {asset}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="article_analysis" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  value={articleText}
                  onChange={(e) => {
                    setArticleText(e.target.value);
                    if (e.target.value.trim()) {
                      validateArticleInput(e.target.value);
                    } else {
                      setInputValidationMessage("");
                      setDetectedInputType(null);
                    }
                  }}
                  placeholder="Paste article URL, article text, or type a market question..."
                  className={cn(
                    "bg-background/50 border-border-light text-sm",
                    isMobile ? "min-h-[100px]" : "min-h-[120px]"
                  )}
                />
                
                {/* Input Detection Display */}
                {detectedInputType && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {detectedInputType === "url" && <ExternalLink className="h-3 w-3" />}
                      {detectedInputType === "text" && <FileText className="h-3 w-3" />}
                      {detectedInputType === "question" && <MessageSquare className="h-3 w-3" />}
                      <span>
                        Detected: {detectedInputType === "url" ? "Article URL" : 
                                  detectedInputType === "text" ? "Article Text" : 
                                  "Market Question"}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Validation Message */}
                {inputValidationMessage && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{inputValidationMessage}</span>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  disabled={isLoading || !articleText.trim() || !!inputValidationMessage}
                  className="w-full touch-friendly"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Analyze Article
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="market_temperature" className="space-y-4">
              <div className={cn(
                "grid gap-4",
                isMobile ? "grid-cols-1" : "grid-cols-3"
              )}>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product} value={product}>{product}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => {
                  generateMarketTemperature();
                  handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                }}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Generate Market Briefing
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* TradingView Widget Section */}
      <Card className="gradient-card border-border-light shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Market Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TradingViewWidget 
            selectedSymbol="EURUSD" 
            onSymbolChange={() => {}}
            className="border-0 shadow-none"
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-danger/20 bg-danger/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium">Error generating commentary</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Commentary Display with Sidebar for Article Analysis */}
      {commentary && (
        <div className={cn(
          "space-y-4",
          activeMode === "article_analysis" && !isMobile && "grid grid-cols-1 lg:grid-cols-3 gap-4"
        )}>
          {/* Main Content Area */}
          <div className={cn(
            "space-y-4",
            activeMode === "article_analysis" && !isMobile && "lg:col-span-2"
          )}>
            <Card className="gradient-card border-border-light shadow-medium">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {activeMode === "article_analysis" ? "Article Analysis" : "Macro Commentary"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <ApplyToPortfolioButton 
                    analysisContent={commentary.content}
                    analysisType="macro"
                    className="bg-primary text-primary-foreground"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleGeneratePDFReport}
                    disabled={isLoading}
                  >
                    <FileText className="h-4 w-4" />
                    PDF Report
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(commentary.content)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}>
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Main Content */}
                <div className="space-y-6 max-h-96 overflow-y-auto">
                  {(commentary.summary || commentary.content).split('\n\n').map((section, index) => {
                    // Check if this is a title/heading
                    if (section.includes('Weekly Outlook') || section.includes('Executive Summary') || 
                        section.includes('Fundamental Analysis') || section.includes('Directional Bias') ||
                      section.includes('Key Levels') || section.includes('AI Insights Breakdown') ||
                      section.includes('Toggle GPT') || section.includes('Toggle Curated')) {
                    return (
                      <div key={index} className="space-y-3">
                        {section.split('\n').map((line, lineIndex) => {
                          if (lineIndex === 0 && (line.includes('Weekly Outlook') || 
                              line.includes('Executive Summary') || 
                              line.includes('Fundamental Analysis') ||
                              line.includes('Directional Bias') ||
                              line.includes('Key Levels') ||
                              line.includes('AI Insights Breakdown') ||
                              line.includes('Toggle GPT') ||
                              line.includes('Toggle Curated'))) {
                            return (
                              <h3 key={lineIndex} className="text-lg font-bold text-primary border-b border-border pb-2">
                                {line}
                              </h3>
                            );
                          }
                          
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return (
                              <p key={lineIndex} className="font-semibold text-foreground text-base leading-relaxed">
                                <TextWithDefinitions 
                                  text={line.replace(/\*\*/g, '')} 
                                  definitions={commentary.definitions}
                                />
                              </p>
                            );
                          }
                          
                          if (line.startsWith('- **')) {
                            const boldText = line.match(/\*\*(.*?)\*\*/)?.[1] || '';
                            const remainingText = line.replace(/- \*\*(.*?)\*\*:?/, '').trim();
                            return (
                              <div key={lineIndex} className="flex gap-3 text-sm leading-relaxed">
                                <span className="text-primary mt-1">•</span>
                                <div>
                                  <span className="font-semibold text-foreground">
                                    <TextWithDefinitions text={boldText} definitions={commentary.definitions} />
                                  </span>
                                  {remainingText && (
                                    <span className="text-muted-foreground">
                                      : <TextWithDefinitions text={remainingText} definitions={commentary.definitions} />
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          if (line.startsWith('Support') || line.startsWith('Resistance')) {
                            return (
                              <h4 key={lineIndex} className="font-semibold text-foreground text-sm mt-3 mb-1">
                                {line}
                              </h4>
                            );
                          }
                          
                          if (line.startsWith('- **$') || line.startsWith('- **€') || line.startsWith('- **£')) {
                            const levelText = line.replace(/- \*\*(.*?)\*\*/, '$1');
                            const description = line.includes('(') ? line.match(/\((.*?)\)/)?.[1] : '';
                            return (
                              <div key={lineIndex} className="flex items-center gap-2 text-sm ml-4">
                                <span className="w-2 h-2 bg-primary rounded-full"></span>
                                <span className="font-mono font-semibold text-primary">{levelText.split('**')[0]}</span>
                                {description && <span className="text-muted-foreground">({description})</span>}
                              </div>
                            );
                          }
                          
                          if (line.includes('Bullish') || line.includes('Bearish') || line.includes('Neutral')) {
                            return (
                              <div key={lineIndex} className="flex items-center gap-2 text-sm">
                                <Badge variant={line.includes('Bullish') ? 'default' : line.includes('Bearish') ? 'destructive' : 'secondary'} className="text-xs">
                                  {line.trim()}
                                </Badge>
                              </div>
                            );
                          }
                          
                          if (line.includes('Confidence:')) {
                            return (
                              <div key={lineIndex} className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Confidence:</span>
                                <span className="font-semibold text-primary">{line.replace('Confidence:', '').trim()}</span>
                              </div>
                            );
                          }
                          
                          return (
                            <p key={lineIndex} className="text-sm text-muted-foreground leading-relaxed">
                              <TextWithDefinitions 
                                text={line.replace(/\[(\d+)\]/g, (match, num) => `[${num}]`)} 
                                definitions={commentary.definitions}
                              />
                            </p>
                          );
                        })}
                      </div>
                    );
                  }
                  
                  return (
                    <p key={index} className="text-sm text-muted-foreground leading-relaxed">
                      <TextWithDefinitions 
                        text={section.replace(/\[(\d+)\]/g, (match, num) => `[${num}]`)} 
                        definitions={commentary.definitions}
                      />
                    </p>
                  );
                 })}
               </div>

              {/* Sources */}
              {commentary.sources && commentary.sources.length > 0 && (
                <>
                  <Separator className="bg-border-light" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-primary" />
                      Sources
                    </h4>
                    <div className="space-y-2">
                      {commentary.sources.map((source, index) => (
                        <a
                          key={index}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Article Analysis Sidebar - Only on desktop */}
        {activeMode === "article_analysis" && !isMobile && (
          <div className="lg:col-span-1 space-y-4">
            <Card className="gradient-card border-border-light shadow-medium sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4 text-primary" />
                  Analysis Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Detected Regions */}
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Detected Regions
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {commentary.region ? (
                      <Badge variant="outline" className="text-xs">
                        {commentary.region}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Global</span>
                    )}
                  </div>
                </div>

                {/* Detected Products */}
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Detected Products
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {commentary.products && commentary.products.length > 0 ? (
                      commentary.products.map((product, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {product}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Mixed Assets</span>
                    )}
                  </div>
                </div>

                {/* Detected Categories */}
                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Detected Categories
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {commentary.categories && commentary.categories.length > 0 ? (
                      commentary.categories.map((category, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">General Market</span>
                    )}
                  </div>
                </div>

                {/* Sentiment Gauge */}
                {commentary.sentiment && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Sentiment Gauge
                    </h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{commentary.sentiment.tone}</span>
                        <span className="text-xs text-muted-foreground">
                          {(commentary.sentiment.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${commentary.sentiment.score * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Cause → Effect List */}
                {commentary.impacts && commentary.impacts.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Cause → Effect
                    </h5>
                    <div className="space-y-2">
                      {commentary.impacts.map((impact, index) => (
                        <div key={index} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{impact.cause}</span>
                            <span className="text-primary">→</span>
                            <span className="font-medium">{impact.effect}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Themes */}
                {commentary.themes && commentary.themes.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Key Themes
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {commentary.themes.map((theme, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      )}
      </div>
    </div>
  );
}