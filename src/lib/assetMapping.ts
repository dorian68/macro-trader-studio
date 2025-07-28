// Mapping des actifs vers les symboles Binance
export const assetToBinanceSymbol: Record<string, string> = {
  'EUR/USD': 'EURUSDT',  // Proxy via Tether
  'GBP/USD': 'GBPUSDT',  // Proxy via Tether
  'USD/JPY': 'USDCJPY',  // Approximation
  'Gold': 'PAXGUSDT',    // PAX Gold
  'Silver': 'AGTUSDT',   // Silver token
  'Crude Oil': 'USOILSPOT', // Si disponible, sinon fallback
  'Bitcoin': 'BTCUSDT',
  'Ethereum': 'ETHUSDT',
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT'
};

// Fallback pour les actifs non disponibles sur Binance
export const getSymbolForAsset = (asset: string): string => {
  return assetToBinanceSymbol[asset] || 'BTCUSDT'; // Fallback vers BTC
};

// Vérifier si l'actif supporte les données en temps réel
export const supportsRealTimeData = (asset: string): boolean => {
  const symbol = assetToBinanceSymbol[asset];
  // BTC et ETH sont garantis d'avoir des données temps réel
  return ['BTCUSDT', 'ETHUSDT'].includes(symbol);
};