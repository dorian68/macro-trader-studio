import { useMemo } from 'react';
import Layout from '@/components/Layout';
import { SuperUserGuard } from '@/components/SuperUserGuard';
import { LabsComingSoon } from '@/components/labs/LabsComingSoon';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BacktesterSummary } from '@/components/backtester/BacktesterSummary';
import { BacktesterChartPanel } from '@/components/backtester/BacktesterChartPanel';
import { BacktesterTable } from '@/components/backtester/BacktesterTable';
import { BacktesterInsights } from '@/components/backtester/BacktesterInsights';
import { myTradeSetups, globalTradeSetups, calculateStats } from '@/data/mockBacktesterData';

function BacktesterContent() {
  // Calculate stats for both datasets
  const myStats = useMemo(() => calculateStats(myTradeSetups), []);
  const globalStats = useMemo(() => calculateStats(globalTradeSetups), []);

  return (
    <Layout>
      <div className="container-wrapper py-8 px-4 space-y-6">
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

        {/* Tabs */}
        <Tabs defaultValue="my-setups" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="my-setups">My Trade Setups</TabsTrigger>
            <TabsTrigger value="global">Global AlphaLens Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-setups" className="space-y-6 mt-6">
            <BacktesterSummary stats={myStats} />
            <BacktesterChartPanel data={myTradeSetups} />
            <BacktesterTable trades={myTradeSetups} />
            <BacktesterInsights data={myTradeSetups} />
          </TabsContent>
          
          <TabsContent value="global" className="space-y-6 mt-6">
            <BacktesterSummary stats={globalStats} />
            <BacktesterChartPanel data={globalTradeSetups} />
            <BacktesterTable trades={globalTradeSetups} />
            <BacktesterInsights data={globalTradeSetups} />
          </TabsContent>
        </Tabs>
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
