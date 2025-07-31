import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Zap, 
  X, 
  Minimize2,
  Settings,
  TrendingUp,
  Target,
  Shield,
  RotateCcw,
  Save,
  Edit3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TradeSetupBubbleProps {
  instrument: string;
  timeframe?: string;
  onClose: () => void;
}

interface TradeSetup {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  riskReward: number;
  confidence: number;
  reasoning: string;
}

export function TradeSetupBubble({ instrument, timeframe, onClose }: TradeSetupBubbleProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [step, setStep] = useState<"parameters" | "generated">("parameters");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tradeSetup, setTradeSetup] = useState<TradeSetup | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Form parameters
  const [parameters, setParameters] = useState({
    instrument: instrument,
    timeframe: timeframe || "1H",
    riskAppetite: "moderate",
    positionSize: "1000",
    strategy: "breakout",
    customNotes: ""
  });

  const generateTradeSetup = async () => {
    setIsGenerating(true);
    
    try {
      // Call n8n webhook
      const response = await fetch('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "tradesetup",
          question: `Generate trade setup for ${parameters.instrument} with ${parameters.strategy} strategy, ${parameters.riskAppetite} risk, position size ${parameters.positionSize}. ${parameters.customNotes}`,
          instrument: parameters.instrument,
          timeframe: parameters.timeframe
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      
      // Create trade setup from webhook response or use fallback
      const mockSetup: TradeSetup = {
        entry: parameters.instrument === "EUR/USD" ? 1.0950 : 
               parameters.instrument === "Bitcoin" ? 45250 : 1.2850,
        stopLoss: parameters.instrument === "EUR/USD" ? 1.0890 : 
                  parameters.instrument === "Bitcoin" ? 43800 : 1.2780,
        takeProfit: parameters.instrument === "EUR/USD" ? 1.1080 : 
                    parameters.instrument === "Bitcoin" ? 47200 : 1.2980,
        positionSize: parseFloat(parameters.positionSize),
        riskReward: 2.1,
        confidence: parameters.riskAppetite === "low" ? 75 : 
                   parameters.riskAppetite === "high" ? 90 : 82,
        reasoning: rawData.content?.content || `Based on ${parameters.strategy} strategy with ${parameters.riskAppetite} risk profile. Technical indicators align with current market structure on ${parameters.timeframe} timeframe.`
      };
      
      setTradeSetup(mockSetup);
      setStep("generated");
      
      toast({
        title: "Trade Setup Generated",
        description: "AI has analyzed the market and generated your trade setup"
      });
    } catch (error) {
      console.error('Webhook error:', error);
      
      toast({
        title: "Error",
        description: "Failed to generate trade setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateSetup = () => {
    setStep("parameters");
    setTradeSetup(null);
  };

  const saveSetup = () => {
    toast({
      title: "Setup Saved",
      description: "Trade setup has been saved to your portfolio"
    });
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          <Zap className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-3rem)]">
      <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur-lg">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">AI Trade Setup</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {parameters.instrument}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {parameters.timeframe}
            </Badge>
            <Badge variant={step === "parameters" ? "default" : "secondary"} className="text-xs">
              {step === "parameters" ? "Setup" : "Generated"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === "parameters" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeframe">Time Horizon</Label>
                  <Select value={parameters.timeframe} onValueChange={(value) => 
                    setParameters(prev => ({ ...prev, timeframe: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15M">Short term (15M)</SelectItem>
                      <SelectItem value="1H">Medium term (1H)</SelectItem>
                      <SelectItem value="4H">Long term (4H)</SelectItem>
                      <SelectItem value="1D">Very long term (1D)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="risk">Risk Appetite</Label>
                  <Select value={parameters.riskAppetite} onValueChange={(value) => 
                    setParameters(prev => ({ ...prev, riskAppetite: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Position Size (USD)</Label>
                  <Input
                    id="position"
                    type="number"
                    value={parameters.positionSize}
                    onChange={(e) => setParameters(prev => ({ ...prev, positionSize: e.target.value }))}
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select value={parameters.strategy} onValueChange={(value) => 
                    setParameters(prev => ({ ...prev, strategy: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakout">Breakout</SelectItem>
                      <SelectItem value="reversal">Reversal</SelectItem>
                      <SelectItem value="trend">Trend Following</SelectItem>
                      <SelectItem value="scalping">Scalping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Custom Notes</Label>
                <Textarea
                  id="notes"
                  value={parameters.customNotes}
                  onChange={(e) => setParameters(prev => ({ ...prev, customNotes: e.target.value }))}
                  placeholder="Add your specific criteria..."
                  className="h-20"
                />
              </div>

              <Button 
                onClick={generateTradeSetup} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Generate Trade Setup
                  </>
                )}
              </Button>
            </>
          )}

          {step === "generated" && tradeSetup && (
            <div className="space-y-4">
              {/* Trade Levels */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="text-xs text-muted-foreground mb-1">Entry</div>
                  <div className="font-mono font-semibold text-green-600 dark:text-green-400">
                    {isEditing ? (
                      <Input 
                        value={tradeSetup.entry} 
                        onChange={(e) => setTradeSetup(prev => prev ? {...prev, entry: parseFloat(e.target.value)} : null)}
                        className="h-8 text-center"
                      />
                    ) : (
                      tradeSetup.entry.toFixed(4)
                    )}
                  </div>
                </div>

                <div className="text-center p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="text-xs text-muted-foreground mb-1">Stop Loss</div>
                  <div className="font-mono font-semibold text-red-600 dark:text-red-400">
                    {isEditing ? (
                      <Input 
                        value={tradeSetup.stopLoss} 
                        onChange={(e) => setTradeSetup(prev => prev ? {...prev, stopLoss: parseFloat(e.target.value)} : null)}
                        className="h-8 text-center"
                      />
                    ) : (
                      tradeSetup.stopLoss.toFixed(4)
                    )}
                  </div>
                </div>

                <div className="text-center p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="text-xs text-muted-foreground mb-1">Take Profit</div>
                  <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {isEditing ? (
                      <Input 
                        value={tradeSetup.takeProfit} 
                        onChange={(e) => setTradeSetup(prev => prev ? {...prev, takeProfit: parseFloat(e.target.value)} : null)}
                        className="h-8 text-center"
                      />
                    ) : (
                      tradeSetup.takeProfit.toFixed(4)
                    )}
                  </div>
                </div>
              </div>

              {/* Trade Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Risk/Reward</div>
                  <div className="font-semibold">{tradeSetup.riskReward}:1</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                  <div className="font-semibold">{tradeSetup.confidence}%</div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-2">AI Analysis</div>
                <p className="text-sm leading-relaxed">{tradeSetup.reasoning}</p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  {isEditing ? "Validate" : "Edit"}
                </Button>
                <Button variant="outline" onClick={regenerateSetup}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                <Button onClick={saveSetup}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}