import { useState } from 'react';
import Layout from '@/components/Layout';
import PNLCalculator from '@/components/PNLCalculator';
import PortfolioAnalysis from '@/components/PortfolioAnalysis';
import AICoPilot from '@/components/AICoPilot';
import { mockTrades } from '@/data/mockPortfolio';
import { Calculator } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
export default function PNLCalculatorPage() {
  const [isCoPilotExpanded, setIsCoPilotExpanded] = useState(false);
  return <Layout>
      <div className="flex h-full relative">
        {/* Main Content */}
        <div className={cn('flex-1 transition-all duration-300', isCoPilotExpanded ? 'md:mr-[33.333%]' : 'mr-0')}>
          <div className="container-wrapper space-y-6">
            {/* Page Header */}
            <header className="space-y-2">
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
            </header>

            {/* Tabs: Calculator vs Portfolio Analysis */}
            <Tabs defaultValue="calculator" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="calculator">PNL Calculator</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="calculator" className="space-y-6">
                {/* Calculator Component */}
                <div className="max-w-2xl">
                  <PNLCalculator defaultInstrument="EUR/USD" showInstrumentPicker={true} />
                </div>

                {/* Educational Info */}
                
              </TabsContent>

              <TabsContent value="portfolio">
                <PortfolioAnalysis trades={mockTrades} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* AI Co-Pilot Panel */}
        <AICoPilot trades={mockTrades} isExpanded={isCoPilotExpanded} onToggle={() => setIsCoPilotExpanded(!isCoPilotExpanded)} />
      </div>
    </Layout>;
}