export interface BacktestTradeSetup {
  id: string;
  date: string;
  instrument: string;
  direction: 'Long' | 'Short';
  entry: number;
  tp: number;
  sl: number;
  status: 'TP Hit' | 'SL Hit' | 'Open';
  pnl_percent: number;
  confidence: number;
  user_id?: string;
  // Simulation fields
  simulated?: boolean;
  simulated_outcome?: 'tp_hit' | 'sl_hit' | 'open' | 'insufficient_data' | 'not_supported';
  hit_date?: string;
  hit_price?: number;
  simulated_pnl_usd?: number;
  simulated_pnl_percent?: number;
  bars_to_resolution?: number;
}

export interface BacktestStats {
  totalTrades: number;
  winRate: number;
  avgRiskReward: number;
  cumulativePnL: number;
  avgPnL: number;
  activeTrades: number;
  // Simulation stats
  simulatedTotalPnL?: number;
  profitFactor?: number;
  maxDrawdown?: number;
}

// My trade setups (current user)
export const myTradeSetups: BacktestTradeSetup[] = [
  { id: '1', date: '2025-09-01', instrument: 'EUR/USD', direction: 'Long', entry: 1.0732, tp: 1.0835, sl: 1.0680, status: 'TP Hit', pnl_percent: 0.96, confidence: 87, user_id: 'current' },
  { id: '2', date: '2025-09-03', instrument: 'GBP/USD', direction: 'Short', entry: 1.2845, tp: 1.2750, sl: 1.2900, status: 'TP Hit', pnl_percent: 0.74, confidence: 82, user_id: 'current' },
  { id: '3', date: '2025-09-05', instrument: 'USD/JPY', direction: 'Long', entry: 147.20, tp: 148.50, sl: 146.50, status: 'SL Hit', pnl_percent: -0.48, confidence: 75, user_id: 'current' },
  { id: '4', date: '2025-09-08', instrument: 'EUR/GBP', direction: 'Long', entry: 0.8365, tp: 0.8425, sl: 0.8320, status: 'TP Hit', pnl_percent: 0.72, confidence: 90, user_id: 'current' },
  { id: '5', date: '2025-09-10', instrument: 'AUD/USD', direction: 'Short', entry: 0.6745, tp: 0.6680, sl: 0.6790, status: 'TP Hit', pnl_percent: 0.96, confidence: 85, user_id: 'current' },
  { id: '6', date: '2025-09-12', instrument: 'USD/CAD', direction: 'Long', entry: 1.3520, tp: 1.3620, sl: 1.3460, status: 'SL Hit', pnl_percent: -0.44, confidence: 71, user_id: 'current' },
  { id: '7', date: '2025-09-15', instrument: 'EUR/USD', direction: 'Short', entry: 1.0685, tp: 1.0595, sl: 1.0735, status: 'TP Hit', pnl_percent: 0.84, confidence: 88, user_id: 'current' },
  { id: '8', date: '2025-09-18', instrument: 'GBP/JPY', direction: 'Long', entry: 189.45, tp: 191.20, sl: 188.30, status: 'TP Hit', pnl_percent: 0.92, confidence: 79, user_id: 'current' },
  { id: '9', date: '2025-09-20', instrument: 'NZD/USD', direction: 'Long', entry: 0.6145, tp: 0.6215, sl: 0.6095, status: 'SL Hit', pnl_percent: -0.81, confidence: 68, user_id: 'current' },
  { id: '10', date: '2025-09-22', instrument: 'EUR/USD', direction: 'Long', entry: 1.0715, tp: 1.0805, sl: 1.0665, status: 'TP Hit', pnl_percent: 0.84, confidence: 91, user_id: 'current' },
  { id: '11', date: '2025-09-25', instrument: 'USD/CHF', direction: 'Short', entry: 0.8825, tp: 0.8765, sl: 0.8870, status: 'TP Hit', pnl_percent: 0.68, confidence: 83, user_id: 'current' },
  { id: '12', date: '2025-09-27', instrument: 'GBP/USD', direction: 'Long', entry: 1.2925, tp: 1.3015, sl: 1.2870, status: 'TP Hit', pnl_percent: 0.70, confidence: 86, user_id: 'current' },
  { id: '13', date: '2025-09-29', instrument: 'AUD/JPY', direction: 'Short', entry: 99.35, tp: 98.45, sl: 99.95, status: 'SL Hit', pnl_percent: -0.60, confidence: 72, user_id: 'current' },
  { id: '14', date: '2025-10-01', instrument: 'EUR/USD', direction: 'Long', entry: 1.0795, tp: 1.0875, sl: 1.0745, status: 'TP Hit', pnl_percent: 0.74, confidence: 89, user_id: 'current' },
  { id: '15', date: '2025-10-03', instrument: 'USD/JPY', direction: 'Short', entry: 148.65, tp: 147.80, sl: 149.25, status: 'TP Hit', pnl_percent: 0.57, confidence: 80, user_id: 'current' },
];

// Global trade setups (all users)
export const globalTradeSetups: BacktestTradeSetup[] = [
  ...myTradeSetups,
  { id: '16', date: '2025-09-02', instrument: 'EUR/USD', direction: 'Short', entry: 1.0745, tp: 1.0665, sl: 1.0800, status: 'TP Hit', pnl_percent: 0.74, confidence: 84, user_id: 'user2' },
  { id: '17', date: '2025-09-04', instrument: 'GBP/USD', direction: 'Long', entry: 1.2795, tp: 1.2885, sl: 1.2745, status: 'SL Hit', pnl_percent: -0.39, confidence: 70, user_id: 'user3' },
  { id: '18', date: '2025-09-06', instrument: 'USD/CAD', direction: 'Short', entry: 1.3565, tp: 1.3485, sl: 1.3620, status: 'TP Hit', pnl_percent: 0.59, confidence: 77, user_id: 'user2' },
  { id: '19', date: '2025-09-07', instrument: 'AUD/USD', direction: 'Long', entry: 0.6715, tp: 0.6785, sl: 0.6670, status: 'TP Hit', pnl_percent: 1.04, confidence: 88, user_id: 'user4' },
  { id: '20', date: '2025-09-09', instrument: 'EUR/GBP', direction: 'Short', entry: 0.8395, tp: 0.8335, sl: 0.8440, status: 'TP Hit', pnl_percent: 0.71, confidence: 81, user_id: 'user3' },
  { id: '21', date: '2025-09-11', instrument: 'USD/JPY', direction: 'Long', entry: 147.85, tp: 148.95, sl: 147.15, status: 'TP Hit', pnl_percent: 0.74, confidence: 85, user_id: 'user5' },
  { id: '22', date: '2025-09-13', instrument: 'NZD/USD', direction: 'Short', entry: 0.6185, tp: 0.6125, sl: 0.6230, status: 'SL Hit', pnl_percent: -0.73, confidence: 66, user_id: 'user2' },
  { id: '23', date: '2025-09-14', instrument: 'EUR/USD', direction: 'Long', entry: 1.0655, tp: 1.0735, sl: 1.0605, status: 'TP Hit', pnl_percent: 0.75, confidence: 90, user_id: 'user6' },
  { id: '24', date: '2025-09-16', instrument: 'GBP/JPY', direction: 'Short', entry: 190.25, tp: 188.85, sl: 191.15, status: 'TP Hit', pnl_percent: 0.74, confidence: 78, user_id: 'user4' },
  { id: '25', date: '2025-09-17', instrument: 'USD/CHF', direction: 'Long', entry: 0.8795, tp: 0.8855, sl: 0.8750, status: 'SL Hit', pnl_percent: -0.51, confidence: 69, user_id: 'user3' },
  { id: '26', date: '2025-09-19', instrument: 'AUD/JPY', direction: 'Long', entry: 99.15, tp: 100.05, sl: 98.55, status: 'TP Hit', pnl_percent: 0.91, confidence: 83, user_id: 'user5' },
  { id: '27', date: '2025-09-21', instrument: 'EUR/USD', direction: 'Short', entry: 1.0725, tp: 1.0645, sl: 1.0775, status: 'TP Hit', pnl_percent: 0.75, confidence: 87, user_id: 'user2' },
  { id: '28', date: '2025-09-23', instrument: 'GBP/USD', direction: 'Long', entry: 1.2905, tp: 1.2985, sl: 1.2855, status: 'TP Hit', pnl_percent: 0.62, confidence: 82, user_id: 'user6' },
  { id: '29', date: '2025-09-24', instrument: 'USD/CAD', direction: 'Short', entry: 1.3545, tp: 1.3475, sl: 1.3595, status: 'SL Hit', pnl_percent: -0.37, confidence: 73, user_id: 'user4' },
  { id: '30', date: '2025-09-26', instrument: 'EUR/GBP', direction: 'Long', entry: 0.8345, tp: 0.8405, sl: 0.8300, status: 'TP Hit', pnl_percent: 0.72, confidence: 86, user_id: 'user3' },
  { id: '31', date: '2025-09-28', instrument: 'AUD/USD', direction: 'Short', entry: 0.6765, tp: 0.6705, sl: 0.6810, status: 'TP Hit', pnl_percent: 0.89, confidence: 84, user_id: 'user5' },
  { id: '32', date: '2025-09-30', instrument: 'USD/JPY', direction: 'Long', entry: 148.25, tp: 149.15, sl: 147.65, status: 'TP Hit', pnl_percent: 0.61, confidence: 79, user_id: 'user2' },
  { id: '33', date: '2025-10-02', instrument: 'NZD/USD', direction: 'Long', entry: 0.6165, tp: 0.6235, sl: 0.6120, status: 'SL Hit', pnl_percent: -0.73, confidence: 67, user_id: 'user6' },
  { id: '34', date: '2025-10-04', instrument: 'EUR/USD', direction: 'Long', entry: 1.0805, tp: 1.0885, sl: 1.0755, status: 'TP Hit', pnl_percent: 0.74, confidence: 91, user_id: 'user4' },
  { id: '35', date: '2025-10-05', instrument: 'GBP/JPY', direction: 'Short', entry: 191.45, tp: 190.25, sl: 192.25, status: 'TP Hit', pnl_percent: 0.63, confidence: 80, user_id: 'user3' },
];

export function calculateStats(trades: BacktestTradeSetup[]): BacktestStats {
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.status === 'TP Hit').length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  const totalRR = trades.reduce((sum, trade) => {
    const riskReward = Math.abs((trade.tp - trade.entry) / (trade.entry - trade.sl));
    return sum + riskReward;
  }, 0);
  const avgRiskReward = totalTrades > 0 ? totalRR / totalTrades : 0;
  
  const cumulativePnL = trades.reduce((sum, trade) => sum + trade.pnl_percent, 0);
  const avgPnL = totalTrades > 0 ? cumulativePnL / totalTrades : 0;
  const activeTrades = trades.filter(t => t.status === 'Open').length;
  
  return {
    totalTrades,
    winRate,
    avgRiskReward,
    cumulativePnL,
    avgPnL,
    activeTrades,
  };
}
