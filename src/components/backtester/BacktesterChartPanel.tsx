import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BacktestTradeSetup } from '@/data/mockBacktesterData';

interface BacktesterChartPanelProps {
  data: BacktestTradeSetup[];
}

export function BacktesterChartPanel({ data }: BacktesterChartPanelProps) {
  const [showAbsolute, setShowAbsolute] = useState(false);

  // Calculate cumulative PnL data
  const cumulativeData = useMemo(() => {
    let cumulative = 0;
    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(trade => {
        cumulative += trade.pnl_percent;
        return {
          date: new Date(trade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          pnl: cumulative,
          tradeCount: 1,
        };
      });
  }, [data]);

  // Calculate win/loss distribution
  const distributionData = useMemo(() => {
    const wins = data.filter(t => t.status === 'TP Hit').length;
    const losses = data.filter(t => t.status === 'SL Hit').length;
    const total = wins + losses;

    return [
      { name: 'Wins', value: wins, percentage: total > 0 ? (wins / total) * 100 : 0 },
      { name: 'Losses', value: losses, percentage: total > 0 ? (losses / total) * 100 : 0 },
    ];
  }, [data]);

  const COLORS = {
    wins: 'hsl(var(--success))',
    losses: 'hsl(var(--destructive))',
    line: 'hsl(var(--primary))',
  };

  const winRate = distributionData[0].percentage;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Cumulative PnL Chart */}
      <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cumulative PnL Curve</CardTitle>
              <CardDescription>Historical performance over time</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAbsolute(!showAbsolute)}
            >
              {showAbsolute ? 'Absolute' : '% Return'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={cumulativeData}>
              <defs>
                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.line} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.line} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Line
                type="monotone"
                dataKey="pnl"
                stroke={COLORS.line}
                strokeWidth={2}
                dot={{ fill: COLORS.line, r: 3 }}
                activeDot={{ r: 5 }}
                fill="url(#colorPnl)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Win/Loss Distribution */}
      <Card className="animate-fade-in" style={{ animationDelay: '500ms' }}>
        <CardHeader>
          <CardTitle>Win/Loss Distribution</CardTitle>
          <CardDescription>Performance breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill={COLORS.wins} />
                <Cell fill={COLORS.losses} />
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">Overall Win Rate</p>
            <p className="text-2xl font-bold text-primary">{winRate.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
