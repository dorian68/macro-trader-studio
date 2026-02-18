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

/**
 * Deep-extract the actual content from deeply nested response payloads.
 * Handles structures like:
 *   - Macro Lab: response_payload.message.content.content.message.content.content (plain text)
 *   - Trade Generator: response_payload.body.message.message.content.content.trade_setup[0] (JSON string)
 *   - RAG/Legacy: response_payload.content (structured JSON)
 */
function deepExtractContent(payload: any): any {
  if (!payload) return null;

  // --- Macro Lab path: message.content.content.message.content.content ---
  try {
    const level1 = payload?.message?.content?.content;
    if (level1 && typeof level1 === 'object') {
      const level2 = level1?.message?.content?.content;
      if (level2 && typeof level2 === 'string') {
        // This is the actual macro commentary text
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

  // --- Legacy/RAG structured response: message.content.content (object with structured fields) ---
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

  // Handle macroInsight structure
  if (requestPayload.macroInsight?.message?.content) {
    return requestPayload.macroInsight.message.content;
  }

  // Standard patterns
  if (requestPayload.question) return requestPayload.question;
  if (requestPayload.query) return requestPayload.query;
  if (requestPayload.user_query) return requestPayload.user_query;
  if (requestPayload.message) return requestPayload.message;
  if (requestPayload.content) return requestPayload.content;
  if (requestPayload.text) return requestPayload.text;

  // Nested analysis queries
  if (requestPayload.analysis?.query) return requestPayload.analysis.query;
  if (requestPayload.analysis?.question) return requestPayload.analysis.question;

  // For AI Trade Setup, reconstruct from instrument
  if (requestPayload.instrument) {
    const parts = [`Generate AI Trade Setup for ${requestPayload.instrument}`];
    if (requestPayload.strategy) parts.push(`using ${requestPayload.strategy} strategy`);
    if (requestPayload.timeframe) parts.push(`on ${requestPayload.timeframe} timeframe`);
    return parts.join(' ');
  }

  // For macro_lab type: try to extract query from the response itself
  if (requestPayload.type === 'macro_lab') {
    // Try to find instrument/asset from the response
    const content = deepExtractContent(responsePayload);
    if (typeof content === 'string') {
      // Extract the first line or "Executive Summary" section as context
      const firstLine = content.split('\n').find(l => l.trim() && !l.startsWith('Executive'));
      if (firstLine) return `Macro Lab Analysis`;
    }
    return 'Macro Lab Analysis';
  }

  // Try to find meaningful text from object
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

      // Plain text response (common for macro_lab)
      if (typeof response === 'string') {
        // Extract first meaningful line
        const lines = response.split('\n').filter(l => l.trim());
        const firstLine = lines[0] || '';
        return firstLine.length > 150 ? firstLine.slice(0, 150) + '...' : firstLine;
      }

      // Parsed trade setup
      if (response?._type === 'trade_setup_parsed' && response?.data?.payload) {
        const p = response.data.payload;
        const h = p.horizons?.[0];
        return `${p.symbol || 'N/A'} • ${h?.direction || ''} • Entry: ${h?.entry_price?.toFixed(2) || 'N/A'}`;
      }

      if (normalizedFeature === 'ai_trade_setup' && typeof response === 'object') {
        const { instrument, strategy, direction } = response;
        if (instrument) {
          return `${instrument}${strategy ? ` • ${strategy}` : ''}${direction ? ` • ${direction}` : ''}`;
        }
        // Try setups array
        if (response.setups?.[0]) {
          const s = response.setups[0];
          return `${response.instrument || s.instrument || 'N/A'} • ${s.direction || ''} • ${s.strategy || ''}`;
        }
      }

      if (normalizedFeature === 'macro_commentary' && typeof response === 'object') {
        const { asset, summary, market_outlook, executive_summary } = response;
        if (executive_summary) {
          return typeof executive_summary === 'string' ? executive_summary.substring(0, 150) + '...' : 'Analysis available';
        }
        if (asset) {
          const preview = summary || market_outlook || 'Market analysis';
          return `${asset} • ${typeof preview === 'string' ? preview.substring(0, 80) : 'Analysis available'}`;
        }
      }

      if (normalizedFeature === 'report' && typeof response === 'string') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = response;
        const h1 = tempDiv.querySelector('h1');
        const h2 = tempDiv.querySelector('h2');
        const title = h1?.textContent || h2?.textContent;
        if (title) return title.substring(0, 100);
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        return textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');
      }

      // Fallback for objects
      if (typeof response === 'object' && response !== null) {
        if (response.summary && typeof response.summary === 'string') {
          return response.summary.slice(0, 150) + '...';
        }
        if (response.content && typeof response.content === 'string') {
          return response.content.slice(0, 150) + '...';
        }
        if (response.analysis && typeof response.analysis === 'string') {
          return response.analysis.slice(0, 150) + '...';
        }
        const textContent = Object.values(response).find(value =>
          typeof value === 'string' && value.length > 20
        ) as string;
        if (textContent) {
          return textContent.slice(0, 150) + (textContent.length > 150 ? '...' : '');
        }
      }

      return 'AI analysis completed successfully';
    } catch (error) {
      console.error('Error extracting summary:', error);
      return 'Response parsing error';
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
      // Parsed trade setup from deep extraction
      if (response?._type === 'trade_setup_parsed' && response?.data) {
        return renderParsedTradeSetup(response, interaction.user_query);
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
          return <TradeSetupDisplay data={enrichedData} originalQuery={interaction.user_query} />;
        }
      } catch {}

      // Object with trade setup fields
      if (typeof response === 'object' && (response.instrument || response.direction || response.entry_price)) {
        return <TradeSetupDisplay data={response} originalQuery={interaction.user_query} />;
      }

      return renderTradeSetupFallback(interaction.response_payload, interaction.user_query);
    }

    // --- Macro Commentary ---
    if (feature === 'Macro Commentary') {
      // Plain text response (from macro_lab)
      if (typeof response === 'string') {
        return renderPlainTextMacro(response, interaction.user_query);
      }

      // Structured JSON response (from RAG)
      try {
        const parsedResponse = typeof response === 'string'
          ? JSON.parse(response)
          : response;

        // Check if it has the structured fields MacroCommentaryDisplay expects
        if (parsedResponse.executive_summary || parsedResponse.fundamental_analysis || parsedResponse.directional_bias) {
          return <MacroCommentaryDisplay data={parsedResponse} originalQuery={interaction.user_query} />;
        }

        // If it's a string inside the object
        if (parsedResponse.content && typeof parsedResponse.content === 'string') {
          return renderPlainTextMacro(parsedResponse.content, interaction.user_query);
        }

        return <MacroCommentaryDisplay data={parsedResponse} originalQuery={interaction.user_query} />;
      } catch {
        return renderStructuredFallback(response, 'Macro Commentary');
      }
    }

    // --- Report ---
    if (feature === 'Report') {
      try {
        const responseContent = typeof response === 'string'
          ? response
          : JSON.stringify(response, null, 2);

        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Report</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="max-h-96 overflow-y-auto overflow-x-hidden">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert break-words"
                  dangerouslySetInnerHTML={{ __html: responseContent }}
                />
              </div>
            </CardContent>
          </Card>
        );
      } catch {
        return renderStructuredFallback(response, 'Report');
      }
    }

    // --- Fallback for other features ---
    try {
      const parsedResponse = typeof response === 'string'
        ? JSON.parse(response)
        : response;
      return <div className="break-words">{renderStructuredResponse(parsedResponse)}</div>;
    } catch {
      const responseContent = typeof response === 'string'
        ? response
        : JSON.stringify(response, null, 2);
      return (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm space-y-2">
              <p className="leading-relaxed whitespace-pre-wrap break-words">{responseContent}</p>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  /**
   * Render plain text macro commentary with nice formatting
   */
  const renderPlainTextMacro = (text: string, originalQuery?: string) => {
    // Parse sections from the plain text
    const sections = parseMacroTextSections(text);

    return (
      <div className="space-y-4">
        {originalQuery && originalQuery !== 'Unavailable' && originalQuery !== 'Macro Lab Analysis' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Original Query</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm bg-muted/50 p-3 rounded-lg font-mono break-words">{originalQuery}</p>
            </CardContent>
          </Card>
        )}

        {sections.map((section, index) => (
          <Card key={index}>
            {section.title && (
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">{section.title}</CardTitle>
              </CardHeader>
            )}
            <CardContent className={section.title ? "pt-0" : "p-4"}>
              <div className="text-foreground leading-relaxed whitespace-pre-wrap break-words text-sm">
                {section.content}
              </div>
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
        // Save previous section
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

    // Save last section
    if (currentTitle || currentContent.length > 0) {
      sections.push({
        title: currentTitle,
        content: currentContent.join('\n').trim()
      });
    }

    // Filter out empty sections
    return sections.filter(s => s.content.length > 0 || s.title.length > 0);
  };

  /**
   * Render a parsed trade setup from the deep extraction
   */
  const renderParsedTradeSetup = (parsed: any, originalQuery?: string) => {
    const tradeData = parsed?.data;
    if (!tradeData?.payload) {
      return renderStructuredFallback(parsed, 'AI Trade Setup');
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

    return <TradeSetupDisplay data={setupData} originalQuery={originalQuery} />;
  };

  // Render specialized fallback for AI Trade Setup
  const renderTradeSetupFallback = (responsePayload: any, originalQuery: string) => {
    const content = responsePayload?.content;

    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">AI Trade Setup Response</CardTitle>
          {originalQuery && originalQuery !== 'Unavailable' && (
            <p className="text-sm text-muted-foreground">Query: {originalQuery}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {content?.instrument && (
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Instrument</h4>
              <p className="text-lg font-mono">{content.instrument}</p>
            </div>
          )}

          {content?.setups && content.setups.length > 0 && (
            <div className="space-y-6">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Trade Setups</h4>
              {content.setups.map((setup: any, index: number) => (
                <Card key={index} className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-semibold">Direction:</span>
                        <span className={`ml-2 capitalize ${setup.direction === 'long' ? 'text-green-600' : 'text-red-600'}`}>
                          {setup.direction}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold">Strategy:</span>
                        <span className="ml-2 capitalize">{setup.strategy}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Timeframe:</span>
                        <span className="ml-2 font-mono">{setup.timeframe}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Horizon:</span>
                        <span className="ml-2 capitalize">{setup.horizon}</span>
                      </div>
                    </div>

                    {setup.entryPrice && (
                      <div>
                        <span className="font-semibold">Entry Price:</span>
                        <span className="ml-2 font-mono text-lg">{setup.entryPrice}</span>
                      </div>
                    )}

                    {setup.stopLoss && (
                      <div>
                        <span className="font-semibold">Stop Loss:</span>
                        <span className="ml-2 font-mono text-red-600">{setup.stopLoss}</span>
                      </div>
                    )}

                    {setup.takeProfits && setup.takeProfits.length > 0 && (
                      <div>
                        <span className="font-semibold">Take Profits:</span>
                        <div className="ml-2 flex gap-2 flex-wrap">
                          {setup.takeProfits.map((tp: number, tpIndex: number) => (
                            <span key={tpIndex} className="font-mono text-green-600 bg-green-50 px-2 py-1 rounded">
                              {tp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {setup.levels && (
                      <div className="grid grid-cols-2 gap-4">
                        {setup.levels.supports && setup.levels.supports.length > 0 && (
                          <div>
                            <span className="font-semibold">Supports:</span>
                            <div className="ml-2">
                              {setup.levels.supports.map((support: number, idx: number) => (
                                <span key={idx} className="block font-mono text-sm">{support}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {setup.levels.resistances && setup.levels.resistances.length > 0 && (
                          <div>
                            <span className="font-semibold">Resistances:</span>
                            <div className="ml-2">
                              {setup.levels.resistances.map((resistance: number, idx: number) => (
                                <span key={idx} className="block font-mono text-sm">{resistance}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {setup.context && (
                      <div>
                        <span className="font-semibold">Context:</span>
                        <p className="ml-2 mt-1 text-sm text-muted-foreground break-words">{setup.context}</p>
                      </div>
                    )}

                    {setup.riskNotes && (
                      <div>
                        <span className="font-semibold">Risk Notes:</span>
                        <p className="ml-2 mt-1 text-sm text-muted-foreground break-words">{setup.riskNotes}</p>
                      </div>
                    )}

                    {(setup.riskReward || setup.risk_reward_ratio || setup.risk_reward) && (
                      <div>
                        <span className="font-semibold">Risk/Reward Ratio:</span>
                        <span className="ml-2 font-mono text-lg">{setup.riskReward || setup.risk_reward_ratio || setup.risk_reward}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {content?.market_commentary_anchor?.summary && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">Market Commentary</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 break-words">{content.market_commentary_anchor.summary}</p>
            </div>
          )}

          {content?.disclaimer && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground italic">{content.disclaimer}</p>
            </div>
          )}

          {/* If no structured content found, show raw */}
          {!content?.instrument && !content?.setups && (
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Raw Response:</p>
              <pre className="text-xs whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {JSON.stringify(responsePayload, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Structured fallback for parsing errors
  const renderStructuredFallback = (data: any, featureType: string) => {
    const responseContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {getFeatureIcon(featureType)}
            {featureType} Response
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-muted/50">
            <p className="text-xs text-muted-foreground mb-2">Raw Response Data:</p>
            <pre className="text-xs whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
              {responseContent}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Enhanced structured response renderer
  const renderStructuredResponse = (data: any) => {
    if (!data || typeof data !== 'object') {
      return (
        <Card>
          <CardContent className="p-4">
            <div className="bg-muted/30 rounded-lg border-l-4 border-muted/50 p-4">
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const actualData = data.message?.content?.content || data.content || data;

    return (
      <Card>
        <CardContent className="p-4 space-y-4">
          {Object.entries(actualData).map(([key, value], index) => (
            <div key={index} className="border rounded-lg overflow-hidden bg-card">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <h5 className="font-semibold text-sm text-foreground">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/_/g, ' ')}
                </h5>
              </div>
              <div className="p-4">
                {typeof value === 'object' && value !== null ? (
                  Array.isArray(value) ? (
                    <div className="space-y-2">
                      {value.map((item, idx) => (
                        <div key={idx} className="bg-muted/20 p-3 rounded-md border-l-2 border-primary/20">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(value).map(([subKey, subValue]) => (
                        <div key={subKey} className="border-l-2 border-muted pl-3">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            {subKey.replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-foreground">
                            {typeof subValue === 'object' && subValue !== null ? (
                              <div className="bg-muted/20 p-3 rounded-md max-h-40 overflow-y-auto">
                                <pre className="text-xs whitespace-pre-wrap break-words">
                                  {JSON.stringify(subValue, null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap leading-relaxed break-words">
                                {String(subValue)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed break-words">
                    {String(value)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
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
      <CardContent className="space-y-4">
        {interactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No interactions found</p>
            <p className="text-sm">Your AI interaction history will appear here</p>
          </div>
        ) : (
          <>
            {interactions.map((interaction) => (
              <Card key={interaction.id} className="overflow-x-hidden">
                <CardContent className="p-4 sm:p-6">
                  {/* Header Section - Always Visible */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {getFeatureIcon(interaction.feature_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={getFeatureColor(interaction.feature_name)}>
                            {getFeatureLabel(interaction.feature_name)}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(interaction.created_at)}
                          </span>
                          {interaction.job_id && (
                            <Badge variant="outline" className="text-xs">
                              Job: {interaction.job_id.slice(0, 8)}...
                            </Badge>
                          )}
                        </div>

                        {/* Query Preview */}
                        <div className="bg-muted/30 p-2 rounded text-xs">
                          <p className="font-medium text-muted-foreground mb-1">Query:</p>
                          <p className="line-clamp-2 break-words text-foreground">
                            {interaction.user_query}
                          </p>
                        </div>

                        {/* Response Preview when collapsed */}
                        {!expandedItems.has(interaction.id) && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p className="font-medium">Response Preview:</p>
                            <p className="line-clamp-2 break-words">
                              {extractSummary(interaction.ai_response, interaction.feature_name)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(interaction.id)}
                      className="shrink-0 h-8 px-2"
                    >
                      {expandedItems.has(interaction.id) ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          <span className="text-xs">Collapse</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          <span className="text-xs">Expand</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Expandable Content */}
                  {expandedItems.has(interaction.id) && (
                    <div className="border-t pt-4 animate-accordion-down">
                      <div className="space-y-4">
                        {/* Full Query Display */}
                        <div>
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Complete Query</p>
                            <p className="text-sm font-mono break-words">
                              {interaction.user_query}
                            </p>
                          </div>
                        </div>

                        {/* Full Response Display */}
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">AI Response</h4>
                          {renderFormattedResponse(interaction)}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

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
