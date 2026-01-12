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

/**
 * Trading style for asymmetric TP friction coefficient (α)
 * - scalping: Very tight TP, minimal friction → α = 0.10
 * - intraday: Standard mean reversion → α = 0.20 (default)
 * - breakout: Trend following, wider moves → α = 0.30
 */
export type TradingStyle = 'scalping' | 'intraday' | 'breakout';

/**
 * TP friction coefficient (α) by trading style
 * Controls how much of the base friction applies to TP
 * α ∈ [0.10, 0.30] — never exceeds 0.30 per specification
 */
export const TP_FRICTION_ALPHA: Record<TradingStyle, number> = {
  scalping: 0.10,
  intraday: 0.20,
  breakout: 0.30,
};

export const DEFAULT_TRADING_STYLE: TradingStyle = 'intraday';

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

/**
 * Asymmetric friction result for SL and TP
 * SL receives 100% of friction, TP receives α × friction
 */
export interface AsymmetricFrictionResult {
  slFriction: number;      // 100% of σ_friction (applied to SL)
  tpFriction: number;      // α × σ_friction (applied to TP)
  alpha: number;           // Coefficient used for TP
  tradingStyle: TradingStyle;
  assetClass: AssetClass;
  baseFriction: number;    // Raw σ_friction before asymmetric split
  enabled: boolean;
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
 * Get asymmetric friction adjustments for SL and TP
 * 
 * SL_effective = SL_strat + σ_friction (100% friction)
 * TP_effective = TP_strat + α × σ_friction (partial friction)
 * 
 * @param symbol - Trading symbol for asset classification
 * @param timeframe - Timeframe for friction lookup
 * @param tradingStyle - Trading style to determine α coefficient (default: intraday)
 * @returns AsymmetricFrictionResult with SL and TP friction values
 */
export function getAsymmetricFriction(
  symbol: string,
  timeframe: string,
  tradingStyle: TradingStyle = DEFAULT_TRADING_STYLE
): AsymmetricFrictionResult {
  const baseFriction = getMarketFrictionSigma(symbol, timeframe);
  const alpha = TP_FRICTION_ALPHA[tradingStyle];
  
  return {
    slFriction: baseFriction.frictionSigma, // 100% to SL
    tpFriction: baseFriction.frictionSigma * alpha, // α% to TP
    alpha,
    tradingStyle,
    assetClass: baseFriction.assetClass,
    baseFriction: baseFriction.frictionSigma,
    enabled: baseFriction.enabled,
  };
}

/**
 * Get asymmetric friction display string
 * Example: "+0.80σ SL / +0.16σ TP (α=0.20, Intraday)"
 */
export function getAsymmetricFrictionDisplayString(
  symbol: string, 
  timeframe: string,
  tradingStyle: TradingStyle = DEFAULT_TRADING_STYLE
): string {
  const friction = getAsymmetricFriction(symbol, timeframe, tradingStyle);
  if (!friction.enabled) return '';
  
  const styleLabel = tradingStyle.charAt(0).toUpperCase() + tradingStyle.slice(1);
  return `+${friction.slFriction.toFixed(2)}σ SL / +${friction.tpFriction.toFixed(2)}σ TP (α=${friction.alpha.toFixed(2)}, ${styleLabel})`;
}

/**
 * Tooltip content explaining market frictions
 */
export const FRICTION_TOOLTIP = 
  "This adjustment accounts for spread, slippage, and market noise. It is fully reflected in the probability via the risk surface, ensuring consistency between execution and forecast.";

/**
 * Tooltip content explaining asymmetric frictions (legacy)
 */
export const ASYMMETRIC_FRICTION_TOOLTIP = 
  "Market frictions (spread, slippage, and intrabar noise) are applied asymmetrically: " +
  "primarily to the stop-loss and marginally to the take-profit. " +
  "All probabilities are recomputed using the effective levels via the risk surface.";

// ============ SYMMETRIC FRICTION (NEW) ============

/**
 * Symmetric friction result for SL and TP (50%/50% split)
 * Used for display/execution layer - probability stays on base levels
 */
export interface SymmetricFrictionResult {
  slFriction: number;      // 50% of σ_friction (applied to SL)
  tpFriction: number;      // 50% of σ_friction (applied to TP)
  assetClass: AssetClass;
  baseFriction: number;    // Raw σ_friction before split
  enabled: boolean;
}

/**
 * Get SYMMETRIC friction adjustments for SL and TP (50%/50%)
 * 
 * NEW RULE: Friction is split evenly between SL and TP
 * SL_effective = SL_base + 0.5 × σ_friction
 * TP_effective = TP_base + 0.5 × σ_friction
 * 
 * IMPORTANT: This affects DISPLAY ONLY. Probability is calculated on BASE levels.
 */
export function getSymmetricFriction(
  symbol: string,
  timeframe: string
): SymmetricFrictionResult {
  const baseFriction = getMarketFrictionSigma(symbol, timeframe);
  const halfFriction = baseFriction.frictionSigma * 0.5;
  
  return {
    slFriction: halfFriction,  // 50% to SL
    tpFriction: halfFriction,  // 50% to TP
    assetClass: baseFriction.assetClass,
    baseFriction: baseFriction.frictionSigma,
    enabled: baseFriction.enabled,
  };
}

/**
 * Get symmetric friction display string
 * Example: "+0.40σ SL / +0.40σ TP (50/50 split)"
 */
export function getSymmetricFrictionDisplayString(
  symbol: string, 
  timeframe: string
): string {
  const friction = getSymmetricFriction(symbol, timeframe);
  if (!friction.enabled) return '';
  
  const classLabel = getAssetClassLabel(friction.assetClass);
  return `+${friction.slFriction.toFixed(2)}σ SL / +${friction.tpFriction.toFixed(2)}σ TP (${classLabel})`;
}

/**
 * Tooltip content explaining symmetric frictions (NEW)
 * Clarifies that probabilities are computed on base levels
 */
export const SYMMETRIC_FRICTION_TOOLTIP = 
  "Market frictions (spread, slippage, noise buffer) are applied symmetrically " +
  "(50% to SL, 50% to TP) for execution realism. " +
  "Probabilities are computed on base levels (friction-free) for model consistency.";
