import Layout from '@/components/Layout';
import { SuperUserGuard } from '@/components/SuperUserGuard';
import { LabsComingSoon } from '@/components/labs/LabsComingSoon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Play } from 'lucide-react';

function BacktesterContent() {
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
          
          <TabsContent value="my-setups" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Cumulative PnL Simulation (Mock Data)</CardTitle>
                <CardDescription>
                  Historical performance of your AI-generated trade setups
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-12 flex items-center justify-center">
                  <BarChart3 className="h-24 w-24 text-muted-foreground" />
                </div>
                <Button className="w-full gap-2" disabled>
                  <Play className="h-4 w-4" />
                  Run Historical Simulation (coming soon)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="global" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Global AlphaLens Performance</CardTitle>
                <CardDescription>
                  Aggregate performance across all users' trade setups
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-12 flex items-center justify-center">
                  <BarChart3 className="h-24 w-24 text-muted-foreground" />
                </div>
                <Button className="w-full gap-2" disabled>
                  <Play className="h-4 w-4" />
                  Run Global Simulation (coming soon)
                </Button>
              </CardContent>
            </Card>
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
