// Market data service with caching for Twelve Data API
// Supports major FX pairs, cryptocurrencies, and commodities

interface PriceCache {
  price: number;
  timestamp: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL = 30000; // 30 seconds
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 8;

let requestTimestamps: number[] = [];

// Major instruments supported
export const INSTRUMENTS = {
  fx: [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 
    'NZD/USD', 'USD/CHF', 'EUR/GBP', 'EUR/JPY'
  ],
  crypto: ['BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD', 'XRP/USD'],
  commodities: ['GOLD', 'SILVER', 'CRUDE_OIL', 'NATURAL_GAS']
};

function cleanRateLimit() {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
}

function canMakeRequest(): boolean {
  cleanRateLimit();
  return requestTimestamps.length < MAX_REQUESTS_PER_MINUTE;
}

function recordRequest() {
  requestTimestamps.push(Date.now());
}

export async function getInstrumentPrice(symbol: string): Promise<number> {
  // Check cache first
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  // Check rate limit
  if (!canMakeRequest()) {
    throw new Error('Rate limit exceeded. Please wait a moment.');
  }

  try {
    // Convert symbol format for API
    const apiSymbol = symbol.replace('/', '');
    
    recordRequest();
    
    const response = await fetch(
      `https://api.twelvedata.com/price?symbol=${apiSymbol}&apikey=e40fcead02054731aef55d2dfe01cf47`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch price');
    }

    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.message || 'API error');
    }

    const price = parseFloat(data.price);
    
    if (isNaN(price)) {
      throw new Error('Invalid price data');
    }

    // Cache the result
    priceCache.set(symbol, { price, timestamp: Date.now() });
    
    return price;
  } catch (error) {
    console.error('Error fetching instrument price:', error);
    throw error;
  }
}

export function getInstrumentType(symbol: string): 'fx' | 'crypto' | 'commodity' {
  if (INSTRUMENTS.fx.includes(symbol)) return 'fx';
  if (INSTRUMENTS.crypto.includes(symbol)) return 'crypto';
  return 'commodity';
}

export function getAllInstruments(): string[] {
  return [...INSTRUMENTS.fx, ...INSTRUMENTS.crypto, ...INSTRUMENTS.commodities];
}
