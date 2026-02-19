import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseMarkdownToReact } from "@/lib/markdownParser";

interface MacroCommentaryDisplayProps {
  data: any;
  originalQuery?: string;
}

export function MacroCommentaryDisplay({ data, originalQuery }: MacroCommentaryDisplayProps) {
  const [gptInsightsOpen, setGptInsightsOpen] = React.useState(false);
  const [curatedInsightsOpen, setCuratedInsightsOpen] = React.useState(false);

  if (!data) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground">No macro commentary data available.</p>
        </CardContent>
      </Card>
    );
  }

  // Parse the data if it's a string
  const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
  
  const {
    executive_summary,
    fundamental_analysis,
    directional_bias,
    confidence,
    key_levels,
    ai_insights_breakdown,
    query
  } = parsedData;

  const getDirectionIcon = (bias: string) => {
    const direction = bias?.toLowerCase();
    if (direction?.includes('bullish') || direction?.includes('up')) {
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    } else if (direction?.includes('bearish') || direction?.includes('down')) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950";
    if (conf >= 60) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950";
    return "text-red-600 bg-red-50 dark:bg-red-950";
  };

  return (
    <div className="space-y-4">
      {/* Original Query */}
      {originalQuery && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Original Query</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm bg-muted/50 p-3 rounded-lg font-mono break-words">
              {originalQuery}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Query */}
      {query && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Query</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm bg-muted/30 p-3 rounded-lg break-words">
              {query}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Executive Summary */}
      {executive_summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-foreground leading-relaxed break-words">
              {parseMarkdownToReact(executive_summary)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fundamental Analysis */}
      {fundamental_analysis && Array.isArray(fundamental_analysis) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Fundamental Analysis</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {fundamental_analysis.map((point: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                  <span className="text-foreground break-words">{parseMarkdownToReact(point)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Directional Bias */}
      {directional_bias && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Directional Bias</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {getDirectionIcon(directional_bias)}
                <span className="font-medium break-words">{directional_bias}</span>
              </div>
              {confidence && (
                <Badge className={`${getConfidenceColor(confidence)} border-0`}>
                  Confidence: {confidence}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Levels */}
      {key_levels && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Key Levels</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Support Levels */}
              {key_levels.support && key_levels.support.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Support</h4>
                  <div className="space-y-1">
                    {key_levels.support.map((level: any, index: number) => (
                      <div key={index} className="bg-emerald-50 dark:bg-emerald-950 p-2 rounded text-sm break-words">
                        {typeof level === 'object' ? level.price || level.level : level}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resistance Levels */}
              {key_levels.resistance && key_levels.resistance.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Resistance</h4>
                  <div className="space-y-1">
                    {key_levels.resistance.map((level: any, index: number) => (
                      <div key={index} className="bg-red-50 dark:bg-red-950 p-2 rounded text-sm break-words">
                        {typeof level === 'object' ? level.price || level.level : level}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights Breakdown */}
      {ai_insights_breakdown && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">AI Insights Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* Toggle GPT */}
            {ai_insights_breakdown.toggle_gpt && (
              <Collapsible open={gptInsightsOpen} onOpenChange={setGptInsightsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Toggle GPT Insights
                    {gptInsightsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="bg-muted/30 p-4 rounded-lg break-words">
                    {typeof ai_insights_breakdown.toggle_gpt === 'string' 
                      ? parseMarkdownToReact(ai_insights_breakdown.toggle_gpt)
                      : JSON.stringify(ai_insights_breakdown.toggle_gpt, null, 2)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Toggle Curated */}
            {ai_insights_breakdown.toggle_curated && (
              <Collapsible open={curatedInsightsOpen} onOpenChange={setCuratedInsightsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    Toggle Curated Insights
                    {curatedInsightsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="bg-muted/30 p-4 rounded-lg break-words">
                    {typeof ai_insights_breakdown.toggle_curated === 'string' 
                      ? parseMarkdownToReact(ai_insights_breakdown.toggle_curated)
                      : JSON.stringify(ai_insights_breakdown.toggle_curated, null, 2)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}