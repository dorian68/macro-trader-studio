import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import AICoPilot from '@/components/AICoPilot';
import { Beaker, Target, Sparkles, Globe, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockTrades, MockTrade } from '@/data/mockPortfolio';
import { cn } from '@/lib/utils';

export default function AlphaLensLabs() {
  const navigate = useNavigate();
  const [isCoPilotExpanded, setIsCoPilotExpanded] = useState(false);
  const [trades] = useState<MockTrade[]>(mockTrades);


  const upcomingTools = [
    {
      id: 'risk-profiler',
      name: 'Smart Risk Profiler',
      description: 'AI-powered portfolio risk assessment with real-time adjustments',
      icon: Target,
      status: 'Coming Soon',
      estimatedLaunch: 'Q1 2025'
    },
    {
      id: 'alpha-generator',
      name: 'Alpha Generator',
      description: 'Machine learning models to identify trading opportunities',
      icon: Sparkles,
      status: 'Beta 2025',
      estimatedLaunch: 'Q2 2025'
    },
    {
      id: 'macro-simulator',
      name: 'Macro Scenario Simulator',
      description: 'Test portfolio resilience under various economic scenarios',
      icon: Globe,
      status: 'Under Development',
      estimatedLaunch: 'Q3 2025'
    }
  ];

  return (
    <Layout>
      <div className="flex h-full relative">
        {/* Main Content */}
        <div className={cn('flex-1 transition-all duration-300', isCoPilotExpanded ? 'md:mr-[33.333%]' : 'mr-0')}>
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
                    Welcome to AlphaLens Labs — your AI workspace for market intelligence, portfolio analytics, and experimental tools.
                  </p>
                </div>
              </div>
            </header>

            {/* AI Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
              
              {/* Active Tool 1: Portfolio Analytics Suite */}
              <Card className="group hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Portfolio Analytics Suite
                    </CardTitle>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <CardDescription>
                    Comprehensive portfolio analysis and PNL calculation tools with AI-powered insights
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => navigate('/portfolio-analytics')}
                  >
                    View Tools
                  </Button>
                </CardContent>
              </Card>

              {/* Upcoming Tools */}
              {upcomingTools.map((tool) => (
                <Card 
                  key={tool.id} 
                  className="relative overflow-hidden opacity-60 cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-transparent pointer-events-none" />
                  <CardHeader>
                    <Badge variant="outline" className="w-fit mb-2">{tool.status}</Badge>
                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                      <tool.icon className="h-5 w-5" />
                      {tool.name}
                    </CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <p className="text-xs text-muted-foreground">
                      Estimated: {tool.estimatedLaunch}
                    </p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* AI Co-Pilot Panel */}
        <AICoPilot 
          trades={trades} 
          isExpanded={isCoPilotExpanded} 
          onToggle={() => setIsCoPilotExpanded(!isCoPilotExpanded)} 
        />
      </div>
    </Layout>
  );
}
