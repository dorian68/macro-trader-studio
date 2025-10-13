/**
 * TwelveData Symbol Mappings
 * ✅ = Fully supported | ❌ = Not supported (requires Futures API)
 */
export const TWELVE_DATA_MAPPINGS: Record<string, string | null> = {
  // ===== FOREX (✅ Full support) =====
  'EUR/USD': 'EUR/USD',
  'GBP/USD': 'GBP/USD',
  'USD/JPY': 'USD/JPY',
  'USD/CHF': 'USD/CHF',
  'AUD/USD': 'AUD/USD',
  'NZD/USD': 'NZD/USD',
  'USD/CAD': 'USD/CAD',
  'EUR/GBP': 'EUR/GBP',
  'GBP/JPY': 'GBP/JPY',
  'AUD/JPY': 'AUD/JPY',
  
  // ===== CRYPTO (✅ Full support) =====
  'BITCOIN': 'BTC/USD',
  'BTC': 'BTC/USD',
  'BTC/USD': 'BTC/USD',
  'BITCOIN (BTC)': 'BTC/USD',
  'ETHEREUM': 'ETH/USD',
  'ETH': 'ETH/USD',
  'ETH/USD': 'ETH/USD',
  'XLM': 'XLM/USD',
  'XLM/USD': 'XLM/USD',
  'XLM-USD': 'XLM/USD',
  'STELLAR': 'XLM/USD',
  
  // ===== METALS (✅ Full support) =====
  'GOLD': 'XAU/USD',
  'GOLD (XAU/USD)': 'XAU/USD',
  'XAU/USD': 'XAU/USD',
  'XAUUSD': 'XAU/USD',
  'SILVER': 'XAG/USD',
  'SILVER (XAG/USD)': 'XAG/USD',
  'XAG/USD': 'XAG/USD',
  'XAGUSD': 'XAG/USD',
  
  // ===== ENERGY (⚠️ Limited) =====
  'OIL': 'WTI/USD',
  'WTI': 'WTI/USD',
  'CRUDE OIL': 'WTI/USD',
  'BRENT': 'BRENT/USD',
  'NATURAL GAS': 'NATGAS/USD',
  'NATURAL GAS (NG)': 'NATGAS/USD',
  'NG': 'NATGAS/USD',
  'NATGAS': 'NATGAS/USD',
  
  // ===== STOCKS (✅ Full support) =====
  'GOOGL': 'GOOGL',
  'AAPL': 'AAPL',
  'MSFT': 'MSFT',
  'TSLA': 'TSLA',
  
  // ===== INDICES (✅ Full support) =====
  'SPX': 'SPX',
  'US500': 'SPX',
  'NDX': 'NDX',
  'DJI': 'DJI',
  
  // ===== FUTURES - NOT SUPPORTED (❌) =====
  'COFFEE': null,
  'KC=F': null,
  'CORN': null,
  'ZC=F': null,
  'WHEAT': null,
  'ZW=F': null,
  'SOYBEANS': null,
  'ZS=F': null,
};

export function mapToTwelveData(instrument: string): string | null {
  // 1. Extract from parentheses if present
  const parenthesesMatch = instrument.match(/\(([^)]+)\)/);
  if (parenthesesMatch) {
    instrument = parenthesesMatch[1];
  }
  
  // 2. Clean the input
  const cleaned = instrument.trim().replace(/\s+/g, ' ');
  
  // 3. Case-insensitive match
  const upperCleaned = cleaned.toUpperCase();
  for (const [key, value] of Object.entries(TWELVE_DATA_MAPPINGS)) {
    if (key.toUpperCase() === upperCleaned) {
      console.log(`Mapped "${instrument}" -> ${value || 'NOT_SUPPORTED'}`);
      return value;
    }
  }
  
  // 4. Fallback: try cleaned symbol as-is (might fail API call)
  console.log(`No exact mapping for "${instrument}", trying as-is: "${cleaned}"`);
  return cleaned;
}
