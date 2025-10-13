import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { mapToTwelveData } from '../_shared/instrument-mappings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWELVE_API_KEY = 'e40fcead02054731aef55d2dfe01cf47';

// Map instruments to TwelveData symbols using centralized mappings
function mapToTwelveDataSymbol(instrument: string): string | null {
  return mapToTwelveData(instrument);
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

    // Map instrument to TwelveData symbol
    const apiSymbol = mapToTwelveDataSymbol(instrument);
    
    // Check if instrument is not supported BEFORE calling API
    if (apiSymbol === null) {
      console.warn(`Instrument "${instrument}" is not supported (requires Futures API)`);
      return new Response(
        JSON.stringify({
          instrument,
          interval,
          data: [],
          cached: false,
          error: 'not_supported',
          message: `Instrument "${instrument}" requires TwelveData Futures API (not available in Basic plan). Supported: Forex, Crypto, Metals, Major Stocks.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Fetch from TwelveData API
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
