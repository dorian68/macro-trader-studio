/**
 * Market Frictions Adjustment Module
 * 
 * Encapsulates the logic for adding friction-based sigma adjustments
 * to Stop-Loss levels, accounting for:
 * - Spread: bid/ask gap paid at execution
 * - Slippage: difference between theoretical and executed price
 * - Noise buffer: safety margin against wicks/microstructure
 * 
 * This module is used ONLY in forecast-playground and can be
 * easily disabled by setting ENABLE_FRICTION_ADJUSTMENT = false
 */

// ============ FEATURE FLAG ============
export const ENABLE_FRICTION_ADJUSTMENT = true;

// ============ TYPES ============
export type AssetClass = 'fx_major' | 'crypto_major' | 'altcoin';

export interface FrictionResult {
  assetClass: AssetClass;
  frictionSigma: number;
  timeframe: string;
  enabled: boolean;
}

export interface SLWithFriction {
  baseSL: number;
  frictionSigma: number;
  finalSL: number;
  assetClass: AssetClass;
}

// ============ FRICTION CONFIGURATION ============
/**
 * Friction presets by asset class and timeframe
 * Values represent additional σ to add to strategic SL
 * 
 * Rationale:
 * - FX majors: tightest spreads, lowest friction
 * - Crypto majors (BTC/ETH): moderate liquidity
 * - Altcoins: wider spreads, higher slippage risk
 */
const FRICTION_CONFIG: Record<AssetClass, Record<string, number>> = {
  fx_major: {
    "15min": 1.0,
    "30min": 0.8,
    "1h": 0.8,
    "4h": 0.5
  },
  crypto_major: {
    "15min": 2.2,
    "30min": 1.8,
    "1h": 1.5,
    "4h": 1.0
  },
  altcoin: {
    "15min": 3.5,
    "30min": 3.0,
    "1h": 2.5,
    "4h": 2.0
  }
};

// ============ ASSET CLASSIFICATION ============
/**
 * List of recognized FX major pairs
 */
const FX_MAJORS = [
  'EUR/USD', 'EURUSD',
  'GBP/USD', 'GBPUSD',
  'USD/JPY', 'USDJPY',
  'AUD/USD', 'AUDUSD',
  'USD/CHF', 'USDCHF',
  'USD/CAD', 'USDCAD',
  'NZD/USD', 'NZDUSD',
  'XAU/USD', 'XAUUSD',  // Gold treated as FX major
  'EUR/JPY', 'EURJPY',
  'GBP/JPY', 'GBPJPY'
];

/**
 * List of recognized major cryptocurrencies
 */
const CRYPTO_MAJORS = [
  'BTC/USD', 'BTCUSD', 'BTCUSDT',
  'ETH/USD', 'ETHUSD', 'ETHUSDT'
];

/**
 * Classify an asset symbol into its asset class
 * @param symbol - Trading symbol (e.g., "EUR/USD", "BTC/USD", "XLM/USD")
 * @returns AssetClass classification
 */
export function getAssetClass(symbol: string): AssetClass {
  const normalized = symbol.toUpperCase().replace(/\s/g, '');
  
  // Check FX majors first
  if (FX_MAJORS.some(fx => normalized.includes(fx.replace('/', '')))) {
    return 'fx_major';
  }
  
  // Check crypto majors
  if (CRYPTO_MAJORS.some(crypto => normalized.includes(crypto.replace('/', '')))) {
    return 'crypto_major';
  }
  
  // Default to altcoin (includes all other crypto, illiquid assets)
  return 'altcoin';
}

/**
 * Get human-readable label for asset class
 */
export function getAssetClassLabel(assetClass: AssetClass): string {
  switch (assetClass) {
    case 'fx_major': return 'FX Major';
    case 'crypto_major': return 'Crypto Major';
    case 'altcoin': return 'Altcoin';
  }
}

// ============ FRICTION CALCULATION ============
/**
 * Get the market friction sigma adjustment for a given symbol and timeframe
 * 
 * @param symbol - Trading symbol
 * @param timeframe - Timeframe string (e.g., "15min", "30min", "1h", "4h")
 * @returns FrictionResult with adjustment details
 */
export function getMarketFrictionSigma(symbol: string, timeframe: string): FrictionResult {
  if (!ENABLE_FRICTION_ADJUSTMENT) {
    return {
      assetClass: getAssetClass(symbol),
      frictionSigma: 0,
      timeframe,
      enabled: false
    };
  }
  
  const assetClass = getAssetClass(symbol);
  const config = FRICTION_CONFIG[assetClass];
  
  // Normalize timeframe for lookup
  const normalizedTf = timeframe.toLowerCase().replace(/\s/g, '');
  
  // Get friction value, default to 1h value if timeframe not found
  const frictionSigma = config[normalizedTf] ?? config["1h"] ?? 1.0;
  
  return {
    assetClass,
    frictionSigma,
    timeframe,
    enabled: true
  };
}

/**
 * Apply friction adjustment to a base SL sigma value
 * 
 * @param baseSL - Strategic SL in sigma units (from risk profile)
 * @param symbol - Trading symbol for classification
 * @param timeframe - Timeframe for friction lookup
 * @returns SLWithFriction containing all breakdown values
 */
export function applyFrictionToSL(
  baseSL: number,
  symbol: string,
  timeframe: string
): SLWithFriction {
  const friction = getMarketFrictionSigma(symbol, timeframe);
  
  return {
    baseSL,
    frictionSigma: friction.frictionSigma,
    finalSL: baseSL + friction.frictionSigma,
    assetClass: friction.assetClass
  };
}

/**
 * Get friction info string for display
 * Example: "+1.00σ (FX Major @ 15min)"
 */
export function getFrictionDisplayString(symbol: string, timeframe: string): string {
  const friction = getMarketFrictionSigma(symbol, timeframe);
  if (!friction.enabled) return '';
  
  const classLabel = getAssetClassLabel(friction.assetClass);
  return `+${friction.frictionSigma.toFixed(2)}σ (${classLabel} @ ${timeframe})`;
}

/**
 * Tooltip content explaining market frictions
 */
export const FRICTION_TOOLTIP = 
  "Market Frictions Adjustment accounts for spread, slippage, and intrabar market noise to avoid premature stop-outs.";
