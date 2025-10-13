import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { BacktestTradeSetup } from '@/data/mockBacktesterData';

interface UseBacktesterDataOptions {
  mode: 'my-setups' | 'global';
  limit?: number;
}

export function useBacktesterData({ mode, limit = 500 }: UseBacktesterDataOptions) {
  const { user } = useAuth();
  const [data, setData] = useState<BacktestTradeSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('ai_trade_setups')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        // Filter by user for "my-setups" mode
        if (mode === 'my-setups') {
          query = query.eq('user_id', user.id);
        }

        const { data: setups, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        // Transform to BacktestTradeSetup format
        const transformed: BacktestTradeSetup[] = (setups || []).map(setup => ({
          id: setup.id,
          date: new Date(setup.created_at).toISOString().split('T')[0],
          instrument: setup.instrument,
          direction: setup.direction as 'Long' | 'Short',
          entry: Number(setup.entry_price),
          tp: setup.take_profit_1 ? Number(setup.take_profit_1) : 0,
          sl: setup.stop_loss ? Number(setup.stop_loss) : 0,
          status: setup.outcome === 'tp_hit' ? 'TP Hit' : 
                  setup.outcome === 'sl_hit' ? 'SL Hit' : 'Open',
          pnl_percent: calculatePnL(setup),
          confidence: setup.confidence || 0,
          user_id: setup.user_id
        }));

        setData(transformed);
      } catch (err) {
        console.error('Error fetching backtester data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, mode, limit]);

  return { data, loading, error };
}

// Helper: Calculate PnL based on entry/tp/sl and outcome
function calculatePnL(setup: any): number {
  if (!setup.entry_price || (!setup.take_profit_1 && !setup.stop_loss)) return 0;
  
  const entry = Number(setup.entry_price);
  const tp = setup.take_profit_1 ? Number(setup.take_profit_1) : 0;
  const sl = setup.stop_loss ? Number(setup.stop_loss) : 0;
  const direction = setup.direction === 'Long' ? 1 : -1;
  
  if (setup.outcome === 'tp_hit' && tp > 0) {
    return direction * ((tp - entry) / entry) * 100;
  } else if (setup.outcome === 'sl_hit' && sl > 0) {
    return direction * ((sl - entry) / entry) * 100;
  }
  
  return 0; // Open position
}
