import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { BacktestTradeSetup } from '@/data/mockBacktesterData';
import { TrendingUp, Target, Lightbulb } from 'lucide-react';

interface BacktesterInsightsProps {
  data: BacktestTradeSetup[];
}

export function BacktesterInsights({ data }: BacktesterInsightsProps) {
  const insights = useMemo(() => {
    // Most profitable instruments
    const instrumentStats = data.reduce((acc, trade) => {
      if (!acc[trade.instrument]) {
        acc[trade.instrument] = { wins: 0, total: 0, totalPnL: 0 };
      }
      acc[trade.instrument].total++;
      if (trade.status === 'TP Hit') acc[trade.instrument].wins++;
      acc[trade.instrument].totalPnL += trade.pnl_percent;
      return acc;
    }, {} as Record<string, { wins: number; total: number; totalPnL: number }>);

    const topInstrument = Object.entries(instrumentStats)
      .map(([instrument, stats]) => ({
        instrument,
        winRate: (stats.wins / stats.total) * 100,
        totalPnL: stats.totalPnL,
      }))
      .sort((a, b) => b.totalPnL - a.totalPnL)[0];

    // Confidence vs outcome correlation
    const highConfidenceTrades = data.filter(t => t.confidence >= 80);
    const highConfidenceWins = highConfidenceTrades.filter(t => t.status === 'TP Hit').length;
    const highConfidenceWinRate = highConfidenceTrades.length > 0
      ? (highConfidenceWins / highConfidenceTrades.length) * 100
      : 0;

    // Direction performance
    const longTrades = data.filter(t => t.direction === 'Long');
    const shortTrades = data.filter(t => t.direction === 'Short');
    const longWinRate = longTrades.length > 0
      ? (longTrades.filter(t => t.status === 'TP Hit').length / longTrades.length) * 100
      : 0;
    const shortWinRate = shortTrades.length > 0
      ? (shortTrades.filter(t => t.status === 'TP Hit').length / shortTrades.length) * 100
      : 0;

    // Generate sparkline data (last 10 trades cumulative PnL)
    const recentTrades = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ).slice(-10);
    
    let cumulative = 0;
    const sparklineData = recentTrades.map(trade => {
      cumulative += trade.pnl_percent;
      return { value: cumulative };
    });

    return {
      topInstrument,
      highConfidenceWinRate,
      longWinRate,
      shortWinRate,
      sparklineData,
    };
  }, [data]);

  const insightCards = [
    {
      icon: TrendingUp,
      title: 'Most Profitable Instruments',
      content: insights.topInstrument
        ? `${insights.topInstrument.instrument}: ${insights.topInstrument.winRate.toFixed(1)}% win rate`
        : 'Analyzing instrument performance...',
      sparkline: insights.sparklineData,
    },
    {
      icon: Target,
      title: 'Confidence vs Outcome',
      content: `High confidence (>80%) trades: ${insights.highConfidenceWinRate.toFixed(1)}% success rate`,
      sparkline: insights.sparklineData,
    },
    {
      icon: Lightbulb,
      title: 'Recurring Patterns',
      content: insights.longWinRate > insights.shortWinRate
        ? `Long setups outperform shorts by ${(insights.longWinRate - insights.shortWinRate).toFixed(1)}%`
        : `Short setups outperform longs by ${(insights.shortWinRate - insights.longWinRate).toFixed(1)}%`,
      sparkline: insights.sparklineData,
    },
  ];

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '700ms' }}>
      <CardHeader>
        <CardTitle>AI Performance Insights</CardTitle>
        <CardDescription>Pattern analysis and key findings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insightCards.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div
                key={index}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <ResponsiveContainer width={60} height={30}>
                    <LineChart data={insight.sparkline}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <h4 className="font-medium text-sm mb-2">{insight.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {insight.content}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
