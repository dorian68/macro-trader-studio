// Mapping des actifs vers les symboles Twelve Data
export const assetToTwelveDataSymbol: Record<string, string> = {
  'EUR/USD': 'EUR/USD',
  'GBP/USD': 'GBP/USD', 
  'USD/JPY': 'USD/JPY',
  'GOLD': 'XAU/USD',
  'Gold': 'XAU/USD',
  'SILVER': 'XAG/USD',
  'Silver': 'XAG/USD',
  'CRUDE': 'WTI/USD',
  'Crude Oil': 'WTI/USD',
  'Bitcoin': 'BTC/USD',
  'Ethereum': 'ETH/USD',
  'BTC': 'BTC/USD',
  'ETH': 'ETH/USD'
};

// Cache pour stocker toutes les données reçues
export const priceCache = new Map<string, any>();

// Tous les actifs supportent maintenant les données en temps réel
export const getSymbolForAsset = (asset: string): string => {
  return assetToTwelveDataSymbol[asset] || 'BTC/USD'; // Fallback vers BTC
};

// Tous les actifs ont des données temps réel
export const supportsRealTimeData = (asset: string): boolean => {
  return true; // Tous les actifs supportent maintenant le temps réel
};