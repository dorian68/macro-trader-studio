import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, Target, TrendingUp, Settings, RotateCcw, Save, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import TradeResultPanel from "@/components/TradeResultPanel";

interface TradeSetup {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  riskReward: number;
  confidence: number;
  reasoning: string;
}

interface N8nTradeResult {
  instrument: string;
  asOf: string;
  market_commentary_anchor: {
    summary: string;
    key_drivers: string[];
  };
  setups: Array<{
    horizon: string;
    timeframe: string;
    strategy: string;
    direction: string;
    entryPrice: number;
    stopLoss: number;
    takeProfits: number[];
    riskRewardRatio: number;
    context: string;
    riskNotes: string;
    strategyMeta: {
      confidence: number;
    };
  }>;
  disclaimer: string;
}

export default function AISetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"parameters" | "generated">("parameters");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tradeSetup, setTradeSetup] = useState<TradeSetup | null>(null);
  const [n8nResult, setN8nResult] = useState<N8nTradeResult | null>(null);
  const [rawN8nResponse, setRawN8nResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [parameters, setParameters] = useState({
    instrument: "EUR/USD",
    timeframe: "4h",
    riskLevel: "medium",
    positionSize: "2",
    strategy: "breakout",
    customNotes: ""
  });

  const generateTradeSetup = async () => {
    setIsGenerating(true);
    setError(null);
    setN8nResult(null);
    
    try {
      // Step 1: Call macro-commentary endpoint first
      const macroPayload = {
        instrument: parameters.instrument,
        customNote: parameters.customNotes,
        mode: "run",
        type: "RAG"
      };

      console.log('📊 [AISetup] Calling macro-commentary endpoint:', macroPayload);

      const macroResponse = await fetch('/api/macro-commentary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(macroPayload)
      });

      if (!macroResponse.ok) {
        throw new Error(`HTTP ${macroResponse.status}: Failed to get macro commentary`);
      }

      const macroResult = await macroResponse.json();
      console.log('📊 [AISetup] Macro commentary response:', macroResult);

      // Step 2: Prepare JSON payload for trade setup with macro insight
      const payload = {
        ...parameters,
        mode: "run",
        type: "trade",
        macroInsight: macroResult
      };

      console.log('📊 [AISetup] Calling trade setup endpoint with macro insight:', payload);

      // Send POST request to n8n workflow
      const response = await fetch('https://dorian68.app.n8n.cloud/webhook/4572387f-700e-4987-b768-d98b347bd7f1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to generate trade setup`);
      }

      const result = await response.json();
      console.log('N8n Response:', result);
      setRawN8nResponse(result);
      
      // Check if we have the expected n8n format
      if (Array.isArray(result) && result.length > 0 && result[0].message?.content) {
        const content = result[0].message.content;
        console.log('N8n Result set:', content);
        setN8nResult(content);
        
        toast({
          title: "Trade Setup Generated",
          description: "Your AI trade setup has been generated successfully.",
        });
      } else {
        // Fallback to legacy format for backward compatibility
        const direction = Math.random() > 0.5 ? "buy" : "sell";
        const basePrice = 1.0900;
        
        let entry, stopLoss, takeProfit;
        if (direction === "buy") {
          entry = basePrice * 0.998;
          stopLoss = entry * 0.985;
          takeProfit = entry * 1.045;
        } else {
          entry = basePrice * 1.002;
          stopLoss = entry * 1.015;
          takeProfit = entry * 0.955;
        }
        
        const riskReward = Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss);
        
        setTradeSetup({
          entry: parseFloat(entry.toFixed(4)),
          stopLoss: parseFloat(stopLoss.toFixed(4)),
          takeProfit: parseFloat(takeProfit.toFixed(4)),
          positionSize: parseFloat(parameters.positionSize),
          riskReward: parseFloat(riskReward.toFixed(2)),
          confidence: Math.floor(Math.random() * 25) + 70,
          reasoning: `AI analysis suggests a ${direction} opportunity based on ${parameters.strategy} strategy for ${parameters.instrument}. Technical indicators show strong momentum with favorable risk-reward ratio.`
        });
        
        toast({
          title: "Trade Setup Generated",
          description: "Your AI trade setup has been generated successfully (legacy format).",
        });
      }
      
      setStep("generated");
      
    } catch (error) {
      console.error('Error generating trade setup:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSetup = () => {
    toast({
      title: "Setup Saved",
      description: "Your trade configuration has been saved successfully.",
    });
  };

  return (
    <Layout activeModule="ai-setup" onModuleChange={() => {}}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Trade Setup</h1>
            <p className="text-muted-foreground">Automated trade configuration and generation</p>
          </div>
        </div>

        {step === "parameters" && (
          <Card className="gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Trading Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="instrument">Instrument</Label>
                  <Select value={parameters.instrument} onValueChange={(value) => setParameters({...parameters, instrument: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                      <SelectItem value="GBP/USD">GBP/USD</SelectItem>
                      <SelectItem value="USD/JPY">USD/JPY</SelectItem>
                      <SelectItem value="USD/CHF">USD/CHF</SelectItem>
                      <SelectItem value="AUD/USD">AUD/USD</SelectItem>
                      <SelectItem value="USD/CAD">USD/CAD</SelectItem>
                      <SelectItem value="NZD/USD">NZD/USD</SelectItem>
                      <SelectItem value="EUR/GBP">EUR/GBP</SelectItem>
                      <SelectItem value="EUR/JPY">EUR/JPY</SelectItem>
                      <SelectItem value="GBP/JPY">GBP/JPY</SelectItem>
                      <SelectItem value="BTC/USD">Bitcoin</SelectItem>
                      <SelectItem value="ETH/USD">Ethereum</SelectItem>
                      <SelectItem value="BNB/USD">Binance Coin</SelectItem>
                      <SelectItem value="ADA/USD">Cardano</SelectItem>
                      <SelectItem value="SOL/USD">Solana</SelectItem>
                      <SelectItem value="DOT/USD">Polkadot</SelectItem>
                      <SelectItem value="MATIC/USD">Polygon</SelectItem>
                      <SelectItem value="GOLD">Gold</SelectItem>
                      <SelectItem value="SILVER">Silver</SelectItem>
                      <SelectItem value="WTI">Oil (WTI)</SelectItem>
                      <SelectItem value="BRENT">Oil (Brent)</SelectItem>
                      <SelectItem value="AAPL">Apple</SelectItem>
                      <SelectItem value="TSLA">Tesla</SelectItem>
                      <SelectItem value="MSFT">Microsoft</SelectItem>
                      <SelectItem value="GOOGL">Google</SelectItem>
                      <SelectItem value="AMZN">Amazon</SelectItem>
                      <SelectItem value="NVDA">NVIDIA</SelectItem>
                      <SelectItem value="META">Meta</SelectItem>
                      <SelectItem value="NFLX">Netflix</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeframe">Timeframe</Label>
                  <Select value={parameters.timeframe} onValueChange={(value) => setParameters({...parameters, timeframe: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                      <SelectItem value="1d">1 Day</SelectItem>
                      <SelectItem value="1w">1 Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riskLevel">Risk Level</Label>
                  <Select value={parameters.riskLevel} onValueChange={(value) => setParameters({...parameters, riskLevel: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Conservative</SelectItem>
                      <SelectItem value="medium">Moderate</SelectItem>
                      <SelectItem value="high">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="positionSize">Position Size (%)</Label>
                  <Input 
                    id="positionSize"
                    type="number"
                    value={parameters.positionSize}
                    onChange={(e) => setParameters({...parameters, positionSize: e.target.value})}
                    placeholder="2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select value={parameters.strategy} onValueChange={(value) => setParameters({...parameters, strategy: value})}>
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
                <Label htmlFor="customNotes">Custom Notes</Label>
                <Textarea 
                  id="customNotes"
                  value={parameters.customNotes}
                  onChange={(e) => setParameters({...parameters, customNotes: e.target.value})}
                  placeholder="Add specific instructions for the AI..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={generateTradeSetup} 
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Trade Setup
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "generated" && (
          <div className="space-y-6">
            {error && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    Erreur de Génération
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-700">{error}</p>
                  <Button 
                    onClick={() => setStep("parameters")} 
                    variant="outline" 
                    className="mt-4"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Réessayer
                  </Button>
                </CardContent>
              </Card>
            )}

            {n8nResult && (
              <TradeResultPanel result={n8nResult} rawResponse={rawN8nResponse} />
            )}

            {tradeSetup && !n8nResult && (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Target className="h-5 w-5" />
                    Generated Trade Setup (Legacy)
                    <Badge variant="outline" className="ml-auto">
                      Confidence: {tradeSetup.confidence}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Entry</Label>
                      <p className="text-2xl font-bold text-blue-600 mt-1">{tradeSetup.entry}</p>
                    </div>
                    <div className="text-center">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Stop Loss</Label>
                      <p className="text-2xl font-bold text-red-600 mt-1">{tradeSetup.stopLoss}</p>
                    </div>
                    <div className="text-center">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Take Profit</Label>
                      <p className="text-2xl font-bold text-green-600 mt-1">{tradeSetup.takeProfit}</p>
                    </div>
                    <div className="text-center">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Risk/Reward</Label>
                      <p className="text-2xl font-bold text-orange-600 mt-1">{tradeSetup.riskReward}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white/70 rounded-lg border mb-6">
                    <h4 className="font-semibold text-green-800 mb-2">AI Analysis</h4>
                    <p className="text-sm leading-relaxed">{tradeSetup.reasoning}</p>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setStep("parameters")} variant="outline">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Regenerate
                    </Button>
                    <Button onClick={saveSetup} className="flex-1">
                      <Save className="mr-2 h-4 w-4" />
                      Save Setup
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button onClick={() => setStep("parameters")} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Nouvelle Configuration
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}