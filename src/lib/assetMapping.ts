// Mapping des actifs vers les symboles Binance WebSocket
export const assetToBinanceSymbol: Record<string, string> = {
  // Forex pairs - Binance format
  'EUR/USD': 'EURUSD',
  'GBP/USD': 'GBPUSD', 
  'USD/JPY': 'USDJPY',
  'AUD/USD': 'AUDUSD',
  'NZD/USD': 'NZDUSD',
  'USD/CHF': 'USDCHF',
  'EUR/GBP': 'EURGBP',
  'EUR/JPY': 'EURJPY',
  
  // Commodities - Binance format
  'GOLD': 'XAUUSD',
  'Gold': 'XAUUSD',
  'SILVER': 'XAGUSD', 
  'Silver': 'XAGUSD',
  'CRUDE': 'USOIL',
  'Crude Oil': 'USOIL',
  
  // Crypto - Binance format (USDT pairs for better liquidity)
  'Bitcoin': 'BTCUSDT',
  'BTC': 'BTCUSDT',
  'Ethereum': 'ETHUSDT',
  'ETH': 'ETHUSDT',
  'BTC-USD': 'BTCUSDT',
  'ETH-USD': 'ETHUSDT',
  'ADA-USD': 'ADAUSDT',
  'SOL-USD': 'SOLUSDT',
  'DOT-USD': 'DOTUSDT',
  'DOGE-USD': 'DOGEUSDT',
  
  // TradingView symbol mappings to Binance
  'EURUSD': 'EURUSD',
  'GBPUSD': 'GBPUSD',
  'USDJPY': 'USDJPY',
  'AUDUSD': 'AUDUSD',
  'NZDUSD': 'NZDUSD',
  'XAUUSD': 'XAUUSD',
  'XAGUSD': 'XAGUSD',
  'BTCUSD': 'BTCUSDT',
  'ETHUSD': 'ETHUSDT'
};

// Mapping des symboles incorrects vers les corrects (Yahoo Finance -> format app)
const symbolCorrections: Record<string, string> = {
  // Forex Yahoo Finance format -> App format
  'EURUSD=X': 'EUR/USD',
  'GBPUSD=X': 'GBP/USD',
  'USDJPY=X': 'USD/JPY',
  'AUDUSD=X': 'AUD/USD',
  'NZDUSD=X': 'NZD/USD', 
  'USDCHF=X': 'USD/CHF',
  'EURGBP=X': 'EUR/GBP',
  'EURJPY=X': 'EUR/JPY',
  'EURCHF=X': 'EUR/CHF',
  'GBPJPY=X': 'GBP/JPY',
  'AUDJPY=X': 'AUD/JPY',
  'NZDJPY=X': 'NZD/JPY',
  'CADJPY=X': 'CAD/JPY',
  'CHFJPY=X': 'CHF/JPY',
  'USDCAD=X': 'USD/CAD',
  'AUDCAD=X': 'AUD/CAD',
  'EURAUD=X': 'EUR/AUD',
  'EURNZD=X': 'EUR/NZD',
  'EURCAD=X': 'EUR/CAD',
  
  // Crypto Yahoo Finance format -> App format
  'BTC-USD': 'Bitcoin',
  'ETH-USD': 'Ethereum',
  'ADA-USD': 'ADA-USD',
  'SOL-USD': 'SOL-USD',
  'DOT-USD': 'DOT-USD',
  'DOGE-USD': 'DOGE-USD',
  'XRP-USD': 'XRP-USD',
  'BNB-USD': 'BNB-USD',
  'LINK-USD': 'LINK-USD',
  'MATIC-USD': 'MATIC-USD',
  'AVAX-USD': 'AVAX-USD',
  'UNI-USD': 'UNI-USD',
  
  // Commodities Yahoo Finance format -> App format
  'GC=F': 'GOLD',
  'SI=F': 'SILVER',
  'CL=F': 'CRUDE'
};

export const getSymbolForAsset = (asset: string): string => {
  // Correction des symboles mal formatés
  const correctedAsset = symbolCorrections[asset] || asset;
  
  // Retour du symbole Binance correspondant
  return assetToBinanceSymbol[correctedAsset] || 'BTCUSDT'; // Fallback vers BTC
};

export const supportsRealTimeData = (asset: string): boolean => {
  const correctedAsset = symbolCorrections[asset] || asset;
  return !!assetToBinanceSymbol[correctedAsset];
};

// Normalise n'importe quel format de symbole vers le format de l'app
export const getNormalizedSymbol = (symbol: string): string => {
  return symbolCorrections[symbol] || symbol;
};