// ============ RISK PROFILE CONSTANTS ============

/**
 * Risk profile definitions with sigma-based SL/TP targets
 * - Conservative: High probability of hitting TP, smaller R/R
 * - Moderate: Balanced risk/reward
 * - Aggressive: Convexity play, lower probability but higher R/R
 */
export const RISK_PROFILES = {
  conservative: {
    name: "Conservative",
    targetProb: 0.80,
    slSigma: 1.0,
    tpSigma: 1.5,
    philosophy: "Regularity"
  },
  moderate: {
    name: "Moderate",
    targetProb: 0.62,
    slSigma: 2.25,
    tpSigma: 2.5,
    philosophy: "Balance"
  },
  aggressive: {
    name: "Aggressive",
    targetProb: 0.40,
    slSigma: 5.0,
    tpSigma: 3.5,
    philosophy: "Convexity"
  }
} as const;

export type RiskProfileKey = keyof typeof RISK_PROFILES;

// ============ PIP SIZE CONSTANTS ============

/**
 * Pip size mapping per symbol type
 * - FX pairs: 0.0001 (0.01 for JPY pairs)
 * - Gold (XAU): 0.01 (points)
 * - Crypto (BTC/ETH): 1.0 (USD points)
 */
const PIP_SIZES: Record<string, number> = {
  "XAU/USD": 0.01,
  "BTC/USD": 1.0,
  "ETH/USD": 1.0,
  "XLM/USD": 0.0001,
  "EUR/USD": 0.0001,
  "AUD/USD": 0.0001,
  "GBP/USD": 0.0001,
  "USD/JPY": 0.01,
  "EUR/JPY": 0.01,
  "GBP/JPY": 0.01,
};

// ============ HELPER FUNCTIONS ============

/**
 * Convert timeframe string to hours
 * @example "15min" → 0.25, "1h" → 1, "4h" → 4, "1d" → 24
 */
export function timeframeToHours(timeframe: string): number {
  const match = timeframe.match(/^(\d+)(min|h|d)$/i);
  if (!match) return 0.25; // Default 15min

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit === "min") return value / 60;
  if (unit === "h") return value;
  if (unit === "d") return value * 24;
  return 0.25;
}

/**
 * Get pip size for a symbol
 * Handles FX pairs, crypto, and metals
 */
export function pipSizeForSymbol(symbol: string): number {
  // Normalize symbol (remove spaces, uppercase)
  const normalized = symbol.replace(/\s/g, "").toUpperCase();

  // Check for specific asset types
  if (normalized.includes("XAU")) return 0.01;      // Gold: points
  if (normalized.includes("BTC")) return 1.0;       // Bitcoin: USD points
  if (normalized.includes("ETH")) return 1.0;       // Ethereum: USD points
  if (normalized.includes("XLM")) return 0.0001;    // Stellar

  // Check for JPY pairs
  if (normalized.endsWith("JPY")) return 0.01;

  // Default for FX pairs
  return PIP_SIZES[symbol] ?? 0.0001;
}

/**
 * Get pip unit label for display (e.g., "pips", "USD pts", "points")
 */
export function pipUnitLabel(symbol: string): string {
  const normalized = symbol.toUpperCase();
  if (normalized.includes("BTC") || normalized.includes("ETH")) {
    return "USD pts";
  }
  if (normalized.includes("XAU")) {
    return "points";
  }
  return "pips";
}

/**
 * Compute number of steps for horizon scaling
 * steps = horizon_hours / timeframe_hours
 */
export function computeSteps(horizonHours: number, timeframe: string): number {
  const tfHours = timeframeToHours(timeframe);
  if (tfHours === 0) return 1;
  return horizonHours / tfHours;
}

/**
 * Scale sigma_ref to horizon sigma using square-root of time rule
 * sigma_h = sigma_ref * sqrt(steps)
 */
export function sigmaHFromSigmaRef(sigmaRef: number, steps: number): number {
  return sigmaRef * Math.sqrt(steps);
}

/**
 * Approximate sigma_h from forecast quantiles (p20, p80)
 * Uses normal distribution approximation:
 * sigma_h_proxy = (p80 - p20) / (2 * z80)
 * where z80 ≈ 0.8416 (normal approx for 80th percentile)
 */
export function sigmaHProxyFromQuantiles(p20: number, p80: number): number {
  const Z80 = 0.8416;
  return Math.abs(p80 - p20) / (2 * Z80);
}

/**
 * Convert sigma value to price distance
 * distance = entry_price * (sigma_value * sigma_h)
 */
export function sigmaToPriceDistance(
  sigmaValue: number,
  sigmaH: number,
  entryPrice: number
): number {
  return entryPrice * sigmaValue * sigmaH;
}

/**
 * Calculate TP/SL prices from sigma values
 * Direction determines which way TP and SL go from entry
 */
export function tpSlFromSigmas(
  entryPrice: number,
  direction: "long" | "short",
  sigmaH: number,
  tpSigma: number,
  slSigma: number
): { tpPrice: number; slPrice: number; tpDistance: number; slDistance: number } {
  const tpDistance = sigmaToPriceDistance(tpSigma, sigmaH, entryPrice);
  const slDistance = sigmaToPriceDistance(slSigma, sigmaH, entryPrice);

  if (direction === "long") {
    return {
      tpPrice: entryPrice + tpDistance,
      slPrice: entryPrice - slDistance,
      tpDistance,
      slDistance
    };
  } else {
    return {
      tpPrice: entryPrice - tpDistance,
      slPrice: entryPrice + slDistance,
      tpDistance,
      slDistance
    };
  }
}

/**
 * Convert price distance to pips/points
 */
export function priceDistanceToPips(distance: number, pipSize: number): number {
  if (pipSize === 0) return 0;
  return Math.abs(distance) / pipSize;
}

/**
 * Calculate TP/SL prices using ATR (Average True Range)
 * 
 * @param entryPrice - Entry price for the trade
 * @param direction - Trade direction: "long" or "short"
 * @param atr - ATR(14) value in price units
 * @param tpMultiplier - ATR multiplier for Take Profit (k_TP)
 * @param slMultiplier - ATR multiplier for Stop Loss (k_SL)
 * @returns TP/SL prices and distances
 */
export function tpSlFromATR(
  entryPrice: number,
  direction: "long" | "short",
  atr: number,
  tpMultiplier: number,
  slMultiplier: number
): { tpPrice: number; slPrice: number; tpDistance: number; slDistance: number } {
  const tpDistance = tpMultiplier * atr;
  const slDistance = slMultiplier * atr;

  if (direction === "long") {
    return {
      tpPrice: entryPrice + tpDistance,
      slPrice: entryPrice - slDistance,
      tpDistance,
      slDistance
    };
  } else {
    return {
      tpPrice: entryPrice - tpDistance,
      slPrice: entryPrice + slDistance,
      tpDistance,
      slDistance
    };
  }
}
