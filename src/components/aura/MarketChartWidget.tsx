import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, LineSeries, AreaSeries, CandlestickData, LineData, AreaData, Time } from 'lightweight-charts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ChartStats {
  netProfit?: number | string;
  winRate?: number | string;
  maxDrawdown?: number | string;
  profitFactor?: number | string;
  trades?: number | string;
}

interface MarketChartData {
  ohlc?: Array<{ time: string; open: number; high: number; low: number; close: number }>;
  equity_curve?: Array<{ time: string; value: number }>;
  predictions?: Array<{ time: string; value: number }>;
  markers?: Array<{ time: string; position: string; color: string; shape: string; text: string }>;
  stats?: ChartStats;
}

interface MarketChartWidgetProps {
  data: MarketChartData;
  instrument?: string;
  timeframe?: string;
  className?: string;
  fullscreen?: boolean;
}

const MarketChartWidgetInner: React.FC<MarketChartWidgetProps> = ({ data, instrument, timeframe, className, fullscreen = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine chart mode
  const mode = data.ohlc?.length ? 'candlestick' : data.equity_curve?.length ? 'area' : data.predictions?.length ? 'line' : null;

  useEffect(() => {
    if (!containerRef.current || !mode) {
      setLoading(false);
      return;
    }

    const chartHeight = fullscreen ? 400 : 250;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#12141c' },
        textColor: '#9ca3af',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(255,255,255,0.15)', width: 1, style: 2 },
        horzLine: { color: 'rgba(255,255,255,0.15)', width: 1, style: 2 },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: true },
    });

    chartRef.current = chart;

    if (mode === 'candlestick' && data.ohlc) {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e',
      });
      const sorted = [...data.ohlc].sort((a, b) => a.time.localeCompare(b.time));
      series.setData(sorted as CandlestickData<Time>[]);
      seriesRef.current = series;
    } else if (mode === 'area' && data.equity_curve) {
      const series = chart.addSeries(AreaSeries, {
        topColor: 'rgba(34, 197, 94, 0.4)',
        bottomColor: 'rgba(34, 197, 94, 0.02)',
        lineColor: '#22c55e',
        lineWidth: 2,
      });
      const sorted = [...data.equity_curve].sort((a, b) => a.time.localeCompare(b.time));
      series.setData(sorted as AreaData<Time>[]);
      seriesRef.current = series;
    } else if (mode === 'line' && data.predictions) {
      const series = chart.addSeries(LineSeries, {
        color: '#f97316',
        lineWidth: 2,
      });
      const sorted = [...data.predictions].sort((a, b) => a.time.localeCompare(b.time));
      series.setData(sorted as LineData<Time>[]);
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();
    setLoading(false);

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mode) return null;

  const stats = data.stats;

  return (
    <div className={cn('rounded-2xl bg-[#12141c] border border-white/5 overflow-hidden mt-3', className)}>
      {/* Header */}
      {(instrument || timeframe) && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
          {instrument && <span className="text-sm font-semibold text-white">{instrument}</span>}
          {timeframe && <span className="text-xs text-muted-foreground">({timeframe})</span>}
          <span className="text-xs text-muted-foreground ml-auto capitalize">{mode}</span>
        </div>
      )}

      {/* Chart */}
      <div className="relative">
        {loading && <Skeleton className="absolute inset-0 bg-white/5" />}
        <div ref={containerRef} />
      </div>

      {/* Stats Footer */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 px-4 py-2.5 border-t border-white/5 text-xs">
          {stats.netProfit != null && (
            <div>
              <span className="text-muted-foreground">Net Profit</span>
              <p className="font-mono font-semibold text-white">{stats.netProfit}</p>
            </div>
          )}
          {stats.winRate != null && (
            <div>
              <span className="text-muted-foreground">Win Rate</span>
              <p className="font-mono font-semibold text-white">{stats.winRate}%</p>
            </div>
          )}
          {stats.maxDrawdown != null && (
            <div>
              <span className="text-muted-foreground">Max DD</span>
              <p className="font-mono font-semibold text-destructive">{stats.maxDrawdown}</p>
            </div>
          )}
          {stats.profitFactor != null && (
            <div>
              <span className="text-muted-foreground">Profit Factor</span>
              <p className="font-mono font-semibold text-white">{stats.profitFactor}</p>
            </div>
          )}
          {stats.trades != null && (
            <div>
              <span className="text-muted-foreground">Trades</span>
              <p className="font-mono font-semibold text-white">{stats.trades}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const MarketChartWidget = React.memo(MarketChartWidgetInner);
