import { useMemo } from 'react';
import { MockTrade } from '@/data/mockPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Clock, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PortfolioAnalysisProps {
  trades: MockTrade[];
  className?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export default function PortfolioAnalysis({ trades, className }: PortfolioAnalysisProps) {
  const stats = useMemo(() => {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const largestGain = Math.max(...trades.map(t => t.pnl));
    const largestLoss = Math.min(...trades.map(t => t.pnl));
    const winRate = (winningTrades.length / trades.length) * 100;
    
    // Parse duration to hours
    const parseDuration = (duration: string): number => {
      const match = duration.match(/(\d+)([hdm])/);
      if (!match) return 0;
      const value = parseInt(match[1]);
      const unit = match[2];
      if (unit === 'h') return value;
      if (unit === 'd') return value * 24;
      if (unit === 'm') return value / 60;
      return 0;
    };
    
    const avgHoldingTime = trades.reduce((sum, t) => sum + parseDuration(t.duration), 0) / trades.length;
    
    return {
      totalTrades: trades.length,
      winRate: winRate.toFixed(2),
      lossRate: (100 - winRate).toFixed(2),
      totalPnl,
      largestGain,
      largestLoss,
      avgHoldingTime: avgHoldingTime.toFixed(1),
    };
  }, [trades]);

  // PNL curve data
  const pnlCurveData = useMemo(() => {
    return trades
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .reduce((acc, trade, idx) => {
        const prevPnl = idx > 0 ? acc[idx - 1].cumulativePnl : 0;
        acc.push({
          date: new Date(trade.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          cumulativePnl: prevPnl + trade.pnl,
          pnl: trade.pnl,
        });
        return acc;
      }, [] as { date: string; cumulativePnl: number; pnl: number }[]);
  }, [trades]);

  // Instrument distribution
  const instrumentData = useMemo(() => {
    const groups = trades.reduce((acc, trade) => {
      acc[trade.instrument] = (acc[trade.instrument] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(groups).map(([instrument, count]) => ({
      instrument,
      count,
    }));
  }, [trades]);

  // Win/Loss by instrument
  const instrumentPnlData = useMemo(() => {
    const groups = trades.reduce((acc, trade) => {
      if (!acc[trade.instrument]) {
        acc[trade.instrument] = { wins: 0, losses: 0, totalPnl: 0 };
      }
      if (trade.pnl > 0) {
        acc[trade.instrument].wins += 1;
      } else {
        acc[trade.instrument].losses += 1;
      }
      acc[trade.instrument].totalPnl += trade.pnl;
      return acc;
    }, {} as Record<string, { wins: number; losses: number; totalPnl: number }>);
    
    return Object.entries(groups).map(([instrument, data]) => ({
      instrument,
      wins: data.wins,
      losses: data.losses,
      totalPnl: data.totalPnl,
    }));
  }, [trades]);

  // Risk concentration
  const riskConcentration = useMemo(() => {
    return trades
      .filter(t => t.leverage > 50 || Math.abs(t.pnl) > 300)
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 10);
  }, [trades]);

  return (
    <div className={className}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="gradient-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.winRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.lossRate}% loss rate
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Total PNL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${stats.totalPnl.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalTrades} total trades
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Largest Gain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ${stats.largestGain.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Best trade</p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Largest Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              ${stats.largestLoss.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Worst trade</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* PNL Curve */}
        <Card className="gradient-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">PNL Curve Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={pnlCurveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cumulativePnl" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Cumulative PNL"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Instrument Distribution */}
        <Card className="gradient-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Trades by Instrument</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={instrumentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ instrument, percent }) => `${instrument} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {instrumentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Win/Loss by Instrument */}
        <Card className="gradient-card border-primary/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Performance by Instrument</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={instrumentPnlData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="instrument" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="wins" fill="#22c55e" name="Winning Trades" />
                <Bar dataKey="losses" fill="#ef4444" name="Losing Trades" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Concentration Table */}
      <Card className="gradient-card border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Risk Concentration Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            High-leverage or high-impact trades (leverage &gt; 50x or |PNL| &gt; $300)
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instrument</TableHead>
                <TableHead>Size (lots)</TableHead>
                <TableHead>Leverage</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">PNL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riskConcentration.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-medium">{trade.instrument}</TableCell>
                  <TableCell>{trade.size}</TableCell>
                  <TableCell>
                    <span className={trade.leverage > 75 ? 'text-red-500 font-semibold' : ''}>
                      {trade.leverage}x
                    </span>
                  </TableCell>
                  <TableCell>{trade.entry.toFixed(2)}</TableCell>
                  <TableCell>{trade.exit.toFixed(2)}</TableCell>
                  <TableCell>{trade.duration}</TableCell>
                  <TableCell className={`text-right font-semibold ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${trade.pnl.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
