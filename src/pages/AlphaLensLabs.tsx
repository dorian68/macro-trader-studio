import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import AURA from '@/components/AURA';
import { Beaker, Target, Sparkles, Globe, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockTrades, MockTrade } from '@/data/mockPortfolio';
import { cn } from '@/lib/utils';
import { SuperUserGuard } from '@/components/SuperUserGuard';
import { LabsComingSoon } from '@/components/labs/LabsComingSoon';

function AlphaLensLabsContent() {
  const navigate = useNavigate();
  const [isAURAExpanded, setIsAURAExpanded] = useState(false);


  const labsTools = [
    {
      id: 'portfolio-analytics',
      name: 'Portfolio Analytics Suite',
      description: 'Comprehensive portfolio analysis and PNL calculation tools with AI-powered insights',
      icon: TrendingUp,
      status: 'active' as const,
      badge: '🧠 AI-Powered',
      action: () => navigate('/portfolio-analytics')
    },
    {
      id: 'alpha-scenario-simulator',
      name: 'Alpha Scenario Simulator',
      description: 'Simulate macroeconomic scenarios such as rate hikes, recessions, or oil shocks, and visualize their impact on your portfolio. Powered by AI-driven sensitivity analysis.',
      icon: Globe,
      status: 'coming-soon' as const,
      badge: '🧠 AI-Powered',
      requiresSuperUser: true,
      action: () => navigate('/labs/scenario-simulator')
    },
    {
      id: 'alphalens-backtester',
      name: 'AlphaLens Backtester',
      description: 'Backtest AI-generated trade setups across any chosen period. Analyze all AlphaLens trade ideas historically produced across the entire user base, or focus on your own setups.',
      icon: Sparkles,
      status: 'coming-soon' as const,
      badge: '🧠 AI-Powered',
      modes: ['My Trade Setups', 'Global AlphaLens Data'],
      requiresSuperUser: true,
      action: () => navigate('/labs/backtester')
    }
  ];

  return (
    <Layout>
      <div className="flex h-full relative">
        {/* Main Content */}
        <div className={`flex-1 transition-all duration-300 ${isAURAExpanded ? 'md:mr-[33.333%]' : 'mr-0'}`}>
          <div className="container-wrapper space-y-6 sm:space-y-8 flex flex-col items-center min-h-screen py-6 sm:py-8 px-4">
            
            {/* Hero Section */}
            <header className="space-y-4 w-full max-w-6xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl shrink-0">
                  <Beaker className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    AlphaLens Labs
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2">
                    Experiment, Analyze, and Evolve Your Market Intelligence — Your AI workspace for portfolio analytics, scenario simulation, and backtesting.
                  </p>
                </div>
              </div>
            </header>

            {/* AI Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
              {labsTools.map((tool) => {
                const isActive = tool.status === 'active';
                
                return (
                  <Card 
                    key={tool.id} 
                    className={`group transition-all ${isActive ? 'hover:shadow-lg cursor-pointer' : 'hover:shadow-md cursor-pointer opacity-90 hover:opacity-100'}`}
                    onClick={tool.action}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {tool.badge}
                        </Badge>
                        {isActive && <Badge variant="outline">Active</Badge>}
                      </div>
                      <CardTitle className="flex items-center gap-2">
                        <tool.icon className="h-5 w-5 text-primary" />
                        {tool.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    
                    {tool.modes && (
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {tool.modes.map(mode => (
                            <Badge key={mode} variant="outline" className="text-xs">
                              {mode}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    )}
                    
                    <CardFooter>
                      <Button 
                        variant={isActive ? "default" : "outline"} 
                        className="w-full gap-2"
                      >
                        {isActive ? 'Launch Tool' : 'Coming Soon'}
                        {!isActive && <Sparkles className="h-4 w-4" />}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* AURA Assistant */}
        <AURA
          context="AlphaLens Labs"
          isExpanded={isAURAExpanded}
          onToggle={() => setIsAURAExpanded(!isAURAExpanded)}
        />
      </div>
    </Layout>
  );
}

export default function AlphaLensLabs() {
  return (
    <SuperUserGuard 
      fallback={
        <Layout>
          <LabsComingSoon 
            title="AlphaLens Labs" 
            description="This experimental workspace is currently in private beta and reserved for selected users."
          />
        </Layout>
      }
    >
      <AlphaLensLabsContent />
    </SuperUserGuard>
  );
}
