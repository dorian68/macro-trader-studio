import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Calendar, MessageSquare, TrendingUp, FileText, RefreshCw, Newspaper, BarChart3, Maximize2, X, ArrowUp, ArrowDown, Shield, AlertTriangle, Lightbulb, Globe, Radio } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { getFeatureDisplayName, normalizeFeatureName } from '@/lib/feature-mapper';
import { TradeSetupDisplay } from '@/components/TradeSetupDisplay';
import { MacroCommentaryDisplay } from '@/components/MacroCommentaryDisplay';
import { DecisionSummaryCard } from '@/components/DecisionSummaryCard';

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

  // --- Full Trade Setup path: body.message.message.content.content.final_answer ---
  try {
    const tradeContent = payload?.body?.message?.message?.content?.content;
    if (tradeContent?.final_answer && typeof tradeContent.final_answer === 'string') {
      try {
        const parsed = JSON.parse(tradeContent.final_answer);
        if (parsed.instrument || parsed.setups || parsed.decision_summary) {
          return { _type: 'full_trade_setup', ...parsed };
        }
      } catch {}
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
    // Full trade setup from final_answer
    if (response?._type === 'full_trade_setup') {
      const inst = response.instrument;
      const dir = response.setups?.[0]?.direction;
      if (inst && dir) return `${inst} — ${dir.toUpperCase()}`;
      if (inst) return inst;
    }
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
    if (typeof response === 'string') {
      try {
        const parsed = JSON.parse(response);
        if (parsed.content) {
          const match = parsed.content.match(INSTRUMENT_REGEX);
          if (match) return `${match[1]} Macro Analysis`;
        }
        if (parsed.request?.query) {
          const match = parsed.request.query.match(INSTRUMENT_REGEX);
          if (match) return `${match[1]} Macro Analysis`;
        }
      } catch {}
      const match = response.match(INSTRUMENT_REGEX);
      if (match) return `${match[1]} Macro Analysis`;
    }
    if (response?.asset) return `${response.asset} Macro Analysis`;
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
  const [fullscreenItem, setFullscreenItem] = useState<AIInteraction | null>(null);

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

      // Full trade setup
      if (response?._type === 'full_trade_setup') {
        const s = response.setups?.[0];
        if (s) {
          const parts = [response.instrument, s.direction?.toUpperCase(), s.entryPrice ? `Entry ${Number(s.entryPrice).toFixed(5)}` : null].filter(Boolean);
          return parts.join(' — ');
        }
        if (response.instrument) return response.instrument;
      }

      // Plain text (macro_lab)
      if (typeof response === 'string') {
        try {
          const parsed = JSON.parse(response);
          if (parsed.content && typeof parsed.content === 'string') {
            const instrumentMatch = parsed.content.match(INSTRUMENT_REGEX);
            const biasMatch = parsed.content.match(/\b(Bullish|Bearish|Neutral)\b\s*(\d{1,3}%)?/i);
            if (instrumentMatch && biasMatch) return `${instrumentMatch[1]} — ${biasMatch[0]}`;
            const firstLine = parsed.content.split('\n').find((l: string) => l.trim()) || '';
            return firstLine.length > 120 ? firstLine.slice(0, 120) + '…' : firstLine;
          }
        } catch {}
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
   * Render the AI response based on feature type
   */
  const renderFormattedResponse = (interaction: AIInteraction) => {
    if (!interaction.ai_response) return null;

    const feature = getFeatureDisplayName(interaction.feature_name);
    const response = interaction.ai_response;

    // --- AI Trade Setup ---
    if (feature === 'AI Trade Setup') {
      // Full trade setup from final_answer
      if (response?._type === 'full_trade_setup') {
        return renderFullTradeSetup(response);
      }

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

      return renderRawFallback(interaction.response_payload);
    }

    // --- Macro Commentary ---
    if (feature === 'Macro Commentary') {
      if (typeof response === 'string') {
        try {
          const parsed = JSON.parse(response);
          if (parsed.content && typeof parsed.content === 'string') {
            return renderMacroLabResult(parsed);
          }
          if (parsed.executive_summary || parsed.fundamental_analysis || parsed.directional_bias) {
            return <MacroCommentaryDisplay data={parsed} originalQuery={undefined} />;
          }
        } catch {}
        return renderPlainTextMacro(response);
      }

      try {
        const parsedResponse = response;

        if (parsedResponse.executive_summary || parsedResponse.fundamental_analysis || parsedResponse.directional_bias) {
          return <MacroCommentaryDisplay data={parsedResponse} originalQuery={undefined} />;
        }

        if (parsedResponse.content && typeof parsedResponse.content === 'string') {
          if (parsedResponse.fundamentals || parsedResponse.citations_news) {
            return renderMacroLabResult(parsedResponse);
          }
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
   * Render a rich macro lab result with fundamentals table & news citations
   */
  const renderMacroLabResult = (parsed: { content: string; fundamentals?: any[]; citations_news?: any[]; market_data?: any; request?: any }) => {
    const sections = parseMacroTextSections(parsed.content);
    const instrumentMatch = parsed.content.match(INSTRUMENT_REGEX);
    const instrument = instrumentMatch ? instrumentMatch[1] : null;
    const query = parsed.request?.query;

    return (
      <div className="space-y-3">
        {/* Instrument + query */}
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {instrument ? `${instrument} Analysis` : 'Macro Analysis'}
          </span>
        </div>
        {query && (
          <p className="text-xs italic text-muted-foreground mb-2 pl-6">
            &ldquo;{query}&rdquo;
          </p>
        )}

        {/* Content sections */}
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

        {/* Fundamentals table */}
        {parsed.fundamentals && Array.isArray(parsed.fundamentals) && parsed.fundamentals.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Key Economic Data
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Indicator</TableHead>
                      <TableHead className="text-xs text-right">Actual</TableHead>
                      <TableHead className="text-xs text-right">Consensus</TableHead>
                      <TableHead className="text-xs text-right">Previous</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.fundamentals.map((item: any, idx: number) => {
                      const actual = item.actual ?? item.value;
                      const consensus = item.consensus ?? item.forecast ?? item.expected;
                      const previous = item.previous ?? item.prior;
                      const isSurprise = actual != null && consensus != null && actual !== consensus;
                      const isPositive = actual != null && consensus != null && Number(actual) > Number(consensus);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-xs font-medium py-2">
                            {item.indicator || item.name || item.label || `Data ${idx + 1}`}
                          </TableCell>
                          <TableCell className="text-xs text-right py-2">
                            {actual != null ? (
                              <span className={isSurprise ? (isPositive ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold') : ''}>
                                {actual}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-right py-2 text-muted-foreground">
                            {consensus ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-right py-2 text-muted-foreground">
                            {previous ?? '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Citations / News */}
        {parsed.citations_news && Array.isArray(parsed.citations_news) && parsed.citations_news.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-primary" />
                Market News
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4">
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {parsed.citations_news.slice(0, 5).map((news: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      {(news.publisher || news.source) && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {news.publisher || news.source}
                        </Badge>
                      )}
                      <span className="text-foreground break-words">
                        {news.title || news.headline || news.text || JSON.stringify(news)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

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
   * Render a full trade setup from final_answer with decision summary, market commentary, data fresheners
   */
  const renderFullTradeSetup = (data: any) => {
    const instrument = data.instrument || 'N/A';
    const setups = data.setups || [];
    const setup = setups[0];
    const decisionSummary = data.decision_summary;
    const marketCommentary = data.market_commentary_anchor;
    const dataFresheners = data.data_fresheners;

    const direction = setup?.direction;
    const isLong = direction?.toLowerCase() === 'long';
    const isShort = direction?.toLowerCase() === 'short';

    const takeProfits = setup?.takeProfits || [];
    const entryPrice = setup?.entryPrice;
    const stopLoss = setup?.stopLoss;
    const riskRewardRatio = setup?.riskRewardRatio;
    const confidence = setup?.confidence;
    const timeframe = setup?.timeframe;
    const strategy = data.strategy || setup?.strategy;
    const horizon = setup?.horizon;

    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <TrendingUp className="h-5 w-5 text-yellow-500" />
          <span className="text-base font-bold text-foreground">{instrument}</span>
          {direction && (
            <Badge className={isLong ? "bg-success/15 text-success border-success/30" : isShort ? "bg-destructive/15 text-destructive border-destructive/30" : ""} variant="outline">
              {isLong ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
              {direction.toUpperCase()}
            </Badge>
          )}
          {timeframe && <Badge variant="secondary" className="text-xs">{timeframe}</Badge>}
          {horizon && <Badge variant="secondary" className="text-xs">{horizon}</Badge>}
        </div>
        {strategy && <p className="text-xs text-muted-foreground pl-7">Strategy: {strategy}</p>}

        {/* Trade Levels */}
        {(entryPrice != null || stopLoss != null || takeProfits.length > 0) && (
          <Card className="border-l-4 border-l-yellow-500/40">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold">Trade Levels</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {entryPrice != null && (
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Entry</p>
                    <p className="text-sm font-mono font-semibold">{Number(entryPrice).toFixed(5)}</p>
                  </div>
                )}
                {stopLoss != null && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-[10px] text-destructive uppercase">Stop Loss</p>
                    <p className="text-sm font-mono font-semibold text-destructive">{Number(stopLoss).toFixed(5)}</p>
                  </div>
                )}
                {takeProfits.length > 0 && (
                  <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                    <p className="text-[10px] text-success uppercase">Take Profit{takeProfits.length > 1 ? 's' : ''}</p>
                    {takeProfits.map((tp: number, i: number) => (
                      <p key={i} className="text-sm font-mono font-semibold text-success">{Number(tp).toFixed(5)}</p>
                    ))}
                  </div>
                )}
                {riskRewardRatio != null && (
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">R:R</p>
                    <p className="text-sm font-mono font-semibold">{Number(riskRewardRatio).toFixed(2)}</p>
                  </div>
                )}
              </div>
              {confidence != null && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Confidence: {typeof confidence === 'number' && confidence <= 1 ? `${Math.round(confidence * 100)}%` : `${confidence}%`}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Context & Risk Notes from setup */}
        {setup?.context && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold">Market Context</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">{setup.context}</p>
            </CardContent>
          </Card>
        )}

        {setup?.riskNotes && Array.isArray(setup.riskNotes) && setup.riskNotes.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                Risk Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4">
              <ol className="space-y-1.5 pl-1">
                {setup.riskNotes.map((note: string, i: number) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-xs text-muted-foreground font-mono mt-0.5">{i + 1}.</span>
                    {note}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Decision Summary */}
        {decisionSummary && (
          <DecisionSummaryCard decisionSummary={decisionSummary} />
        )}

        {/* Market Commentary */}
        {marketCommentary && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Market Commentary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 space-y-2">
              {marketCommentary.summary && (
                <p className="text-sm text-foreground leading-relaxed">{marketCommentary.summary}</p>
              )}
              {marketCommentary.key_drivers && Array.isArray(marketCommentary.key_drivers) && marketCommentary.key_drivers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Key Drivers</p>
                  <ul className="space-y-1">
                    {marketCommentary.key_drivers.map((driver: string, i: number) => (
                      <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                        <span className="text-xs text-primary mt-0.5">•</span>
                        {driver}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Data Fresheners */}
        {dataFresheners && typeof dataFresheners === 'object' && Object.keys(dataFresheners).length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                Data Fresheners
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4">
              <div className="space-y-3">
                {Object.entries(dataFresheners).map(([key, value]: [string, any]) => {
                  if (!value || (Array.isArray(value) && value.length === 0)) return null;
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <Collapsible key={key}>
                      <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase hover:text-foreground transition-colors w-full">
                        <ChevronDown className="h-3 w-3" />
                        {label}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1.5 pl-5">
                        {Array.isArray(value) ? (
                          <ul className="space-y-1">
                            {value.map((item: any, i: number) => (
                              <li key={i} className="text-xs text-foreground/80">
                                {typeof item === 'string' ? item : (item?.label || item?.name || item?.title) ? `${item.label || item.name || item.title}: ${item.value || item.detail || ''}` : JSON.stringify(item)}
                              </li>
                            ))}
                          </ul>
                        ) : typeof value === 'string' ? (
                          <p className="text-xs text-foreground/80">{value}</p>
                        ) : (
                          <pre className="text-xs text-foreground/80 whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invalidation / Disclaimer */}
        {setup?.invalidation && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-warning/50 pl-3">
            {setup.invalidation}
          </p>
        )}
        {data.disclaimer && (
          <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/50">
            {data.disclaimer}
          </p>
        )}
      </div>
    );
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
   * Minimal raw fallback
   */
  const renderRawFallback = (data: any) => {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    return (
      <div className="bg-muted/30 p-4 rounded-lg max-h-64 overflow-y-auto">
        <pre className="text-xs whitespace-pre-wrap break-words font-mono">{content}</pre>
      </div>
    );
  };

  /**
   * Fullscreen overlay for viewing an interaction in detail
   */
  const renderFullscreenOverlay = () => {
    if (!fullscreenItem) return null;

    const title = extractItemTitle(fullscreenItem);
    const featureLabel = getFeatureLabel(fullscreenItem.feature_name);

    return (
      <Dialog open={!!fullscreenItem} onOpenChange={(open) => { if (!open) setFullscreenItem(null); }}>
        <DialogPortal>
          <DialogOverlay className="bg-black/60 backdrop-blur-md z-[10002]" />
          <div className="fixed inset-3 sm:inset-6 lg:inset-10 z-[10003] flex flex-col bg-background rounded-xl border shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b bg-card shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {getFeatureIcon(fullscreenItem.feature_name)}
                <Badge className={getFeatureColor(fullscreenItem.feature_name)}>
                  {featureLabel}
                </Badge>
                <span className="text-sm font-semibold text-foreground truncate">{title}</span>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                  {formatDate(fullscreenItem.created_at)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFullscreenItem(null)}
                className="shrink-0 ml-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-4 sm:p-6 lg:p-8">
              <div className="max-w-4xl mx-auto">
                {renderFormattedResponse(fullscreenItem)}
              </div>
            </ScrollArea>
          </div>
        </DialogPortal>
      </Dialog>
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
    <>
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
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleExpanded(interaction.id)}
                          className="flex-1 text-left flex items-start justify-between gap-3 min-w-0"
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

                        {/* Fullscreen button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8 min-h-0 min-w-0 opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullscreenItem(interaction);
                          }}
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Expanded content */}
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

      {/* Fullscreen overlay */}
      {renderFullscreenOverlay()}
    </>
  );
}
