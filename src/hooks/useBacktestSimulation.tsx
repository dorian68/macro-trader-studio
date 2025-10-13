import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BacktestTradeSetup } from '@/data/mockBacktesterData';
import { getInstrumentType } from '@/services/marketDataService';
import { useToast } from '@/hooks/use-toast';

export interface SimulatedTrade extends BacktestTradeSetup {
  simulated?: boolean;
  simulated_outcome?: 'tp_hit' | 'sl_hit' | 'open' | 'insufficient_data' | 'not_supported';
  hit_date?: string;
  hit_price?: number;
  simulated_pnl_usd?: number;
  simulated_pnl_percent?: number;
  bars_to_resolution?: number;
}

interface SimulationParams {
  trades: BacktestTradeSetup[];
  positionSize: number;
  leverage: number;
  extendDays?: number;
}

interface SimulationStats {
  totalPnL: number;
  winRate: number;
  avgWinPnL: number;
  avgLossPnL: number;
  profitFactor: number;
  maxDrawdown: number;
}

export function useBacktestSimulation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const runSimulation = async ({
    trades,
    positionSize,
    leverage,
    extendDays = 7
  }: SimulationParams): Promise<{
    simulatedTrades: SimulatedTrade[];
    stats: SimulationStats;
  }> => {
    setLoading(true);
    setError(null);

    try {
      if (trades.length === 0) {
        return {
          simulatedTrades: [],
          stats: { totalPnL: 0, winRate: 0, avgWinPnL: 0, avgLossPnL: 0, profitFactor: 0, maxDrawdown: 0 }
        };
      }

      // Group trades by instrument to minimize API calls
      const tradesByInstrument = trades.reduce((acc, trade) => {
        if (!acc[trade.instrument]) {
          acc[trade.instrument] = [];
        }
        acc[trade.instrument].push(trade);
        return acc;
      }, {} as Record<string, BacktestTradeSetup[]>);

      const simulatedTrades: SimulatedTrade[] = [];

      // Process each instrument
      for (const [instrument, instrumentTrades] of Object.entries(tradesByInstrument)) {
        // Calculate date range for this instrument
        const dates = instrumentTrades.map(t => new Date(t.date));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

        // Fetch historical prices
        const { data: priceData, error: priceError } = await supabase.functions.invoke('fetch-historical-prices', {
          body: {
            instrument,
            startDate: minDate.toISOString().split('T')[0],
            endDate: maxDate.toISOString().split('T')[0],
            interval: '1day',
            extendDays
          }
        });

        // Check if instrument is not supported
        if (priceData?.error === 'not_supported') {
          console.warn(`Instrument ${instrument} not supported by TwelveData`);
          instrumentTrades.forEach(trade => {
            simulatedTrades.push({
              ...trade,
              simulated: true,
              simulated_outcome: 'not_supported',
              simulated_pnl_usd: 0,
              simulated_pnl_percent: 0
            });
          });
          continue;
        }

        if (priceError || !priceData || !priceData.data || priceData.data.length === 0) {
          console.error(`No price data for ${instrument}:`, priceError || priceData?.error);
          toast({
            title: `No data for ${instrument}`,
            description: priceData?.error || 'Instrument may not be supported by TwelveData',
            variant: 'destructive',
          });
          // Mark trades as insufficient data
          instrumentTrades.forEach(trade => {
            simulatedTrades.push({
              ...trade,
              simulated: true,
              simulated_outcome: 'insufficient_data',
              simulated_pnl_usd: 0,
              simulated_pnl_percent: 0
            });
          });
          continue;
        }

        const prices = priceData.data as Array<{
          date: string;
          open: number;
          high: number;
          low: number;
          close: number;
        }>;

        // Sort prices by date
        prices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Simulate each trade
        for (const trade of instrumentTrades) {
          const tradeDate = new Date(trade.date);
          const futurePrice = prices.filter(p => new Date(p.date) >= tradeDate);

          if (futurePrice.length === 0) {
            simulatedTrades.push({
              ...trade,
              simulated: true,
              simulated_outcome: 'open',
              simulated_pnl_usd: 0,
              simulated_pnl_percent: 0
            });
            continue;
          }

          // Simulate bar-by-bar
          let outcome: 'tp_hit' | 'sl_hit' | 'open' = 'open';
          let hitDate: string | undefined;
          let hitPrice: number | undefined;
          let barsToResolution = 0;

          for (const bar of futurePrice) {
            barsToResolution++;

            if (trade.direction === 'Long') {
              // Check SL first (worst case)
              if (trade.sl > 0 && bar.low <= trade.sl) {
                outcome = 'sl_hit';
                hitDate = bar.date;
                hitPrice = trade.sl;
                break;
              }
              // Then check TP
              if (trade.tp > 0 && bar.high >= trade.tp) {
                outcome = 'tp_hit';
                hitDate = bar.date;
                hitPrice = trade.tp;
                break;
              }
            } else { // Short
              // Check SL first (worst case)
              if (trade.sl > 0 && bar.high >= trade.sl) {
                outcome = 'sl_hit';
                hitDate = bar.date;
                hitPrice = trade.sl;
                break;
              }
              // Then check TP
              if (trade.tp > 0 && bar.low <= trade.tp) {
                outcome = 'tp_hit';
                hitDate = bar.date;
                hitPrice = trade.tp;
                break;
              }
            }
          }

          // Calculate PnL using same logic as PNLCalculator
          const instrumentType = getInstrumentType(instrument);
          const isGold = instrument.toUpperCase().includes('GOLD') || instrument.toUpperCase() === 'XAUUSD';
          const isFX = !isGold && instrumentType === 'fx';

          let pnlUSD = 0;
          let pnlPercent = 0;

          if (outcome !== 'open' && hitPrice) {
            const priceChange = hitPrice - trade.entry;
            const changeInPips = isFX 
              ? (instrument.includes('JPY') ? priceChange * 100 : priceChange * 10000)
              : priceChange;

            if (isFX) {
              const pipValueUSD = (positionSize * 100000 * (instrument.includes('JPY') ? 0.01 : 0.0001));
              pnlUSD = changeInPips * pipValueUSD * (trade.direction === 'Long' ? 1 : -1);
            } else {
              pnlUSD = positionSize * priceChange * (trade.direction === 'Long' ? 1 : -1);
            }

            // Calculate margin and PnL%
            const margin = isFX
              ? (positionSize * 100000 * trade.entry) / leverage
              : (positionSize * trade.entry) / leverage;

            pnlPercent = margin > 0 ? (pnlUSD / margin) * 100 : 0;
          }

          simulatedTrades.push({
            ...trade,
            simulated: true,
            simulated_outcome: outcome,
            hit_date: hitDate,
            hit_price: hitPrice,
            simulated_pnl_usd: pnlUSD,
            simulated_pnl_percent: pnlPercent,
            bars_to_resolution: barsToResolution
          });
        }
      }

      // Calculate stats
      const resolvedTrades = simulatedTrades.filter(t => t.simulated_outcome === 'tp_hit' || t.simulated_outcome === 'sl_hit');
      const winners = simulatedTrades.filter(t => t.simulated_outcome === 'tp_hit');
      const losers = simulatedTrades.filter(t => t.simulated_outcome === 'sl_hit');

      const totalPnL = simulatedTrades.reduce((sum, t) => sum + (t.simulated_pnl_usd || 0), 0);
      const winRate = resolvedTrades.length > 0 ? (winners.length / resolvedTrades.length) * 100 : 0;
      const avgWinPnL = winners.length > 0 
        ? winners.reduce((sum, t) => sum + (t.simulated_pnl_usd || 0), 0) / winners.length 
        : 0;
      const avgLossPnL = losers.length > 0 
        ? Math.abs(losers.reduce((sum, t) => sum + (t.simulated_pnl_usd || 0), 0) / losers.length)
        : 0;
      const profitFactor = avgLossPnL > 0 ? avgWinPnL / avgLossPnL : 0;

      // Calculate max drawdown
      let peak = 0;
      let maxDrawdown = 0;
      let cumulative = 0;
      
      simulatedTrades.forEach(t => {
        cumulative += t.simulated_pnl_usd || 0;
        if (cumulative > peak) peak = cumulative;
        const drawdown = peak - cumulative;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      });

      return {
        simulatedTrades,
        stats: {
          totalPnL,
          winRate,
          avgWinPnL,
          avgLossPnL,
          profitFactor,
          maxDrawdown
        }
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Simulation failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { runSimulation, loading, error };
}
