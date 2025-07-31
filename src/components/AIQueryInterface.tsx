import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Brain,
  Loader2,
  Copy,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AIQueryInterfaceProps {
  instrument: string;
  timeframe: string;
}

interface QueryResult {
  id: string;
  query: string;
  type: string;
  timestamp: Date;
  response: string;
}

export function AIQueryInterface({ instrument, timeframe }: AIQueryInterfaceProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [queryType, setQueryType] = useState("general");
  const [results, setResults] = useState<QueryResult[]>([]);
  const { toast } = useToast();

  const handleSubmitQuery = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: queryType,
          question: query,
          instrument: instrument,
          timeframe: timeframe
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const newResult: QueryResult = {
        id: Date.now().toString(),
        query: query,
        type: queryType,
        timestamp: new Date(),
        response: data.content?.content || data.content || "No response received"
      };

      setResults(prev => [newResult, ...prev]);
      setQuery("");
      
      toast({
        title: "Query Completed",
        description: "AI response received successfully"
      });
    } catch (error) {
      console.error('Query error:', error);
      toast({
        title: "Error",
        description: "Failed to process query. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyResult = (result: QueryResult) => {
    const content = `Query: ${result.query}\nType: ${result.type}\nInstrument: ${instrument}\nResponse: ${result.response}`;
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Result copied to clipboard"
    });
  };

  const clearResults = () => {
    setResults([]);
    toast({
      title: "Cleared",
      description: "All results have been cleared"
    });
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-medium">
      <CardHeader 
        className="cursor-pointer hover:bg-primary/5 transition-smooth"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg text-foreground">AI Query Interface</CardTitle>
            <Badge variant="outline" className="text-xs border-primary/30">
              Direct Access
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {results.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {results.length} results
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              {isExpanded ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Query Form */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Query Type</label>
                <Select value={queryType} onValueChange={setQueryType}>
                  <SelectTrigger className="bg-input/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Analysis</SelectItem>
                    <SelectItem value="tradesetup">Trade Setup</SelectItem>
                    <SelectItem value="macro">Macro Commentary</SelectItem>
                    <SelectItem value="reports">Custom Report</SelectItem>
                    <SelectItem value="technical">Technical Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Context</label>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {instrument}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {timeframe}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Query</label>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your analysis request here..."
                className="h-20 bg-input/50 border-border/50 focus:ring-primary/50 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSubmitQuery}
                disabled={isLoading || !query.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Query
                  </>
                )}
              </Button>
              
              {results.length > 0 && (
                <Button
                  variant="outline"
                  onClick={clearResults}
                  className="px-3"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <h4 className="text-sm font-semibold text-foreground border-b border-border/30 pb-1">
                Query Results
              </h4>
              {results.map((result) => (
                <Card key={result.id} className="bg-card/30 border-border/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              result.type === "tradesetup" && "border-primary/50 text-primary bg-primary/10",
                              result.type === "macro" && "border-success/50 text-success bg-success/10",
                              result.type === "reports" && "border-warning/50 text-warning bg-warning/10",
                              result.type === "general" && "border-muted/50 text-muted-foreground bg-muted/10"
                            )}
                          >
                            {result.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {result.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {result.query}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyResult(result)}
                        className="h-7 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="bg-muted/20 rounded-md p-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {result.response}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}