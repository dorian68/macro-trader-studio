import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Calendar, MessageSquare, TrendingUp, FileText, Trash2, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface AIInteraction {
  id: string;
  feature_name: string;
  user_query: string;
  ai_response: any;
  created_at: string;
  user_id: string;
}

const FEATURES = [
  { value: 'all', label: 'All Features' },
  { value: 'trade_setup', label: 'AI Trade Setup' },
  { value: 'market_commentary', label: 'Market Commentary' },
  { value: 'report', label: 'Reports' }
];

const FEATURE_ICONS = {
  trade_setup: TrendingUp,
  market_commentary: MessageSquare,
  report: FileText
};

const FEATURE_COLORS = {
  trade_setup: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  market_commentary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  report: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
};

const ITEMS_PER_PAGE_OPTIONS = [
  { value: '10', label: '10 items' },
  { value: '20', label: '20 items' },
  { value: '50', label: '50 items' },
  { value: '100', label: '100 items' }
];

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
      .from('ai_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (selectedFeature !== 'all') {
      query = query.eq('feature_name', selectedFeature);
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
      .from('ai_interactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (selectedFeature !== 'all') {
      query = query.eq('feature_name', selectedFeature);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching AI interactions:', error);
      toast({
        title: "Error",
        description: "Failed to load interaction history",
        variant: "destructive"
      });
      return [];
    }

    return data || [];
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
    
    // Reset and reload with new page size
    setInteractions([]);
    setExpandedItems(new Set());
    loadInitialData();
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

  const extractInstrument = (userQuery: string): string => {
    // Extract instrument from user query patterns
    const patterns = [
      /for\s+([A-Z]{3}\/[A-Z]{3})/i, // EUR/USD
      /for\s+([A-Z]{3,4})/i, // GOLD, BTC
      /([A-Z]{3}\/[A-Z]{3})/i, // Direct match
      /([A-Z]{2,4}\/[A-Z]{2,4})/i // Flexible match
    ];
    
    for (const pattern of patterns) {
      const match = userQuery.match(pattern);
      if (match) return match[1];
    }
    return 'N/A';
  };

  const extractSummary = (response: any): string => {
    if (typeof response === 'string') {
      return response.slice(0, 150) + (response.length > 150 ? '...' : '');
    }
    
    if (typeof response === 'object' && response !== null) {
      // Try to extract meaningful content from different response types
      if (response.summary) return response.summary.slice(0, 150) + '...';
      if (response.content) return response.content.slice(0, 150) + '...';
      if (response.analysis) return response.analysis.slice(0, 150) + '...';
      if (response.commentary) return response.commentary.slice(0, 150) + '...';
      if (response.conclusion) return response.conclusion.slice(0, 150) + '...';
      if (response.recommendation) return response.recommendation.slice(0, 150) + '...';
      
      // Try to find any text content
      const textContent = Object.values(response).find(value => 
        typeof value === 'string' && value.length > 20
      ) as string;
      
      if (textContent) {
        return textContent.slice(0, 150) + (textContent.length > 150 ? '...' : '');
      }
    }
    
    return 'AI analysis completed successfully';
  };

  const deleteInteraction = async (id: string) => {
    const { error } = await supabase
      .from('ai_interactions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete interaction",
        variant: "destructive"
      });
    } else {
      setInteractions(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Deleted",
        description: "Interaction removed from history"
      });
    }
  };


  const renderFormattedResponse = (response: any) => {
    if (typeof response === 'string') {
      // Try to parse JSON string to enable formatted rendering
      try {
        const parsed = JSON.parse(response);
        return renderFormattedResponse(parsed);
      } catch {
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary/30">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{response}</p>
              </div>
            </div>
          </div>
        );
      }
    }
    
    if (typeof response === 'object' && response !== null) {
      // Handle AI Trade Setup responses - check for multiple possible structures
      const isTradeSetup = (
        (response.entry !== undefined && response.stopLoss !== undefined && response.takeProfit !== undefined) ||
        (response.entryPrice !== undefined && response.stopLoss !== undefined && response.takeProfit !== undefined) ||
        (response.direction !== undefined && (response.entry !== undefined || response.entryPrice !== undefined)) ||
        (typeof response.direction === 'string' && (response.direction === 'BUY' || response.direction === 'SELL' || response.direction.toLowerCase() === 'long' || response.direction.toLowerCase() === 'short')) ||
        (response.trade_direction !== undefined) ||
        (response.recommendation !== undefined && typeof response.recommendation === 'object' && 
         (response.recommendation.entry !== undefined || response.recommendation.direction !== undefined)) ||
        (Array.isArray(response.setups) && response.setups.length > 0)
      );
      
      if (isTradeSetup) {
        // Extract trade data from various possible structures (including nested setups[])
        const setup = Array.isArray(response.setups) && response.setups.length > 0 ? response.setups[0] : response;

        const takeProfitTargets = setup.takeProfits || setup.take_profits || (setup.takeProfit !== undefined ? [setup.takeProfit] : undefined);
        const supports = setup.levels?.supports;
        const resistances = setup.levels?.resistances;

        const tradeData = {
          direction: setup.direction || setup.trade_direction || (response.recommendation && response.recommendation.direction),
          entry: setup.entry || setup.entryPrice || (response.recommendation && response.recommendation.entry),
          stopLoss: setup.stopLoss || setup.stop_loss || (response.recommendation && response.recommendation.stopLoss),
          takeProfit: setup.takeProfit || setup.take_profit || (response.recommendation && response.recommendation.takeProfit),
          takeProfitTargets,
          riskReward: setup.riskReward || setup.risk_reward || setup.riskRewardRatio || (response.recommendation && response.recommendation.riskReward),
          confidence: setup.confidence || setup.strategyMeta?.confidence || (response.recommendation && response.recommendation.confidence),
          positionSize: setup.positionSize || setup.position_size || (response.recommendation && response.recommendation.positionSize),
          reasoning: setup.reasoning || setup.context || response.reasoning || response.analysis || response.rationale || (response.recommendation && response.recommendation.reasoning),
          technicalAnalysis: setup.technicalAnalysis || setup.technical_analysis || (response.recommendation && response.recommendation.technicalAnalysis) || { indicators: setup.strategyMeta?.indicators },
          timeframe: setup.timeframe,
          horizon: setup.horizon,
          strategy: setup.strategy,
          riskNotes: setup.riskNotes,
          atrMultipleSL: setup.strategyMeta?.atrMultipleSL,
          supports,
          resistances,
          instrument: response.instrument || setup.instrument,
          asOf: response.asOf
        } as any;
        return (
          <div className="space-y-4">
            {/* Meta */}
            {(tradeData.instrument || tradeData.timeframe || tradeData.horizon || tradeData.strategy || tradeData.asOf) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {tradeData.instrument && (
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/20">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Instrument</div>
                    <div className="text-sm font-semibold text-foreground">{tradeData.instrument}</div>
                  </div>
                )}
                {tradeData.timeframe && (
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/20">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Timeframe</div>
                    <div className="text-sm font-semibold text-foreground">{tradeData.timeframe}</div>
                  </div>
                )}
                {tradeData.horizon && (
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/20">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Horizon</div>
                    <div className="text-sm font-semibold text-foreground">{tradeData.horizon}</div>
                  </div>
                )}
                {tradeData.strategy && (
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/20">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Strategy</div>
                    <div className="text-sm font-semibold text-foreground">{tradeData.strategy}</div>
                  </div>
                )}
                {tradeData.asOf && (
                  <div className="bg-muted/20 p-3 rounded-lg border border-border/20 col-span-2 sm:col-span-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">As of</div>
                    <div className="text-sm font-semibold text-foreground">{formatDate(tradeData.asOf)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Trade Direction */}
            {tradeData.direction && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Direction</h5>
                {(() => {
                  const dir = String(tradeData.direction).toUpperCase();
                  const isLong = dir === 'BUY' || dir === 'LONG';
                  return (
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      isLong
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
                        : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    }`}>
                      {dir}
                    </div>
                  );
                })()}
              </div>
            )}
            
            {/* Trade Levels */}
            {(tradeData.entry || tradeData.stopLoss) && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Trade Levels</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {tradeData.entry && (
                    <div className="bg-gradient-to-r from-muted/20 to-muted/10 p-3 rounded-lg border border-border/20">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entry</div>
                      <div className="text-lg font-semibold text-foreground">{Number(tradeData.entry).toFixed(4)}</div>
                    </div>
                  )}
                  {tradeData.stopLoss && (
                    <div className="bg-gradient-to-r from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10 p-3 rounded-lg border border-red-200/30 dark:border-red-800/30">
                      <div className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Stop Loss</div>
                      <div className="text-lg font-semibold text-red-700 dark:text-red-300">{Number(tradeData.stopLoss).toFixed(4)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Targets */}
            {tradeData.takeProfitTargets && tradeData.takeProfitTargets.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Targets</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {tradeData.takeProfitTargets.map((tp: number, idx: number) => (
                    <div key={idx} className="bg-gradient-to-r from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 p-3 rounded-lg border border-green-200/30 dark:border-green-800/30">
                      <div className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">TP{idx + 1}</div>
                      <div className="text-lg font-semibold text-green-700 dark:text-green-300">{Number(tp).toFixed(4)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Levels */}
            {(tradeData.supports?.length || tradeData.resistances?.length) && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Key Levels</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tradeData.supports?.length > 0 && (
                    <div className="bg-muted/20 p-3 rounded-lg border border-border/20">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Supports</div>
                      <div className="flex flex-wrap gap-2">
                        {tradeData.supports.map((s: number, i: number) => (
                          <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20">{Number(s).toFixed(4)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {tradeData.resistances?.length > 0 && (
                    <div className="bg-muted/20 p-3 rounded-lg border border-border/20">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Resistances</div>
                      <div className="flex flex-wrap gap-2">
                        {tradeData.resistances.map((r: number, i: number) => (
                          <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20">{Number(r).toFixed(4)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Risk & Metrics */}
            {(tradeData.riskReward || tradeData.confidence || tradeData.positionSize || tradeData.atrMultipleSL) && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Risk Metrics</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {tradeData.riskReward && (
                    <div className="bg-gradient-to-r from-muted/20 to-muted/10 p-3 rounded-lg border border-border/20 text-center">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risk:Reward</div>
                      <div className="text-lg font-semibold text-foreground">{Number(tradeData.riskReward).toFixed(2)}:1</div>
                    </div>
                  )}
                  {tradeData.confidence !== undefined && (
                    <div className="bg-gradient-to-r from-muted/20 to-muted/10 p-3 rounded-lg border border-border/20 text-center">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confidence</div>
                      <div className="text-lg font-semibold text-foreground">{Math.round((Number(tradeData.confidence) > 1 ? Number(tradeData.confidence) : Number(tradeData.confidence) * 100))}%</div>
                    </div>
                  )}
                  {tradeData.positionSize && (
                    <div className="bg-gradient-to-r from-muted/20 to-muted/10 p-3 rounded-lg border border-border/20 text-center">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Position Size</div>
                      <div className="text-lg font-semibold text-foreground">{Number(tradeData.positionSize).toFixed(2)}</div>
                    </div>
                  )}
                  {tradeData.atrMultipleSL && (
                    <div className="bg-gradient-to-r from-muted/20 to-muted/10 p-3 rounded-lg border border-border/20 text-center">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ATR Multiple SL</div>
                      <div className="text-lg font-semibold text-foreground">{Number(tradeData.atrMultipleSL).toFixed(2)}x</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reasoning / Context */}
            {tradeData.reasoning && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Context</h5>
                <div className="bg-gradient-to-r from-muted/20 to-muted/10 p-4 rounded-lg border border-border/20">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{tradeData.reasoning}</p>
                </div>
              </div>
            )}

            {/* Risk Notes */}
            {tradeData.riskNotes && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Risk Notes</h5>
                <div className="bg-gradient-to-r from-muted/20 to-muted/10 p-4 rounded-lg border border-border/20">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{tradeData.riskNotes}</p>
                </div>
              </div>
            )}
            
            {/* Technical Analysis */}
            {tradeData.technicalAnalysis && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Technical Analysis</h5>
                <div className="bg-gradient-to-r from-muted/20 to-muted/10 p-4 rounded-lg border border-border/20 space-y-3">
                  {tradeData.technicalAnalysis.summary && (
                    <div>
                      <h6 className="font-medium text-xs text-primary/80 uppercase tracking-wide border-b border-border/20 pb-1 mb-2">Summary</h6>
                      <p className="text-sm text-foreground/90">{tradeData.technicalAnalysis.summary}</p>
                    </div>
                  )}
                  {tradeData.technicalAnalysis.indicators && tradeData.technicalAnalysis.indicators.length > 0 && (
                    <div>
                      <h6 className="font-medium text-xs text-primary/80 uppercase tracking-wide border-b border-border/20 pb-1 mb-2">Indicators</h6>
                      <div className="flex flex-wrap gap-2">
                        {tradeData.technicalAnalysis.indicators.map((indicator: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20">
                            {indicator}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {tradeData.technicalAnalysis.confirmation !== undefined && (
                    <div>
                      <h6 className="font-medium text-xs text-primary/80 uppercase tracking-wide border-b border-border/20 pb-1 mb-2">Confirmation</h6>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        tradeData.technicalAnalysis.confirmation 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                      }`}>
                        {tradeData.technicalAnalysis.confirmation ? "Confirmed" : "Pending"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Fallback: Show all data if no specific trade data found */}
            {!tradeData.direction && !tradeData.entry && !tradeData.stopLoss && !tradeData.takeProfit && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Raw Trade Data</h5>
                <div className="bg-gradient-to-r from-muted/20 to-muted/10 p-4 rounded-lg border border-border/20">
                  <pre className="text-xs text-foreground/80 whitespace-pre-wrap overflow-auto max-h-96">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      }
      // Check for sections structure (new format)
      if (response.sections && Array.isArray(response.sections)) {
        return (
          <div className="space-y-4">
            {response.query && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Query</h5>
                <div className="text-sm text-foreground bg-gradient-to-r from-muted/20 to-muted/10 p-3 rounded-lg border border-border/20">
                  {response.query}
                </div>
              </div>
            )}
            
            {response.sections.map((section: any, index: number) => (
              <div key={index} className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">
                  {section.title || `Section ${index + 1}`}
                </h5>
                <div className="text-sm text-foreground bg-gradient-to-r from-muted/20 to-muted/10 p-4 rounded-lg border border-border/20">
                  {section.content && (() => {
                    // Parse structured content with headers
                    const contentSections = section.content.split('\n\n').filter((s: string) => s.trim());
                    return (
                      <div className="space-y-4">
                        {contentSections.map((contentSection: string, csIndex: number) => {
                          const lines = contentSection.split('\n');
                          const firstLine = lines[0];
                          
                          // Check if first line is a header (common analysis headers)
                          if (firstLine.match(/^(Executive Summary|Fundamental Analysis|Directional Bias|Key Levels|AI Insights|Fundamentals|Rate Differentials|Positioning|Balance of Payments|Central Bank Pricing|Sentiment Drivers|Event Watch|USD Weekly Outlook|Analysis Results)$/i)) {
                            const headerContent = lines.slice(1).join('\n').trim();
                            return (
                              <div key={csIndex} className="space-y-2">
                                <h6 className="font-medium text-xs text-primary/80 uppercase tracking-wide border-b border-border/20 pb-1">
                                  {firstLine}
                                </h6>
                                <div className="text-sm text-foreground/90 pl-2 border-l-2 border-primary/20">
                                  <pre className="whitespace-pre-wrap font-sans leading-relaxed">{headerContent}</pre>
                                </div>
                              </div>
                            );
                          }
                          
                          // Regular content block
                          return (
                            <div key={csIndex} className="text-sm text-foreground/90">
                              <pre className="whitespace-pre-wrap font-sans leading-relaxed">{contentSection}</pre>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
            
            {response.sources && response.sources.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Sources</h5>
                <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-md">
                  {response.sources.map((source: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 py-1">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full"></span>
                      <span>
                        {typeof source === 'string' 
                          ? source 
                          : source.title || source.url || JSON.stringify(source)
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      // Check for macro analysis structure
      if (response.message?.content?.content) {
        const content = response.message.content.content;
        const sections = content.split('\n\n').filter((section: string) => section.trim());
        
        return (
          <div className="space-y-4">
            {sections.map((section: string, index: number) => {
              const lines = section.split('\n');
              const title = lines[0];
              const content = lines.slice(1).join('\n').trim();
              
              if (title.includes('Executive Summary') || title.includes('Fundamental Analysis') || 
                  title.includes('Directional Bias') || title.includes('Key Levels') ||
                  title.includes('AI Insights') || title.includes('Fundamentals')) {
                return (
                  <div key={index} className="space-y-2">
                    <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">
                      {title.replace(/^#+\s*/, '')}
                    </h5>
                    <div className="text-sm text-foreground bg-gradient-to-r from-muted/20 to-muted/10 p-4 rounded-lg border border-border/20">
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
                    </div>
                  </div>
                );
              }
              
              return (
                <div key={index} className="p-3 bg-muted/20 rounded-md border-l-2 border-muted-foreground/20">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{section}</p>
                </div>
              );
            })}
          </div>
        );
      }
      
      // Extract meaningful sections from the response
      const sections = [];
      
      if (response.summary) {
        sections.push({ title: 'Summary', content: response.summary });
      }
      if (response.analysis) {
        sections.push({ title: 'Analysis', content: response.analysis });
      }
      if (response.commentary) {
        sections.push({ title: 'Commentary', content: response.commentary });
      }
      if (response.recommendation) {
        sections.push({ title: 'Recommendation', content: response.recommendation });
      }
      if (response.conclusion) {
        sections.push({ title: 'Conclusion', content: response.conclusion });
      }
      if (response.content) {
        sections.push({ title: 'Content', content: response.content });
      }
      
      // Extract sources if available
      const sources = response.sources || response.data_sources || [];
      
      if (sections.length > 0) {
        return (
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div key={index} className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">
                  {section.title}
                </h5>
                <div className="text-sm text-foreground bg-gradient-to-r from-muted/20 to-muted/10 p-4 rounded-lg border border-border/20">
                  {typeof section.content === 'string' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{section.content}</p>
                  ) : (
                    <pre className="text-xs overflow-auto font-mono">{JSON.stringify(section.content, null, 2)}</pre>
                  )}
                </div>
              </div>
            ))}
            
            {sources.length > 0 && (
              <div className="space-y-2">
                <h5 className="font-semibold text-sm text-primary border-b border-border/30 pb-1">Sources</h5>
                <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-md">
                  {sources.map((source: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 py-1">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full"></span>
                      <span>{source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
      
      // Fallback for unstructured objects - present a readable summary and let raw be viewed below
      const stringEntries = Object.entries(response)
        .filter(([_, v]) => typeof v === 'string' && (v as string).length > 0)
        .slice(0, 6) as [string, string][];

      return (
        <div className="space-y-3">
          <div className="p-3 bg-muted/20 rounded-md border-l-2 border-muted-foreground/20">
            <p className="text-sm text-muted-foreground">
              Unformatted response detected. See the raw response section below for full details.
            </p>
          </div>
          {stringEntries.length > 0 && (
            <div className="space-y-2">
              {stringEntries.map(([k, v]) => (
                <div key={k} className="text-sm">
                  <span className="font-medium capitalize text-foreground">{k.replace(/_/g, ' ')}:</span>{' '}
                  <span className="text-muted-foreground whitespace-pre-wrap">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <p className="text-sm text-muted-foreground italic">No response data available</p>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">AI Interaction History</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Select value={selectedFeature} onValueChange={setSelectedFeature}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by feature" />
            </SelectTrigger>
            <SelectContent>
              {FEATURES.map(feature => (
                <SelectItem key={feature.value} value={feature.value}>
                  {feature.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
        </div>
      </div>

      {/* Controls and Stats Row */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-4 bg-muted/30 rounded-lg border border-border/20">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Showing <span className="font-medium text-foreground">{interactions.length}</span> of{' '}
            <span className="font-medium text-foreground">{totalCount}</span> items
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Items per page:</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {interactions.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No interactions found</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Start using AI features to see your interaction history here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {interactions.map((interaction) => {
            const featureName = interaction.feature_name as keyof typeof FEATURE_ICONS;
            const Icon = FEATURE_ICONS[featureName] || MessageSquare;
            const isExpanded = expandedItems.has(interaction.id);
            const instrument = extractInstrument(interaction.user_query);
            const summary = extractSummary(interaction.ai_response);
            
            return (
              <Card key={interaction.id} className="transition-all duration-200 hover:shadow-md border border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-base font-semibold">
                            {FEATURES.find(f => f.value === interaction.feature_name)?.label}
                          </CardTitle>
                          <Badge className={FEATURE_COLORS[featureName] || 'bg-gray-100 text-gray-800'}>
                            {interaction.feature_name.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(interaction.created_at)}</span>
                          </div>
                          {instrument !== 'N/A' && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              <span className="font-medium">{instrument}</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-sm text-foreground/80 line-clamp-2">
                          {summary}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(interaction.id)}
                        className="shrink-0"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {isExpanded ? 'Hide' : 'View'}
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 ml-1" />
                        ) : (
                          <ChevronDown className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteInteraction(interaction.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <Collapsible open={isExpanded}>
                  <CollapsibleContent>
                    <CardContent className="pt-0 border-t border-border/30">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-foreground">Original Query</h4>
                          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border-l-2 border-primary/30">
                            {interaction.user_query}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <details className="group">
                              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 py-2">
                                <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                                View formatted response
                              </summary>
                              <div className="mt-3 animate-fade-in">
                                {renderFormattedResponse(interaction.ai_response)}
                              </div>
                            </details>
                          </div>
                          
                          <div>
                            <details className="group">
                              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 py-2">
                                <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                                View raw response data
                              </summary>
                              <pre className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-md overflow-auto max-h-64 mt-3 border border-border/30 font-mono">
                                {JSON.stringify(interaction.ai_response, null, 2)}
                              </pre>
                            </details>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}

          {hasMore && (
            <div className="flex justify-center">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
              >
                {loadingMore ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                ) : null}
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}