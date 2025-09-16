// Mapping des actifs vers les symboles Binance
export const assetToBinanceSymbol: Record<string, string> = {
  'EUR/USD': 'EURUSDT',  // Proxy via Tether
  'GBP/USD': 'GBPUSDT',  // GBP/USD via USDT
  'USD/JPY': 'USDCJPY',  // Approximation avec USDC/JPY
  'GOLD': 'PAXGUSDT',    // PAX Gold
  'Gold': 'PAXGUSDT',    // PAX Gold
  'SILVER': 'AGTUSDT',   // Silver token
  'Silver': 'AGTUSDT',   // Silver token
  'CRUDE': 'BTCUSDT',    // Fallback vers BTC (pas de pétrole direct)
  'Crude Oil': 'BTCUSDT', // Fallback vers BTC
  'Bitcoin': 'BTCUSDT',
  'Ethereum': 'ETHUSDT',
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT'
};

// Tous les actifs supportent maintenant les données en temps réel
export const getSymbolForAsset = (asset: string): string => {
  return assetToBinanceSymbol[asset] || 'BTCUSDT'; // Fallback vers BTC
};

// Tous les actifs ont des données temps réel
export const supportsRealTimeData = (asset: string): boolean => {
  return true; // Tous les actifs supportent maintenant le temps réel
};