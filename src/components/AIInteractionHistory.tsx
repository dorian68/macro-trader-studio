import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Calendar, MessageSquare, TrendingUp, FileText, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { getFeatureDisplayName, normalizeFeatureName } from '@/lib/feature-mapper';

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
  trade_setup: TrendingUp, // Legacy support
  macro_commentary: MessageSquare,
  market_commentary: MessageSquare, // Legacy support
  report: FileText
};

const FEATURE_COLORS = {
  ai_trade_setup: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  trade_setup: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', // Legacy
  macro_commentary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  market_commentary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', // Legacy
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

  // Helper function to extract user query from job request payload
  const extractUserQuery = (requestPayload: any): string => {
    if (!requestPayload) return 'Unavailable';
    
    // Standard patterns from jobs.request_payload
    if (requestPayload.question) return requestPayload.question;
    if (requestPayload.query) return requestPayload.query;
    if (requestPayload.user_query) return requestPayload.user_query;
    if (requestPayload.message) return requestPayload.message;
    if (requestPayload.content) return requestPayload.content;
    if (requestPayload.text) return requestPayload.text;
    
    // Handle nested analysis queries
    if (requestPayload.analysis?.query) return requestPayload.analysis.query;
    if (requestPayload.analysis?.question) return requestPayload.analysis.question;
    
    const fallback = JSON.stringify(requestPayload);
    return fallback.length > 200 ? fallback.substring(0, 200) + '...' : fallback;
  };

  // Helper function to extract AI response from job response payload
  const extractAIResponse = (responsePayload: any): any => {
    if (!responsePayload) return 'Unavailable';
    
    // Handle nested response structures (like message.content.content)
    if (responsePayload.message?.content?.content) {
      return responsePayload.message.content.content;
    }
    
    // Direct response content
    if (responsePayload.content) return responsePayload.content;
    if (responsePayload.response) return responsePayload.response;
    if (responsePayload.analysis) return responsePayload.analysis;
    if (responsePayload.result) return responsePayload.result;
    
    return responsePayload;
  };

  const fetchTotalCount = async () => {
    if (!user?.id) return 0;

    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('response_payload', 'is', null);

    if (selectedFeature !== 'all') {
      // Map selected feature to jobs.feature format
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

    // Fetch directly from jobs table only
    let query = supabase
      .from('jobs')
      .select('id, feature, request_payload, response_payload, created_at, updated_at, status, user_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('response_payload', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (selectedFeature !== 'all') {
      // Map selected feature to jobs.feature format
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

    // Convert jobs to AIInteraction format
    const interactions: AIInteraction[] = (jobs || []).map(job => ({
      id: job.id,
      feature_name: normalizeFeatureName(job.feature || 'unknown'),
      user_query: extractUserQuery(job.request_payload),
      ai_response: extractAIResponse(job.response_payload),
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
      if (response.summary && typeof response.summary === 'string') {
        return response.summary.slice(0, 150) + '...';
      }
      if (response.content && typeof response.content === 'string') {
        return response.content.slice(0, 150) + '...';
      }
      if (response.analysis && typeof response.analysis === 'string') {
        return response.analysis.slice(0, 150) + '...';
      }
      if (response.commentary && typeof response.commentary === 'string') {
        return response.commentary.slice(0, 150) + '...';
      }
      if (response.conclusion && typeof response.conclusion === 'string') {
        return response.conclusion.slice(0, 150) + '...';
      }
      if (response.recommendation && typeof response.recommendation === 'string') {
        return response.recommendation.slice(0, 150) + '...';
      }
      
      // Handle nested response structures (like message.content.content)
      if (response.message?.content?.content) {
        const nestedContent = response.message.content.content;
        if (typeof nestedContent === 'object') {
          // Try to extract summary from nested object
          if (nestedContent['Executive Summary']) {
            return nestedContent['Executive Summary'].slice(0, 150) + '...';
          }
          if (nestedContent['Fundamental Analysis']) {
            return nestedContent['Fundamental Analysis'].slice(0, 150) + '...';
          }
        }
      }
      
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

  // Note: Jobs cannot be deleted as they are managed by n8n

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

  const renderFormattedResponse = (response: any, featureName: string) => {
    if (!response || response === 'Unavailable') {
      return (
        <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-muted/50">
          <p className="text-sm text-muted-foreground">Unavailable</p>
        </div>
      );
    }

    const normalizedFeature = normalizeFeatureName(featureName);

    // For reports - render HTML directly
    if (normalizedFeature === 'report') {
      if (typeof response === 'string') {
        // Check if it's HTML content
        if (response.includes('<html>') || response.includes('<!DOCTYPE') || response.includes('<body>')) {
          return (
            <div className="border rounded-lg overflow-hidden">
              <div 
                className="prose prose-sm max-w-none dark:prose-invert report-content"
                dangerouslySetInnerHTML={{ __html: response }}
              />
            </div>
          );
        }
        // If not HTML, try to parse as JSON first
        try {
          const parsed = JSON.parse(response);
          return renderJSONResponse(parsed);
        } catch {
          // Plain text response
          return (
            <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary/30">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{response}</p>
            </div>
          );
        }
      }
      if (typeof response === 'object') {
        return renderJSONResponse(response);
      }
    }

    // For macro-analysis and ai-setup - render JSON in structured format
    if (normalizedFeature === 'macro_commentary' || normalizedFeature === 'ai_trade_setup') {
      if (typeof response === 'string') {
        try {
          const parsed = JSON.parse(response);
          return renderJSONResponse(parsed);
        } catch {
          return (
            <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary/30">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{response}</p>
            </div>
          );
        }
      }
      if (typeof response === 'object') {
        return renderJSONResponse(response);
      }
    }

    // Default fallback
    if (typeof response === 'string') {
      return (
        <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary/30">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{response}</p>
        </div>
      );
    }

    if (typeof response === 'object') {
      return renderJSONResponse(response);
    }

    return (
      <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-muted/50">
        <p className="text-sm text-muted-foreground">Unable to display response</p>
      </div>
    );
  };

  const renderJSONResponse = (data: any) => {
    if (!data || typeof data !== 'object') {
      return (
        <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-muted/50">
          <p className="text-sm text-muted-foreground">No data available</p>
        </div>
      );
    }

    // Handle nested structures like message.content.content
    const actualData = data.message?.content?.content || data.content || data;

    return (
      <div className="space-y-3">
        {Object.entries(actualData).map(([key, value], index) => (
          <div key={index} className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 border-b">
              <h5 className="font-medium text-sm text-foreground capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </h5>
            </div>
            <div className="p-3">
              {typeof value === 'object' && value !== null ? (
                <div className="space-y-2">
                  {Object.entries(value).map(([subKey, subValue]) => (
                    <div key={subKey} className="pl-3 border-l-2 border-muted">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        {subKey.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-sm text-foreground">
                        {typeof subValue === 'object' ? (
                          <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto">
                            {JSON.stringify(subValue, null, 2)}
                          </pre>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{String(subValue)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {String(value)}
                </p>
              )}
            </div>
          </div>
        ))}
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
              <div key={interaction.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      {getFeatureIcon(interaction.feature_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
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
                      <p className="text-sm text-muted-foreground truncate">
                        {interaction.user_query}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {extractSummary(interaction.ai_response)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(interaction.id)}
                        >
                          <Eye className="h-4 w-4" />
                          {expandedItems.has(interaction.id) ? (
                            <ChevronUp className="h-4 w-4 ml-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-1" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="border-t pt-4 space-y-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Query</h4>
                            <div className="bg-muted/30 p-3 rounded-lg text-sm">
                              {interaction.user_query}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-2">Response</h4>
                            {renderFormattedResponse(interaction.ai_response, interaction.feature_name)}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              </div>
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
