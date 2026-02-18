import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Calendar, MessageSquare, TrendingUp, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { getFeatureDisplayName, normalizeFeatureName } from '@/lib/feature-mapper';
import { TradeSetupDisplay } from '@/components/TradeSetupDisplay';
import { MacroCommentaryDisplay } from '@/components/MacroCommentaryDisplay';

interface AIInteraction {
  id: string;
  feature_name: string;
  user_query: string;
  ai_response: any;
  created_at: string;
  user_id: string;
  job_id: string;
  status: string;
  request_payload: any;
  response_payload: any;
}

const FEATURES = [
  { value: 'all', label: 'All Features' },
  { value: 'ai_trade_setup', label: 'AI Trade Setup' },
  { value: 'macro_commentary', label: 'Macro Commentary' },
  { value: 'report', label: 'Reports' }
];

const FEATURE_ICONS = {
  ai_trade_setup: TrendingUp,
  trade_setup: TrendingUp,
  macro_commentary: MessageSquare,
  market_commentary: MessageSquare,
  report: FileText
};

const FEATURE_COLORS = {
  ai_trade_setup: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  trade_setup: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  macro_commentary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  market_commentary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  report: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
};

const ITEMS_PER_PAGE_OPTIONS = [
  { value: '10', label: '10 items' },
  { value: '20', label: '20 items' },
  { value: '50', label: '50 items' },
  { value: '100', label: '100 items' }
];

// Regex for common financial instruments
const INSTRUMENT_REGEX = /\b(EUR\/USD|GBP\/USD|USD\/JPY|USD\/CHF|AUD\/USD|NZD\/USD|USD\/CAD|EUR\/GBP|EUR\/JPY|GBP\/JPY|AUD\/JPY|EUR\/CHF|GBP\/CHF|EUR\/AUD|EUR\/NZD|GBP\/AUD|GBP\/NZD|AUD\/NZD|CAD\/JPY|CHF\/JPY|NZD\/JPY|AUD\/CAD|AUD\/CHF|NZD\/CAD|NZD\/CHF|EUR\/CAD|GBP\/CAD|XAUUSD|XAGUSD|XAU\/USD|XAG\/USD|US500|US30|NAS100|SPX|NDX|DJI|FTSE|DAX|CAC40|NIKKEI|BTC\/USD|ETH\/USD|BTCUSD|ETHUSD|WTI|BRENT|USOIL)\b/i;

/**
 * Deep-extract the actual content from deeply nested response payloads.
 */
function deepExtractContent(payload: any): any {
  if (!payload) return null;

  // --- Macro Lab path: message.content.content.message.content.content ---
  try {
    const level1 = payload?.message?.content?.content;
    if (level1 && typeof level1 === 'object') {
      const level2 = level1?.message?.content?.content;
      if (level2 && typeof level2 === 'string') {
        return level2;
      }
    }
  } catch {}

  // --- Trade Generator path: body.message.message.content.content.trade_setup ---
  try {
    const tradeContent = payload?.body?.message?.message?.content?.content;
    if (tradeContent?.trade_setup && Array.isArray(tradeContent.trade_setup)) {
      const firstSetup = tradeContent.trade_setup[0];
      if (typeof firstSetup === 'string') {
        const parsed = JSON.parse(firstSetup);
        return { _type: 'trade_setup_parsed', ...parsed };
      }
      return { _type: 'trade_setup_parsed', ...firstSetup };
    }
  } catch {}

  // --- Legacy/RAG structured response ---
  try {
    const structured = payload?.message?.content?.content;
    if (structured && typeof structured === 'object' && !structured.message) {
      return structured;
    }
  } catch {}

  // --- Direct content paths ---
  if (payload?.content?.setups && Array.isArray(payload.content.setups)) {
    return payload.content;
  }
  if (payload?.content) return payload.content;
  if (payload?.response) return payload.response;
  if (payload?.analysis) return payload.analysis;
  if (payload?.result) return payload.result;

  return payload;
}

/**
 * Extract user query from request payload with deep path support
 */
function deepExtractUserQuery(requestPayload: any, responsePayload: any): string {
  if (!requestPayload) return 'Unavailable';

  if (requestPayload.macroInsight?.message?.content) {
    return requestPayload.macroInsight.message.content;
  }

  if (requestPayload.question) return requestPayload.question;
  if (requestPayload.query) return requestPayload.query;
  if (requestPayload.user_query) return requestPayload.user_query;
  if (requestPayload.message) return requestPayload.message;
  if (requestPayload.content) return requestPayload.content;
  if (requestPayload.text) return requestPayload.text;

  if (requestPayload.analysis?.query) return requestPayload.analysis.query;
  if (requestPayload.analysis?.question) return requestPayload.analysis.question;

  if (requestPayload.instrument) {
    const parts = [`Generate AI Trade Setup for ${requestPayload.instrument}`];
    if (requestPayload.strategy) parts.push(`using ${requestPayload.strategy} strategy`);
    if (requestPayload.timeframe) parts.push(`on ${requestPayload.timeframe} timeframe`);
    return parts.join(' ');
  }

  if (requestPayload.type === 'macro_lab') {
    const content = deepExtractContent(responsePayload);
    if (typeof content === 'string') {
      const firstLine = content.split('\n').find(l => l.trim() && !l.startsWith('Executive'));
      if (firstLine) return `Macro Lab Analysis`;
    }
    return 'Macro Lab Analysis';
  }

  if (typeof requestPayload === 'object') {
    const keys = Object.keys(requestPayload);
    const meaningfulKeys = keys.filter(key =>
      typeof requestPayload[key] === 'string' &&
      requestPayload[key].length > 5 &&
      requestPayload[key].length < 100
    );
    if (meaningfulKeys.length > 0) {
      return requestPayload[meaningfulKeys[0]];
    }
  }

  const fallback = JSON.stringify(requestPayload);
  return fallback.length > 200 ? fallback.substring(0, 200) + '...' : fallback;
}

/**
 * Extract a clean, client-facing title from an interaction
 */
function extractItemTitle(interaction: AIInteraction): string {
  const feature = getFeatureDisplayName(interaction.feature_name);
  const response = interaction.ai_response;
  const request = interaction.request_payload;

  // --- AI Trade Setup ---
  if (feature === 'AI Trade Setup') {
    // From parsed trade setup
    if (response?._type === 'trade_setup_parsed' && response?.data?.payload) {
      const p = response.data.payload;
      const h = p.horizons?.[0];
      if (p.symbol && h?.direction) return `${p.symbol} — ${h.direction}`;
      if (p.symbol) return p.symbol;
    }
    // From structured content
    const content = interaction.response_payload?.content;
    if (content?.instrument) {
      const setup = content.setups?.[0];
      const dir = setup?.direction ? ` — ${setup.direction}` : '';
      return `${content.instrument}${dir}`;
    }
    // From response object
    if (response?.instrument) {
      const dir = response.direction ? ` — ${response.direction}` : '';
      return `${response.instrument}${dir}`;
    }
    // From request payload
    if (request?.instrument) return request.instrument;
  }

  // --- Macro Commentary ---
  if (feature === 'Macro Commentary') {
    // Try extracting instrument from response text
    if (typeof response === 'string') {
      const match = response.match(INSTRUMENT_REGEX);
      if (match) return `${match[1]} Macro Analysis`;
    }
    // From structured response
    if (response?.asset) return `${response.asset} Macro Analysis`;
    // From request
    if (request?.instrument) return `${request.instrument} Macro Analysis`;
    if (request?.macroInsight?.message?.content) {
      const q = request.macroInsight.message.content;
      const match = q.match(INSTRUMENT_REGEX);
      if (match) return `${match[1]} Macro Analysis`;
    }
    return 'Macro Analysis';
  }

  // --- Report ---
  if (feature === 'Report') {
    if (typeof response === 'string') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = response;
      const h1 = tempDiv.querySelector('h1');
      const h2 = tempDiv.querySelector('h2');
      const title = h1?.textContent || h2?.textContent;
      if (title) return title.substring(0, 60);
    }
    return 'Report';
  }

  return feature;
}

export function AIInteractionHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [interactions, setInteractions] = useState<AIInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    return parseInt(sessionStorage.getItem('history-items-per-page') || '20');
  });
  const [totalCount, setTotalCount] = useState(0);

  const fetchTotalCount = async () => {
    if (!user?.id) return 0;

    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('response_payload', 'is', null);

    if (selectedFeature !== 'all') {
      const jobsFeature = selectedFeature === 'ai_trade_setup' ? 'AI Trade Setup' :
                          selectedFeature === 'macro_commentary' ? 'Macro Commentary' :
                          selectedFeature === 'report' ? 'Report' : selectedFeature;
      query = query.eq('feature', jobsFeature);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error fetching total count:', error);
      return 0;
    }

    return count || 0;
  };

  const fetchInteractions = async (offset = 0, limit = 20) => {
    if (!user?.id) return [];

    let query = supabase
      .from('jobs')
      .select('id, feature, request_payload, response_payload, created_at, updated_at, status, user_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('response_payload', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (selectedFeature !== 'all') {
      const jobsFeature = selectedFeature === 'ai_trade_setup' ? 'AI Trade Setup' :
                          selectedFeature === 'macro_commentary' ? 'Macro Commentary' :
                          selectedFeature === 'report' ? 'Report' : selectedFeature;
      query = query.eq('feature', jobsFeature);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load interaction history",
        variant: "destructive"
      });
      return [];
    }

    const interactions: AIInteraction[] = (jobs || []).map(job => ({
      id: job.id,
      feature_name: normalizeFeatureName(job.feature || 'unknown'),
      user_query: deepExtractUserQuery(job.request_payload, job.response_payload),
      ai_response: deepExtractContent(job.response_payload),
      created_at: job.updated_at || job.created_at,
      user_id: job.user_id,
      job_id: job.id,
      status: job.status,
      request_payload: job.request_payload,
      response_payload: job.response_payload
    }));

    return interactions;
  };

  const loadInitialData = async () => {
    setLoading(true);
    const [data, count] = await Promise.all([
      fetchInteractions(0, itemsPerPage),
      fetchTotalCount()
    ]);
    setInteractions(data);
    setTotalCount(count);
    setHasMore(data.length === itemsPerPage);
    setLoading(false);
  };

  const refreshData = async () => {
    setRefreshing(true);
    const [data, count] = await Promise.all([
      fetchInteractions(0, itemsPerPage),
      fetchTotalCount()
    ]);
    setInteractions(data);
    setTotalCount(count);
    setHasMore(data.length === itemsPerPage);
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "History updated with latest data"
    });
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const newData = await fetchInteractions(interactions.length, itemsPerPage);
    setInteractions(prev => [...prev, ...newData]);
    setHasMore(newData.length === itemsPerPage);
    setLoadingMore(false);
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value);
    setItemsPerPage(newItemsPerPage);
    sessionStorage.setItem('history-items-per-page', value);
  };

  useEffect(() => {
    if (user?.id) {
      loadInitialData();
    }
  }, [user?.id, selectedFeature, itemsPerPage]);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return new Date(dateString).toLocaleString();
    }
  };

  const extractSummary = (response: any, featureName: string): string => {
    if (!response) return 'No response available';

    try {
      const normalizedFeature = normalizeFeatureName(featureName);

      // Plain text (macro_lab)
      if (typeof response === 'string') {
        // Try to extract instrument + bias
        const instrumentMatch = response.match(INSTRUMENT_REGEX);
        const biasMatch = response.match(/\b(Bullish|Bearish|Neutral)\b\s*(\d{1,3}%)?/i);
        if (instrumentMatch && biasMatch) {
          return `${instrumentMatch[1]} — ${biasMatch[0]}`;
        }
        const lines = response.split('\n').filter((l: string) => l.trim());
        const firstLine = lines[0] || '';
        return firstLine.length > 120 ? firstLine.slice(0, 120) + '…' : firstLine;
      }

      // Parsed trade setup
      if (response?._type === 'trade_setup_parsed' && response?.data?.payload) {
        const p = response.data.payload;
        const h = p.horizons?.[0];
        const parts = [p.symbol, h?.direction, h?.entry_price ? `Entry ${h.entry_price.toFixed(2)}` : null].filter(Boolean);
        return parts.join(' — ');
      }

      if (normalizedFeature === 'ai_trade_setup' && typeof response === 'object') {
        const { instrument, strategy, direction, entry_price, entryPrice } = response;
        if (instrument) {
          const parts = [instrument, direction, (entry_price || entryPrice) ? `Entry ${entry_price || entryPrice}` : null].filter(Boolean);
          return parts.join(' — ');
        }
        if (response.setups?.[0]) {
          const s = response.setups[0];
          const inst = response.instrument || s.instrument || 'N/A';
          const parts = [inst, s.direction, s.entryPrice ? `Entry ${s.entryPrice}` : null].filter(Boolean);
          return parts.join(' — ');
        }
      }

      if (normalizedFeature === 'macro_commentary' && typeof response === 'object') {
        const { asset, executive_summary, directional_bias } = response;
        if (asset && directional_bias) {
          const biasStr = typeof directional_bias === 'object' 
            ? `${directional_bias.direction || ''} ${directional_bias.confidence || ''}`.trim()
            : String(directional_bias);
          return `${asset} — ${biasStr}`;
        }
        if (executive_summary && typeof executive_summary === 'string') {
          return executive_summary.substring(0, 120) + '…';
        }
      }

      if (normalizedFeature === 'report' && typeof response === 'string') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = response;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        return textContent.substring(0, 120) + (textContent.length > 120 ? '…' : '');
      }

      // Fallback for objects
      if (typeof response === 'object' && response !== null) {
        if (response.summary && typeof response.summary === 'string') {
          return response.summary.slice(0, 120) + '…';
        }
        if (response.content && typeof response.content === 'string') {
          return response.content.slice(0, 120) + '…';
        }
        const textContent = Object.values(response).find(value =>
          typeof value === 'string' && value.length > 20
        ) as string;
        if (textContent) {
          return textContent.slice(0, 120) + (textContent.length > 120 ? '…' : '');
        }
      }

      return 'Analysis completed';
    } catch (error) {
      console.error('Error extracting summary:', error);
      return 'Response available';
    }
  };

  const getFeatureIcon = (featureName: string) => {
    const normalized = normalizeFeatureName(featureName);
    const IconComponent = FEATURE_ICONS[normalized as keyof typeof FEATURE_ICONS] || MessageSquare;
    return <IconComponent className="h-4 w-4" />;
  };

  const getFeatureLabel = (featureName: string) => {
    return getFeatureDisplayName(featureName);
  };

  const getFeatureColor = (featureName: string) => {
    const normalized = normalizeFeatureName(featureName);
    return FEATURE_COLORS[normalized as keyof typeof FEATURE_COLORS] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  /**
   * Render the AI response based on feature type — no originalQuery passed to sub-components
   */
  const renderFormattedResponse = (interaction: AIInteraction) => {
    if (!interaction.ai_response) return null;

    const feature = getFeatureDisplayName(interaction.feature_name);
    const response = interaction.ai_response;

    // --- AI Trade Setup ---
    if (feature === 'AI Trade Setup') {
      // Parsed trade setup from deep extraction
      if (response?._type === 'trade_setup_parsed' && response?.data) {
        return renderParsedTradeSetup(response);
      }

      // Legacy structured content with setups array
      try {
        const content = interaction.response_payload?.content;
        if (content?.setups && content.setups.length > 0) {
          const setupData = content.setups[0];
          const enrichedData = {
            ...setupData,
            instrument: content.instrument,
            disclaimer: content.disclaimer,
            market_commentary_anchor: content.market_commentary_anchor,
            data_fresheners: content.data_fresheners
          };
          return <TradeSetupDisplay data={enrichedData} originalQuery={undefined} />;
        }
      } catch {}

      // Object with trade setup fields
      if (typeof response === 'object' && (response.instrument || response.direction || response.entry_price)) {
        return <TradeSetupDisplay data={response} originalQuery={undefined} />;
      }

      // Fallback: show raw JSON in a clean card
      return renderRawFallback(interaction.response_payload);
    }

    // --- Macro Commentary ---
    if (feature === 'Macro Commentary') {
      // Plain text response (from macro_lab)
      if (typeof response === 'string') {
        return renderPlainTextMacro(response);
      }

      // Structured JSON response (from RAG)
      try {
        const parsedResponse = typeof response === 'string'
          ? JSON.parse(response)
          : response;

        if (parsedResponse.executive_summary || parsedResponse.fundamental_analysis || parsedResponse.directional_bias) {
          return <MacroCommentaryDisplay data={parsedResponse} originalQuery={undefined} />;
        }

        if (parsedResponse.content && typeof parsedResponse.content === 'string') {
          return renderPlainTextMacro(parsedResponse.content);
        }

        return <MacroCommentaryDisplay data={parsedResponse} originalQuery={undefined} />;
      } catch {
        return renderRawFallback(response);
      }
    }

    // --- Report ---
    if (feature === 'Report') {
      try {
        const responseContent = typeof response === 'string'
          ? response
          : JSON.stringify(response, null, 2);

        return (
          <Card className="border-l-4 border-l-purple-500/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                Generated Report
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="max-h-[500px] overflow-y-auto overflow-x-hidden">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert break-words"
                  dangerouslySetInnerHTML={{ __html: responseContent }}
                />
              </div>
            </CardContent>
          </Card>
        );
      } catch {
        return renderRawFallback(response);
      }
    }

    // --- Fallback ---
    return renderRawFallback(response);
  };

  /**
   * Render plain text macro commentary with clean formatting (no "Original Query" card)
   */
  const renderPlainTextMacro = (text: string) => {
    const sections = parseMacroTextSections(text);
    
    // Try to extract instrument from text
    const instrumentMatch = text.match(INSTRUMENT_REGEX);
    const instrument = instrumentMatch ? instrumentMatch[1] : null;

    return (
      <div className="space-y-3">
        {instrument && (
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{instrument} Analysis</span>
          </div>
        )}
        {sections.map((section, index) => (
          <Card key={index} className={index === 0 ? "border-l-4 border-l-primary/40" : ""}>
            {section.title && (
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
              </CardHeader>
            )}
            <CardContent className={`${section.title ? "pt-0" : "py-3"} px-4`}>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                {section.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  /**
   * Parse plain text macro commentary into titled sections
   */
  const parseMacroTextSections = (text: string): { title: string; content: string }[] => {
    const sections: { title: string; content: string }[] = [];
    const lines = text.split('\n');
    let currentTitle = '';
    let currentContent: string[] = [];

    const sectionHeadings = [
      'Executive Summary', 'Fundamental Analysis', 'Directional Bias',
      'Confidence', 'Key Levels', 'AI Insights Breakdown',
      'Toggle GPT', 'Toggle Curated', 'Fundamentals',
      'Rate Differentials', 'Positioning', 'Balance of Payments',
      'Central Bank Pricing', 'Sentiment Drivers', 'Event Watch',
      'Risk Notes', 'Market Context', 'Technical Analysis'
    ];

    for (const line of lines) {
      const trimmed = line.trim();
      const isHeading = sectionHeadings.some(h =>
        trimmed === h || trimmed.startsWith(h + '\n')
      );

      if (isHeading) {
        if (currentTitle || currentContent.length > 0) {
          sections.push({
            title: currentTitle,
            content: currentContent.join('\n').trim()
          });
        }
        currentTitle = trimmed;
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    if (currentTitle || currentContent.length > 0) {
      sections.push({
        title: currentTitle,
        content: currentContent.join('\n').trim()
      });
    }

    return sections.filter(s => s.content.length > 0 || s.title.length > 0);
  };

  /**
   * Render a parsed trade setup from the deep extraction
   */
  const renderParsedTradeSetup = (parsed: any) => {
    const tradeData = parsed?.data;
    if (!tradeData?.payload) {
      return renderRawFallback(parsed);
    }

    const payload = tradeData.payload;
    const horizons = payload.horizons || [];
    const h = horizons[0];

    const setupData = {
      instrument: payload.symbol,
      direction: h?.direction,
      entryPrice: h?.entry_price,
      stopLoss: h?.sl,
      takeProfits: h?.tp ? [h.tp] : [],
      confidence: h?.confidence ? Math.round(h.confidence * 100) : undefined,
      riskReward: h?.riskReward,
      timeframe: payload.timeframe,
      as_of: payload.as_of || payload.asOf,
      position_size: h?.position_size
    };

    return <TradeSetupDisplay data={setupData} originalQuery={undefined} />;
  };

  /**
   * Minimal raw fallback — no developer labels
   */
  const renderRawFallback = (data: any) => {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    return (
      <div className="bg-muted/30 p-4 rounded-lg max-h-64 overflow-y-auto">
        <pre className="text-xs whitespace-pre-wrap break-words font-mono">{content}</pre>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Interaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading interaction history...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Interaction History
            {totalCount > 0 && (
              <Badge variant="outline" className="ml-2">
                {totalCount} total
              </Badge>
            )}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedFeature} onValueChange={setSelectedFeature}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by feature" />
              </SelectTrigger>
              <SelectContent>
                {FEATURES.map((feature) => (
                  <SelectItem key={feature.value} value={feature.value}>
                    {feature.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {interactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No interactions found</p>
            <p className="text-sm">Your AI interaction history will appear here</p>
          </div>
        ) : (
          <>
            {interactions.map((interaction) => {
              const isExpanded = expandedItems.has(interaction.id);
              const title = extractItemTitle(interaction);

              return (
                <Card key={interaction.id} className="overflow-x-hidden">
                  <CardContent className="p-4">
                    {/* Header — clean, client-facing */}
                    <button
                      onClick={() => toggleExpanded(interaction.id)}
                      className="w-full text-left flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 mt-0.5">
                          {getFeatureIcon(interaction.feature_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className={getFeatureColor(interaction.feature_name)}>
                              {getFeatureLabel(interaction.feature_name)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(interaction.created_at)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {title}
                          </p>
                          {!isExpanded && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {extractSummary(interaction.ai_response, interaction.feature_name)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 mt-0.5">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded content — directly rendered, no redundant headers */}
                    {isExpanded && (
                      <div className="border-t mt-3 pt-4 animate-accordion-down">
                        {renderFormattedResponse(interaction)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    'Load more'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
