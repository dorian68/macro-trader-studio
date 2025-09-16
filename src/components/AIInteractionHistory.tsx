import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Calendar, MessageSquare, TrendingUp, FileText, Trash2, Eye } from 'lucide-react';
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

export function AIInteractionHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [interactions, setInteractions] = useState<AIInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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
    const data = await fetchInteractions(0, 20);
    setInteractions(data);
    setHasMore(data.length === 20);
    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    const newData = await fetchInteractions(interactions.length, 20);
    setInteractions(prev => [...prev, ...newData]);
    setHasMore(newData.length === 20);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (user?.id) {
      loadInitialData();
    }
  }, [user?.id, selectedFeature]);

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

  const clearAllHistory = async () => {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from('ai_interactions')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to clear history",
        variant: "destructive"
      });
    } else {
      setInteractions([]);
      toast({
        title: "Cleared",
        description: "All interaction history has been cleared"
      });
    }
  };

  const renderFormattedResponse = (response: any) => {
    if (typeof response === 'string') {
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
    
    if (typeof response === 'object' && response !== null) {
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
                  {response.sources.map((source: string, index: number) => (
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
        <div className="flex items-center gap-3">
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
          {interactions.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearAllHistory}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
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