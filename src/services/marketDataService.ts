// Market data service with caching for Twelve Data API
// Supports major FX pairs, cryptocurrencies, and commodities
import { supabase } from '@/integrations/supabase/client';

interface PriceCache {
  price: number;
  timestamp: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL = 30000; // 30 seconds
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 8;

let requestTimestamps: number[] = [];

// Map instruments to Twelve Data API symbols
function mapToTwelveDataSymbol(original: string): string {
  const overrides: Record<string, string> = {
    'NG': 'NATGAS/USD',
  };
  return overrides[original] ?? original; // FX/crypto/other commodities keep their format
}

// Major instruments supported
export const INSTRUMENTS = {
  fx: [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 
    'NZD/USD', 'USD/CHF', 'EUR/GBP', 'EUR/JPY'
  ],
  crypto: ['BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD', 'XRP/USD', 'XLM/USD'],
  commodities: ['XAU/USD', 'XAG/USD', 'WTI/USD', 'NG']
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

  const doFetch = async (sym: string): Promise<number> => {
    recordRequest();
    const { data, error } = await supabase.functions.invoke('fetch-current-price', {
      body: { instrument: sym },
    });
    if (error) throw error;

    const price = Number(data?.price);
    
    if (isNaN(price)) {
      throw new Error('Invalid price data');
    }

    return price;
  };

  const apiSymbol = mapToTwelveDataSymbol(symbol);
  try {
    const price = await doFetch(apiSymbol);
    
    // Cache the result
    priceCache.set(symbol, { price, timestamp: Date.now() });
    
    return price;
  } catch (error) {
    // Fallback for NG: if NATGAS/USD fails, try 'NG'
    if (symbol === 'NG' && apiSymbol !== 'NG') {
      try {
        const price = await doFetch('NG');
        priceCache.set(symbol, { price, timestamp: Date.now() });
        return price;
      } catch (fallbackError) {
        console.error('Error fetching NG with fallback:', fallbackError);
        throw fallbackError;
      }
    }
    console.error('Error fetching instrument price:', error);
    throw error;
  }
}

export function getInstrumentType(symbol: string): 'fx' | 'crypto' | 'commodity' {
  if (INSTRUMENTS.fx.includes(symbol)) return 'fx';
  if (INSTRUMENTS.crypto.includes(symbol)) return 'crypto';
  if (INSTRUMENTS.commodities.includes(symbol)) return 'commodity';
  return 'fx'; // default fallback
}

export function getAllInstruments(): string[] {
  return [...INSTRUMENTS.fx, ...INSTRUMENTS.crypto, ...INSTRUMENTS.commodities];
}
