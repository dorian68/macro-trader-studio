import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Copy,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";

const sampleAssets = [
  "EUR/USD", "GBP/USD", "USD/JPY", "Gold", "Silver", "Crude Oil", "Bitcoin", "Ethereum"
];

const mockCommentaries = {
  "EUR/USD": {
    title: "EUR/USD Weekly Outlook",
    introduction: "The EUR/USD pair is showing mixed signals as markets digest recent ECB communications and US economic data releases.",
    fundamental: {
      title: "Fundamental Analysis",
      content: "The European Central Bank's dovish stance continues to weigh on the Euro, while the Federal Reserve maintains its hawkish rhetoric. Key economic indicators from the Eurozone show modest growth, with inflation remaining above target. The divergence in monetary policy between the ECB and Fed creates a compelling narrative for USD strength.",
      factors: ["ECB dovish policy", "Fed hawkish stance", "Inflation divergence", "Economic growth differential"]
    },
    technical: {
      bias: "Bearish",
      confidence: 75,
      keyLevels: {
        support: "1.0850",
        resistance: "1.0950"
      }
    },
    gptInsight: "Based on current market dynamics, the EUR/USD is likely to face continued pressure towards the 1.08 handle.",
    curatedInsight: "Our proprietary macro model suggests institutional positioning favors USD strength, with particular focus on peripheral bond spreads as a key driver."
  }
};

export function MacroCommentary() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [commentary, setCommentary] = useState<any>(null);
  const [showDetails, setShowDetails] = useState({ gpt: true, curated: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const asset = sampleAssets.find(a => 
        query.toLowerCase().includes(a.toLowerCase().replace("/", ""))
      ) || "EUR/USD";
      
      setCommentary(mockCommentaries[asset as keyof typeof mockCommentaries] || mockCommentaries["EUR/USD"]);
      setIsLoading(false);
    }, 1500);
  };

  const handleQuickQuery = (asset: string) => {
    setQuery(`Give me a macro view on ${asset} this week`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Macro Commentary Generator</h2>
          <p className="text-muted-foreground mt-1">
            Generate comprehensive market analysis and macro insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
            Live Data
          </Badge>
        </div>
      </div>

      {/* Query Interface */}
      <Card className="gradient-card border-border-light shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Query Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Give me a macro view on EUR/USD this week"
              className="flex-1 bg-background/50 border-border-light"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !query.trim()}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </form>

          {/* Quick Queries */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Quick queries:</p>
            <div className="flex flex-wrap gap-2">
              {sampleAssets.map((asset) => (
                <Button
                  key={asset}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickQuery(asset)}
                  className="text-xs"
                >
                  {asset}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commentary Display */}
      {commentary && (
        <div className="space-y-4">
          <Card className="gradient-card border-border-light shadow-medium">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {commentary.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Introduction */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Executive Summary</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {commentary.introduction}
                </p>
              </div>

              <Separator className="bg-border-light" />

              {/* Fundamental Analysis */}
              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {commentary.fundamental.title}
                </h4>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {commentary.fundamental.content}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {commentary.fundamental.factors.map((factor: string, index: number) => (
                    <div 
                      key={index}
                      className="bg-accent/30 rounded-lg p-3 border border-border-light"
                    >
                      <p className="text-sm text-foreground font-medium">{factor}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-border-light" />

              {/* Technical Bias */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Directional Bias</h4>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "px-3 py-1",
                        commentary.technical.bias === "Bearish" 
                          ? "bg-danger/10 text-danger border-danger/20"
                          : "bg-success/10 text-success border-success/20"
                      )}
                    >
                      {commentary.technical.bias}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Confidence:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-20 h-2 bg-accent rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ width: `${commentary.technical.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{commentary.technical.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-3">Key Levels</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-accent/30 rounded-lg p-3 border border-border-light">
                      <p className="text-xs text-muted-foreground">Support</p>
                      <p className="text-sm font-mono font-medium text-success">
                        {commentary.technical.keyLevels.support}
                      </p>
                    </div>
                    <div className="bg-accent/30 rounded-lg p-3 border border-border-light">
                      <p className="text-xs text-muted-foreground">Resistance</p>
                      <p className="text-sm font-mono font-medium text-danger">
                        {commentary.technical.keyLevels.resistance}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-border-light" />

              {/* AI Insights */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h4 className="font-semibold text-foreground">AI Insights Breakdown</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDetails(prev => ({ ...prev, gpt: !prev.gpt }))}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Toggle GPT
                    </button>
                    <button
                      onClick={() => setShowDetails(prev => ({ ...prev, curated: !prev.curated }))}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Toggle Curated
                    </button>
                  </div>
                </div>

                {showDetails.gpt && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="border-primary/20 text-primary">
                        GPT Insight
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {commentary.gptInsight}
                    </p>
                  </div>
                )}

                {showDetails.curated && (
                  <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="border-success/20 text-success">
                        Curated ABCG Insight
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {commentary.curatedInsight}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}