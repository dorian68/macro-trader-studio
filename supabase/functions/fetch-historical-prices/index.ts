import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWELVE_API_KEY = 'e40fcead02054731aef55d2dfe01cf47';

// Map instruments to TwelveData symbols with extensive coverage
function mapToTwelveDataSymbol(instrument: string): string {
  // 1. Extract symbol from parentheses if present (e.g., "GOLD (XAU/USD)" -> "XAU/USD")
  const parenthesesMatch = instrument.match(/\(([^)]+)\)/);
  if (parenthesesMatch) {
    instrument = parenthesesMatch[1];
  }
  
  // 2. Clean the input
  const cleaned = instrument.trim().replace(/\s+/g, ' ');
  
  // 3. Extended mappings dictionary
  const mappings: Record<string, string> = {
    // Forex pairs
    'EUR/USD': 'EUR/USD',
    'GBP/USD': 'GBP/USD',
    'USD/JPY': 'USD/JPY',
    'USD/CHF': 'USD/CHF',
    'AUD/USD': 'AUD/USD',
    'NZD/USD': 'NZD/USD',
    'EUR/GBP': 'EUR/GBP',
    'GBP/JPY': 'GBP/JPY',
    'AUD/JPY': 'AUD/JPY',
    'USD/CAD': 'USD/CAD',
    
    // Cryptocurrencies - Bitcoin
    'BTC': 'BTC/USD',
    'BITCOIN': 'BTC/USD',
    'BITCOIN (BTC)': 'BTC/USD',
    'BTC/USD': 'BTC/USD',
    
    // Cryptocurrencies - Ethereum
    'ETH': 'ETH/USD',
    'ETHEREUM': 'ETH/USD',
    'ETH/USD': 'ETH/USD',
    
    // Cryptocurrencies - Stellar
    'XLM': 'XLM/USD',
    'XLM/USD': 'XLM/USD',
    'XLM-USD': 'XLM/USD',
    'STELLAR': 'XLM/USD',
    
    // Commodities - Gold
    'GOLD': 'XAU/USD',
    'XAU/USD': 'XAU/USD',
    'XAUUSD': 'XAU/USD',
    'GOLD (XAU/USD)': 'XAU/USD',
    
    // Commodities - Silver
    'SILVER': 'XAG/USD',
    'XAG/USD': 'XAG/USD',
    'XAGUSD': 'XAG/USD',
    'SILVER (XAG/USD)': 'XAG/USD',
    
    // Oil & Energy
    'WTI': 'WTI/USD',
    'BRENT': 'BRENT/USD',
    'OIL': 'WTI/USD',
    'CRUDE OIL': 'WTI/USD',
    'NATURAL GAS': 'NATGAS/USD',
    'NG': 'NATGAS/USD',
    'NATURAL GAS (NG)': 'NATGAS/USD',
    'NATGAS': 'NATGAS/USD',
    
    // Stocks (major)
    'GOOGL': 'GOOGL',
    'AAPL': 'AAPL',
    'MSFT': 'MSFT',
    'TSLA': 'TSLA',
    
    // Note: Coffee futures may not be supported by TwelveData Basic
    'COFFEE': 'COFFEE',
    'KC=F': 'COFFEE',
  };
  
  // 4. Try case-insensitive match
  const upperCleaned = cleaned.toUpperCase();
  for (const [key, value] of Object.entries(mappings)) {
    if (key.toUpperCase() === upperCleaned) {
      console.log(`Mapped "${instrument}" -> "${value}"`);
      return value;
    }
  }
  
  // 5. If no mapping found, return cleaned
  console.log(`No mapping for "${instrument}", using cleaned: "${cleaned}"`);
  return cleaned;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instrument, startDate, endDate, interval = '1day', extendDays = 7 } = await req.json();

    if (!instrument || !startDate || !endDate) {
      throw new Error('Missing required parameters: instrument, startDate, endDate');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extend date range
    const start = new Date(startDate);
    start.setDate(start.getDate() - extendDays);
    const end = new Date(endDate);
    end.setDate(end.getDate() + extendDays);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    console.log(`Fetching historical prices for ${instrument} from ${startStr} to ${endStr}`);

    // Check cache first
    const { data: cachedData, error: cacheError } = await supabase
      .from('price_history_cache')
      .select('*')
      .eq('instrument', instrument)
      .eq('interval', interval)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: true });

    if (!cacheError && cachedData && cachedData.length > 0) {
      console.log(`Returning ${cachedData.length} cached price points`);
      return new Response(
        JSON.stringify({
          instrument,
          interval,
          data: cachedData.map(d => ({
            date: d.date,
            open: parseFloat(d.open),
            high: parseFloat(d.high),
            low: parseFloat(d.low),
            close: parseFloat(d.close),
            volume: d.volume ? parseFloat(d.volume) : null
          })),
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from TwelveData API
    const apiSymbol = mapToTwelveDataSymbol(instrument);
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(apiSymbol)}&interval=${interval}&start_date=${startStr}&end_date=${endStr}&apikey=${TWELVE_API_KEY}&format=JSON`;
    
    console.log(`Calling TwelveData API: ${url.replace(TWELVE_API_KEY, 'REDACTED')}`);
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'error') {
      console.error('TwelveData error:', data.message);
      
      // Return empty response instead of throwing
      return new Response(
        JSON.stringify({
          instrument,
          interval,
          data: [],
          cached: false,
          error: `Instrument not supported: ${apiSymbol}`,
          message: data.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data.values || data.values.length === 0) {
      console.log('No data returned from TwelveData API');
      return new Response(
        JSON.stringify({
          instrument,
          interval,
          data: [],
          cached: false,
          message: 'No data available for this period'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and cache the data
    const priceData = data.values.map((v: any) => ({
      instrument,
      interval,
      date: v.datetime.split(' ')[0], // Extract date part
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: v.volume ? parseFloat(v.volume) : null
    }));

    // Insert into cache (upsert)
    const { error: insertError } = await supabase
      .from('price_history_cache')
      .upsert(priceData, { onConflict: 'instrument,interval,date' });

    if (insertError) {
      console.error('Error caching data:', insertError);
    } else {
      console.log(`Cached ${priceData.length} new price points`);
    }

    return new Response(
      JSON.stringify({
        instrument,
        interval,
        data: priceData.map(d => ({
          date: d.date,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume
        })),
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-historical-prices:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
