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
    
    // For AI Trade Setup, look for setups array in content
    if (responsePayload.content?.setups && Array.isArray(responsePayload.content.setups)) {
      return responsePayload.content.setups[0] || responsePayload.content;
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

  const extractSummary = (response: any, featureName: string): string => {
    if (!response) return 'No response available';
    
    try {
      const normalizedFeature = normalizeFeatureName(featureName);
      
      if (normalizedFeature === 'ai_trade_setup' && typeof response === 'object') {
        const { instrument, strategy, direction } = response;
        if (instrument) {
          return `${instrument}${strategy ? ` • ${strategy}` : ''}${direction ? ` • ${direction}` : ''}`;
        }
      }
      
      if (normalizedFeature === 'macro_commentary' && typeof response === 'object') {
        const { asset, summary, market_outlook } = response;
        if (asset) {
          const preview = summary || market_outlook || 'Market analysis';
          return `${asset} • ${typeof preview === 'string' ? preview.substring(0, 80) : 'Analysis available'}`;
        }
      }
      
      if (normalizedFeature === 'report' && typeof response === 'string') {
        // Extract title or first meaningful text from HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = response;
        const h1 = tempDiv.querySelector('h1');
        const h2 = tempDiv.querySelector('h2');
        const title = h1?.textContent || h2?.textContent;
        if (title) {
          return title.substring(0, 100);
        }
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        return textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');
      }
      
      // Fallback for other cases
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
        
        // Try to find any text content
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

  const renderFormattedResponse = (interaction: AIInteraction) => {
    if (!interaction.ai_response) return null;

    const feature = getFeatureDisplayName(interaction.feature_name);
    
    if (feature === 'AI Trade Setup') {
      try {
        let tradeSetupData = interaction.ai_response;
        
        // Parse if string
        if (typeof tradeSetupData === 'string') {
          tradeSetupData = JSON.parse(tradeSetupData);
        }
        
        // Handle nested response structures from response_payload
        if (interaction.response_payload?.content?.setups && Array.isArray(interaction.response_payload.content.setups)) {
          tradeSetupData = interaction.response_payload.content.setups[0];
        } else if (interaction.response_payload?.message?.content?.content?.setups) {
          tradeSetupData = interaction.response_payload.message.content.content.setups[0];
        } else if (interaction.response_payload?.content) {
          tradeSetupData = interaction.response_payload.content;
        }
        
        return <TradeSetupDisplay data={tradeSetupData} originalQuery={interaction.user_query} />;
      } catch (error) {
        console.error('Error parsing AI Trade Setup response:', error);
        // Render structured fallback instead of raw JSON
        return renderStructuredFallback(interaction.ai_response, 'AI Trade Setup');
      }
    }

    if (feature === 'Macro Commentary') {
      try {
        const parsedResponse = typeof interaction.ai_response === 'string' 
          ? JSON.parse(interaction.ai_response) 
          : interaction.ai_response;
        return <MacroCommentaryDisplay data={parsedResponse} originalQuery={interaction.user_query} />;
      } catch (error) {
        console.error('Error parsing Macro Commentary response:', error);
        return renderStructuredFallback(interaction.ai_response, 'Macro Commentary');
      }
    }

    if (feature === 'Report') {
      try {
        const responseContent = typeof interaction.ai_response === 'string' 
          ? interaction.ai_response 
          : JSON.stringify(interaction.ai_response, null, 2);
        
        // For HTML content, render it directly in a contained, scrollable area
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
      } catch (error) {
        console.error('Error rendering report:', error);
        return renderStructuredFallback(interaction.ai_response, 'Report');
      }
    }

    // For other features, try to parse JSON first, then fall back to structured display
    try {
      const parsedResponse = typeof interaction.ai_response === 'string' 
        ? JSON.parse(interaction.ai_response) 
        : interaction.ai_response;
      return <div className="break-words">{renderStructuredResponse(parsedResponse)}</div>;
    } catch {
      const responseContent = typeof interaction.ai_response === 'string' 
        ? interaction.ai_response 
        : JSON.stringify(interaction.ai_response, null, 2);
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

  // Enhanced structured response renderer with proper card layout
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

    // Handle nested structures like message.content.content
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
