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
  'XLM-USD': 'XLMUSDT',
  
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
  'XLM-USD': 'XLM-USD',
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

// Mapping vers les symboles TradingView (avec préfixe exchange)
const assetToTradingViewSymbol: Record<string, string> = {
  // Forex
  'EUR/USD': 'FX:EURUSD',
  'GBP/USD': 'FX:GBPUSD',
  'USD/JPY': 'FX:USDJPY',
  'AUD/USD': 'FX:AUDUSD',
  'NZD/USD': 'FX:NZDUSD',
  'USD/CAD': 'FX:USDCAD',
  'USD/CHF': 'FX:USDCHF',
  'EUR/GBP': 'FX:EURGBP',
  'EUR/JPY': 'FX:EURJPY',
  'GBP/JPY': 'FX:GBPJPY',
  'AUD/JPY': 'FX:AUDJPY',
  'EURUSD': 'FX:EURUSD',
  'GBPUSD': 'FX:GBPUSD',
  'USDJPY': 'FX:USDJPY',
  'AUDUSD': 'FX:AUDUSD',
  'NZDUSD': 'FX:NZDUSD',
  'USDCAD': 'FX:USDCAD',
  'USDCHF': 'FX:USDCHF',
  'EURGBP': 'FX:EURGBP',
  'EURJPY': 'FX:EURJPY',
  'GBPJPY': 'FX:GBPJPY',

  // Crypto
  'Bitcoin': 'COINBASE:BTCUSD',
  'BTC': 'COINBASE:BTCUSD',
  'Ethereum': 'COINBASE:ETHUSD',
  'ETH': 'COINBASE:ETHUSD',
  'BTCUSD': 'COINBASE:BTCUSD',
  'ETHUSD': 'COINBASE:ETHUSD',
  'BTC-USD': 'COINBASE:BTCUSD',
  'ETH-USD': 'COINBASE:ETHUSD',

  // Commodities
  'GOLD': 'OANDA:XAUUSD',
  'Gold': 'OANDA:XAUUSD',
  'XAUUSD': 'OANDA:XAUUSD',
  'SILVER': 'OANDA:XAGUSD',
  'Silver': 'OANDA:XAGUSD',
  'XAGUSD': 'OANDA:XAGUSD',
  'CRUDE': 'TVC:USOIL',
  'Crude Oil': 'TVC:USOIL',
};

// Retourne le symbole TradingView complet (avec exchange) pour un actif donné
export const getSymbolForTradingView = (asset: string): string => {
  const corrected = symbolCorrections[asset] || asset;
  return assetToTradingViewSymbol[corrected] || assetToTradingViewSymbol[asset] || asset;
};