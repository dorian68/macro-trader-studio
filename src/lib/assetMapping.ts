// Mapping des actifs vers les symboles Binance
export const assetToBinanceSymbol: Record<string, string> = {
  'EUR/USD': 'EURUSD',     // EUR/USD forex pair
  'GBP/USD': 'GBPUSD',     // GBP/USD forex pair
  'USD/JPY': 'USDJPY',     // USD/JPY forex pair
  'GOLD': 'XAUUSD',        // Gold vs USD
  'Gold': 'XAUUSD',        // Gold vs USD
  'SILVER': 'XAGUSD',      // Silver vs USD
  'Silver': 'XAGUSD',      // Silver vs USD
  'CRUDE': 'USOIL',        // Crude Oil
  'Crude Oil': 'USOIL',    // Crude Oil
  'Bitcoin': 'BTCUSD',
  'Ethereum': 'ETHUSD',
  'BTC': 'BTCUSD',
  'ETH': 'ETHUSD'
};

// Tous les actifs supportent maintenant les données en temps réel
export const getSymbolForAsset = (asset: string): string => {
  return assetToBinanceSymbol[asset] || 'BTCUSD'; // Fallback vers BTC
};

// Tous les actifs ont des données temps réel
export const supportsRealTimeData = (asset: string): boolean => {
  return true; // Tous les actifs supportent maintenant le temps réel
};