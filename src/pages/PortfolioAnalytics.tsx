import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import PNLCalculator from '@/components/PNLCalculator';
import PortfolioAnalysis from '@/components/PortfolioAnalysis';
import PortfolioSelector from '@/components/PortfolioSelector';
import { mockTrades, MockTrade } from '@/data/mockPortfolio';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PortfolioAnalytics() {
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

      const mappedTrades: MockTrade[] = (data || []).map((position) => {
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

  return (
    <Layout>
      <div className="container-wrapper space-y-6 py-6 px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  Portfolio Analytics Suite
                </CardTitle>
                <CardDescription className="mt-2">
                  Comprehensive portfolio analysis and PNL calculation tools with AI-powered insights
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Portfolio:</span>
                <PortfolioSelector
                  selectedId={selectedPortfolioId}
                  onSelect={setSelectedPortfolioId}
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="calculator" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                <TabsTrigger value="calculator">PNL Calculator</TabsTrigger>
                <TabsTrigger value="analysis">Portfolio Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="calculator" className="space-y-4 mt-6">
                <div className="w-full max-w-2xl mx-auto">
                  <PNLCalculator defaultInstrument="EUR/USD" showInstrumentPicker={true} />
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="mt-6">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading portfolio data...
                  </div>
                ) : (
                  <PortfolioAnalysis trades={trades} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
