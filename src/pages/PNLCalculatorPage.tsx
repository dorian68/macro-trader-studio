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
          <div className="container-wrapper space-y-4 sm:space-y-6 flex flex-col items-center justify-center min-h-screen py-4 sm:py-8 px-4">
            {/* Page Header - PATCH: Improved mobile responsive */}
            <header className="space-y-3 sm:space-y-4 w-full max-w-4xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Risk Management & Portfolio Analysis</h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Calculate position size, analyze your portfolio, and get AI-powered insights
                  </p>
                </div>
              </div>
              
              {/* Portfolio Selector - PATCH: Mobile optimized */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-sm sm:text-base">Select Portfolio</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Choose a portfolio to analyze or use the demo data
                  </p>
                </div>
                <div className="w-full sm:w-auto">
                  <PortfolioSelector
                    selectedId={selectedPortfolioId}
                    onSelect={setSelectedPortfolioId}
                  />
                </div>
              </div>
            </header>

            {/* Tabs: Calculator vs Portfolio Analysis - PATCH: Mobile optimized */}
            <Tabs defaultValue="calculator" className="space-y-4 sm:space-y-6 w-full max-w-4xl">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-auto">
                <TabsTrigger value="calculator" className="text-xs sm:text-sm py-2 sm:py-2.5">
                  PNL Calculator
                </TabsTrigger>
                <TabsTrigger value="portfolio" className="text-xs sm:text-sm py-2 sm:py-2.5">
                  Portfolio Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="calculator" className="space-y-4 sm:space-y-6">
                {/* Calculator Component - PATCH: Full width on mobile */}
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