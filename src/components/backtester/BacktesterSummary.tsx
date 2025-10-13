import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Target, Scale, DollarSign } from 'lucide-react';
import { BacktestStats } from '@/data/mockBacktesterData';

interface BacktesterSummaryProps {
  stats: BacktestStats;
}

export function BacktesterSummary({ stats }: BacktesterSummaryProps) {
  const statCards = [
    {
      icon: TrendingUp,
      label: 'Total Trades Tested',
      value: stats.totalTrades.toString(),
      delay: '0ms',
    },
    {
      icon: Target,
      label: 'Average Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      delay: '100ms',
    },
    {
      icon: Scale,
      label: 'Average R/R Ratio',
      value: stats.avgRiskReward.toFixed(2),
      delay: '200ms',
    },
    {
      icon: DollarSign,
      label: 'Cumulative PnL (%)',
      value: `${stats.cumulativePnL >= 0 ? '+' : ''}${stats.cumulativePnL.toFixed(1)}%`,
      delay: '300ms',
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-primary/20 animate-fade-in"
            style={{ animationDelay: stat.delay }}
          >
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-5 w-5 text-primary" />
                {stat.highlight && (
                  <span className="text-xs font-medium text-primary">Live</span>
                )}
              </div>
              <div className="space-y-1">
                <p className={`text-2xl font-bold ${stat.highlight ? 'text-primary' : 'text-foreground'}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
