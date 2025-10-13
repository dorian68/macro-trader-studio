import { useState } from 'react';
import Layout from '@/components/Layout';
import { SuperUserGuard } from '@/components/SuperUserGuard';
import { LabsComingSoon } from '@/components/labs/LabsComingSoon';
import AURA from '@/components/AURA';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const scenarios = [
  {
    id: 'rate-hike',
    name: 'Rate Hike Scenario',
    description: 'Federal Reserve increases rates by 75bps',
    icon: TrendingUp,
    impact: 'negative',
    expectedChange: '-4.2%'
  },
  {
    id: 'oil-shock',
    name: 'Oil Shock Scenario',
    description: 'Crude oil prices surge to $120/barrel',
    icon: TrendingDown,
    impact: 'mixed',
    expectedChange: '-2.8%'
  },
  {
    id: 'recession-2025',
    name: 'US Recession 2025',
    description: 'GDP contraction for 2 consecutive quarters',
    icon: Minus,
    impact: 'negative',
    expectedChange: '-6.5%'
  }
];

function ScenarioSimulatorContent() {
  const [selectedScenario, setSelectedScenario] = useState<typeof scenarios[0] | null>(null);
  const [isAURAExpanded, setIsAURAExpanded] = useState(false);

  return (
    <Layout>
      <div className={`flex h-full relative transition-all ${isAURAExpanded ? 'md:mr-[33.333%]' : ''}`}>
        <div className="flex-1 container-wrapper py-8 px-4 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">🧠 Super Users Only</Badge>
          </div>
          <h1 className="text-3xl font-bold">Alpha Scenario Simulator</h1>
          <p className="text-muted-foreground">
            Model how macro events reshape your portfolio.
          </p>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <Card 
                key={scenario.id}
                className="cursor-pointer hover:shadow-lg transition-all"
                onClick={() => setSelectedScenario(scenario)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <Badge variant={scenario.impact === 'negative' ? 'destructive' : 'secondary'}>
                      {scenario.expectedChange}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{scenario.name}</CardTitle>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Simulate Impact
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Modal */}
        <Dialog open={!!selectedScenario} onOpenChange={() => setSelectedScenario(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedScenario?.name}</DialogTitle>
              <DialogDescription>
                {selectedScenario?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted rounded-lg p-6 text-center">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  🧠 AI simulation engine coming soon — macro impact modelling in progress.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
        
        {/* AURA Assistant */}
        <AURA
          context="Scenario Simulator"
          isExpanded={isAURAExpanded}
          onToggle={() => setIsAURAExpanded(!isAURAExpanded)}
        />
      </div>
    </Layout>
  );
}

export default function ScenarioSimulator() {
  return (
    <SuperUserGuard
      fallback={
        <Layout>
          <LabsComingSoon 
            title="Alpha Scenario Simulator"
            description="Simulate macroeconomic scenarios such as rate hikes, recessions, or oil shocks, and visualize their impact on your portfolio."
          />
        </Layout>
      }
    >
      <ScenarioSimulatorContent />
    </SuperUserGuard>
  );
}
