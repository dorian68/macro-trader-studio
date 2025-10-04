import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import PNLCalculator from '@/components/PNLCalculator';
import PortfolioAnalysis from '@/components/PortfolioAnalysis';
import AICoPilot from '@/components/AICoPilot';
import PortfolioSelector from '@/components/PortfolioSelector';
import { mockTrades, MockTrade } from '@/data/mockPortfolio';
import { supabase } from '@/integrations/supabase/client';
import { Calculator } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
export default function PNLCalculatorPage() {
  const [isCoPilotExpanded, setIsCoPilotExpanded] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [trades, setTrades] = useState<MockTrade[]>(mockTrades);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPortfolioId) {
      fetchPortfolioPositions(selectedPortfolioId);
    } else {
      setTrades(mockTrades);
    }
  }, [selectedPortfolioId]);

  const fetchPortfolioPositions = async (portfolioId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map positions to MockTrade format
      const mappedTrades: MockTrade[] = (data || []).map((position, index) => {
        const pnl = position.market_value || 0;
        const entry = position.average_price || 0;
        const exit = position.current_price || entry;
        const direction = pnl >= 0 ? 'long' : 'short';

        return {
          id: position.id,
          instrument: position.symbol,
          size: position.quantity || 1,
          direction: direction as 'long' | 'short',
          entry,
          exit,
          pnl,
          duration: '1d',
          timestamp: new Date(position.created_at).toISOString(),
          leverage: 1,
        };
      });

      setTrades(mappedTrades);
    } catch (error) {
      console.error('Error fetching portfolio positions:', error);
      setTrades(mockTrades);
    } finally {
      setLoading(false);
    }
  };
  return <Layout>
      <div className="flex h-full relative">
        {/* Main Content */}
        <div className={cn('flex-1 transition-all duration-300', isCoPilotExpanded ? 'md:mr-[33.333%]' : 'mr-0')}>
          <div className="container-wrapper space-y-6 flex flex-col items-center justify-center min-h-screen py-8">
            {/* Page Header */}
            <header className="space-y-4 w-full max-w-4xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Risk Management & Portfolio Analysis</h1>
                  <p className="text-muted-foreground">
                    Calculate position size, analyze your portfolio, and get AI-powered insights
                  </p>
                </div>
              </div>
              
              {/* Portfolio Selector */}
              <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
                <div>
                  <h3 className="font-medium">Select Portfolio</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a portfolio to analyze or use the demo data
                  </p>
                </div>
                <PortfolioSelector
                  selectedId={selectedPortfolioId}
                  onSelect={setSelectedPortfolioId}
                />
              </div>
            </header>

            {/* Tabs: Calculator vs Portfolio Analysis */}
            <Tabs defaultValue="calculator" className="space-y-6 w-full max-w-4xl">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                <TabsTrigger value="calculator">PNL Calculator</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="calculator" className="space-y-6">
                {/* Calculator Component */}
                <div className="w-full max-w-2xl mx-auto">
                  <PNLCalculator defaultInstrument="EUR/USD" showInstrumentPicker={true} />
                </div>

                {/* Educational Info */}
                
              </TabsContent>

              <TabsContent value="portfolio">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading portfolio data...
                  </div>
                ) : (
                  <PortfolioAnalysis trades={trades} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* AI Co-Pilot Panel */}
        <AICoPilot trades={trades} isExpanded={isCoPilotExpanded} onToggle={() => setIsCoPilotExpanded(!isCoPilotExpanded)} />
      </div>
    </Layout>;
}