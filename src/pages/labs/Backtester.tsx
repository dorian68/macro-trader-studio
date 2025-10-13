import { useState, useMemo, useEffect } from 'react';
import Layout from '@/components/Layout';
import { SuperUserGuard } from '@/components/SuperUserGuard';
import { LabsComingSoon } from '@/components/labs/LabsComingSoon';
import { useAURAContext } from '@/contexts/AURAContextProvider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BacktesterSummary } from '@/components/backtester/BacktesterSummary';
import { BacktesterChartPanel } from '@/components/backtester/BacktesterChartPanel';
import { BacktesterTable } from '@/components/backtester/BacktesterTable';
import { BacktesterInsights } from '@/components/backtester/BacktesterInsights';
import { InstrumentSelector } from '@/components/backtester/InstrumentSelector';
import { TradeChartPanel } from '@/components/backtester/TradeChartPanel';
import { usePriceData } from '@/hooks/usePriceData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { calculateStats, BacktestStats } from '@/data/mockBacktesterData';
import { useBacktesterData } from '@/hooks/useBacktesterData';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useBacktestSimulation, SimulatedTrade } from '@/hooks/useBacktestSimulation';
import { useToast } from '@/hooks/use-toast';
import { PlayCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

function BacktesterContent() {
  const { toast } = useToast();
  const { setContextData } = useAURAContext();
  const [isAURAExpanded, setIsAURAExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('my-setups');
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  
  // Simulation parameters
  const [positionSize, setPositionSize] = useState(1);
  const [leverage, setLeverage] = useState(100);
  const [simulatedMyTrades, setSimulatedMyTrades] = useState<SimulatedTrade[]>([]);
  const [simulatedGlobalTrades, setSimulatedGlobalTrades] = useState<SimulatedTrade[]>([]);
  const [simulationStats, setSimulationStats] = useState<{ my: any; global: any } | null>(null);
  
  // Fetch real data
  const { data: myTradeSetups, loading: myLoading } = useBacktesterData({ mode: 'my-setups' });
  const { data: globalTradeSetups, loading: globalLoading } = useBacktesterData({ mode: 'global' });
  
  const { runSimulation, loading: simulating } = useBacktestSimulation();

  // Use simulated trades if available, otherwise raw data
  const displayMyTrades = simulatedMyTrades.length > 0 ? simulatedMyTrades : myTradeSetups;
  const displayGlobalTrades = simulatedGlobalTrades.length > 0 ? simulatedGlobalTrades : globalTradeSetups;
  
  // Calculate stats for both datasets
  const myStats: BacktestStats = useMemo(() => {
    const baseStats = calculateStats(displayMyTrades);
    if (simulationStats?.my) {
      return {
        ...baseStats,
        simulatedTotalPnL: simulationStats.my.totalPnL,
        profitFactor: simulationStats.my.profitFactor,
        maxDrawdown: simulationStats.my.maxDrawdown,
      };
    }
    return baseStats;
  }, [displayMyTrades, simulationStats]);
  
  const globalStats: BacktestStats = useMemo(() => {
    const baseStats = calculateStats(displayGlobalTrades);
    if (simulationStats?.global) {
      return {
        ...baseStats,
        simulatedTotalPnL: simulationStats.global.totalPnL,
        profitFactor: simulationStats.global.profitFactor,
        maxDrawdown: simulationStats.global.maxDrawdown,
      };
    }
    return baseStats;
  }, [displayGlobalTrades, simulationStats]);

  // Get unique instruments
  const uniqueInstruments = useMemo(() => {
    const data = activeTab === 'my-setups' ? displayMyTrades : displayGlobalTrades;
    return Array.from(new Set(data.map(t => t.instrument))).sort();
  }, [activeTab, displayMyTrades, displayGlobalTrades]);

  // Filter trades by selected instrument
  const filteredTrades = useMemo(() => {
    const data = activeTab === 'my-setups' ? displayMyTrades : displayGlobalTrades;
    if (!selectedInstrument) return data;
    return data.filter(t => t.instrument === selectedInstrument);
  }, [activeTab, displayMyTrades, displayGlobalTrades, selectedInstrument]);
  
  // Run simulation
  const handleRunSimulation = async () => {
    try {
      toast({
        title: "Starting simulation...",
        description: "Fetching historical prices and simulating trades"
      });
      
      const myResult = await runSimulation({
        trades: myTradeSetups,
        positionSize,
        leverage
      });
      
      const globalResult = await runSimulation({
        trades: globalTradeSetups,
        positionSize,
        leverage
      });
      
      setSimulatedMyTrades(myResult.simulatedTrades);
      setSimulatedGlobalTrades(globalResult.simulatedTrades);
      setSimulationStats({
        my: myResult.stats,
        global: globalResult.stats,
      });
      
      const insufficientCount = 
        myResult.simulatedTrades.filter(t => t.simulated_outcome === 'insufficient_data').length +
        globalResult.simulatedTrades.filter(t => t.simulated_outcome === 'insufficient_data').length;
      
      toast({
        title: "Simulation complete!",
        description: insufficientCount > 0 
          ? `Processed trades with ${insufficientCount} instruments lacking data`
          : `Processed ${myTradeSetups.length} personal and ${globalTradeSetups.length} global trades`,
        variant: insufficientCount > 0 ? "destructive" : "default"
      });
    } catch (error) {
      toast({
        title: "Simulation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  // Get date range for price data
  const dateRange = useMemo(() => {
    if (filteredTrades.length === 0) return { start: undefined, end: undefined };
    const dates = filteredTrades.map(t => new Date(t.date).getTime());
    return {
      start: new Date(Math.min(...dates) - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date(Math.max(...dates) + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
  }, [filteredTrades]);

  // Fetch price data for selected instrument
  const { data: priceData, loading: priceLoading } = usePriceData({
    instrument: selectedInstrument,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  // Inject context data into AURA when data changes
  useEffect(() => {
    const stats = activeTab === 'my-setups' ? myStats : globalStats;
    const data = activeTab === 'my-setups' ? displayMyTrades : displayGlobalTrades;
    
    setContextData({
      page: 'Backtester',
      stats: {
        totalTrades: stats.totalTrades,
        winRate: stats.winRate,
        avgPnL: stats.avgPnL,
        totalValue: stats.cumulativePnL,
        activeTrades: stats.activeTrades,
        simulatedTotalPnL: stats.simulatedTotalPnL,
        profitFactor: stats.profitFactor,
        maxDrawdown: stats.maxDrawdown,
      },
      recentData: filteredTrades.slice(0, 10),
      filters: {
        instrument: selectedInstrument,
        tab: activeTab,
      }
    });
  }, [activeTab, myStats, globalStats, displayMyTrades, displayGlobalTrades, filteredTrades, selectedInstrument, setContextData]);

  // Cleanup context data on unmount
  useEffect(() => {
    return () => setContextData(undefined);
  }, [setContextData]);

  return (
    <Layout>
      <div className={`flex h-full relative transition-all ${isAURAExpanded ? 'md:mr-[33.333%]' : ''}`}>
        <div className="flex-1 w-full max-w-7xl mx-auto py-8 px-6 md:px-8 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">🧠 Beta Feature — Super Users Only</Badge>
            </div>
            <h1 className="text-3xl font-bold">AlphaLens Backtester</h1>
            <p className="text-muted-foreground">
              Replay every AI-generated trade setup.
            </p>
            <p className="text-sm text-muted-foreground">
              Analyze performance of all trade ideas generated across AlphaLens users, or focus on your own setups. 
              Discover strategy robustness and recurring alpha patterns.
            </p>
          </div>

          {/* Simulation Parameters Card */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Real Market Simulation
              </CardTitle>
              <CardDescription>
                Configure position sizing to simulate real PnL using historical TwelveData prices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Position Size */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Position Size (lots)</Label>
                    <span className="text-sm font-mono font-semibold">{positionSize.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[positionSize]}
                    onValueChange={([val]) => setPositionSize(val)}
                    min={0.01}
                    max={10}
                    step={0.01}
                    disabled={simulating}
                  />
                </div>

                {/* Leverage */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Leverage</Label>
                    <span className="text-sm font-mono font-semibold">{leverage}x</span>
                  </div>
                  <Slider
                    value={[leverage]}
                    onValueChange={([val]) => setLeverage(val)}
                    min={1}
                    max={500}
                    step={1}
                    disabled={simulating}
                  />
                </div>

                {/* Run Simulation Button */}
                <div className="flex items-end">
                  <Button 
                    onClick={handleRunSimulation} 
                    disabled={simulating || myLoading || globalLoading}
                    className="w-full"
                    size="lg"
                  >
                    {simulating ? 'Simulating...' : 'Run Backtest'}
                  </Button>
                </div>
              </div>
              {simulatedMyTrades.length > 0 && (
                <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-sm text-success font-medium">
                    ✓ Simulation complete - Displaying real market results with {positionSize.toFixed(2)} lots @ {leverage}x leverage
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="my-setups" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="my-setups">My Trade Setups</TabsTrigger>
              <TabsTrigger value="global">Global AlphaLens Data</TabsTrigger>
            </TabsList>
            
            <TabsContent value="my-setups" className="space-y-6 mt-6">
              {myLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-96 w-full" />
                </div>
              ) : (
                <>
                  <BacktesterSummary stats={myStats} />
                  <BacktesterChartPanel data={myTradeSetups} />
                  
                  {/* Trade Visualization Panel */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Trade Visualization</CardTitle>
                        <InstrumentSelector
                          instruments={uniqueInstruments}
                          selectedInstrument={selectedInstrument}
                          onSelect={setSelectedInstrument}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedInstrument ? (
                        <div className="space-y-4">
                          <TradeChartPanel
                            instrument={selectedInstrument}
                            trades={filteredTrades}
                            priceData={priceData}
                          />
                          <div>
                            <h4 className="font-semibold mb-3">Trades for {selectedInstrument}</h4>
                            <BacktesterTable trades={filteredTrades} />
                          </div>
                        </div>
                      ) : (
                        <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
                          <p className="text-muted-foreground">Select an instrument to view detailed chart with trade pins</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <BacktesterInsights data={myTradeSetups} />
                </>
              )}
            </TabsContent>
            
            <TabsContent value="global" className="space-y-6 mt-6">
              {globalLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-96 w-full" />
                </div>
              ) : (
                <>
                  <BacktesterSummary stats={globalStats} />
                  <BacktesterChartPanel data={globalTradeSetups} />
                  
                  {/* Trade Visualization Panel */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Trade Visualization</CardTitle>
                        <InstrumentSelector
                          instruments={uniqueInstruments}
                          selectedInstrument={selectedInstrument}
                          onSelect={setSelectedInstrument}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedInstrument ? (
                        <div className="space-y-4">
                          <TradeChartPanel
                            instrument={selectedInstrument}
                            trades={filteredTrades}
                            priceData={priceData}
                          />
                          <div>
                            <h4 className="font-semibold mb-3">Trades for {selectedInstrument}</h4>
                            <BacktesterTable trades={filteredTrades} />
                          </div>
                        </div>
                      ) : (
                        <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
                          <p className="text-muted-foreground">Select an instrument to view detailed chart with trade pins</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <BacktesterInsights data={globalTradeSetups} />
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
      </div>
    </Layout>
  );
}

export default function Backtester() {
  return (
    <SuperUserGuard
      fallback={
        <Layout>
          <LabsComingSoon 
            title="AlphaLens Backtester"
            description="Backtest AI-generated trade setups across any chosen period. Analyze all AlphaLens trade ideas historically produced across the entire user base, or focus on your own setups."
          />
        </Layout>
      }
    >
      <BacktesterContent />
    </SuperUserGuard>
  );
}
