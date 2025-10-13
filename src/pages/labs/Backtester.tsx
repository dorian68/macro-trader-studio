import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { SuperUserGuard } from '@/components/SuperUserGuard';
import { LabsComingSoon } from '@/components/labs/LabsComingSoon';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BacktesterSummary } from '@/components/backtester/BacktesterSummary';
import { BacktesterChartPanel } from '@/components/backtester/BacktesterChartPanel';
import { BacktesterTable } from '@/components/backtester/BacktesterTable';
import { BacktesterInsights } from '@/components/backtester/BacktesterInsights';
import { calculateStats } from '@/data/mockBacktesterData';
import { useBacktesterData } from '@/hooks/useBacktesterData';
import { Skeleton } from '@/components/ui/skeleton';
import AURA from '@/components/AURA';

function BacktesterContent() {
  const [isAURAExpanded, setIsAURAExpanded] = useState(false);
  
  // Fetch real data
  const { data: myTradeSetups, loading: myLoading } = useBacktesterData({ mode: 'my-setups' });
  const { data: globalTradeSetups, loading: globalLoading } = useBacktesterData({ mode: 'global' });

  // Calculate stats for both datasets
  const myStats = useMemo(() => calculateStats(myTradeSetups), [myTradeSetups]);
  const globalStats = useMemo(() => calculateStats(globalTradeSetups), [globalTradeSetups]);

  return (
    <Layout>
      <div className={`flex h-full relative transition-all ${isAURAExpanded ? 'md:mr-[33.333%]' : ''}`}>
        <div className="flex-1 container-wrapper py-8 px-4 space-y-6">
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
                  <BacktesterTable trades={myTradeSetups} />
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
                  <BacktesterTable trades={globalTradeSetups} />
                  <BacktesterInsights data={globalTradeSetups} />
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* AURA Assistant */}
        <AURA
          context="Backtester"
          isExpanded={isAURAExpanded}
          onToggle={() => setIsAURAExpanded(!isAURAExpanded)}
        />
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
