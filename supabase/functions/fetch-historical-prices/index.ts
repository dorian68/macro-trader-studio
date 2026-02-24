import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { mapToTwelveData } from '../_shared/instrument-mappings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWELVE_API_KEY = Deno.env.get('TWELVE_DATA_API_KEY') || '';

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
      // Check cache freshness based on interval
      const maxAgeMs = ['1min','5min','15min','30min','1h','2h','4h'].includes(interval)
        ? 2 * 60 * 60 * 1000   // 2 hours for intraday
        : interval === '1day' ? 24 * 60 * 60 * 1000  // 24h for daily
        : 7 * 24 * 60 * 60 * 1000; // 7 days for weekly/monthly

      const newestFetchedAt = cachedData.reduce((latest: Date, d: any) =>
        d.fetched_at && new Date(d.fetched_at) > latest ? new Date(d.fetched_at) : latest,
        new Date(0)
      );

      const isFresh = (Date.now() - newestFetchedAt.getTime()) < maxAgeMs;

      if (isFresh) {
        console.log(`Returning ${cachedData.length} fresh cached price points (age: ${Math.round((Date.now() - newestFetchedAt.getTime()) / 60000)}min)`);
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
      } else {
        console.log(`Cache expired (age: ${Math.round((Date.now() - newestFetchedAt.getTime()) / 60000)}min), fetching fresh data`);
      }
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
      date: v.datetime.split(' ')[0], // Extract date part for DB key
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: v.volume ? parseFloat(v.volume) : null
    }));

    // Keep full datetime for response (intraday) - sort ascending so client gets newest last
    const responseData = data.values.map((v: any) => ({
      datetime: v.datetime,
      date: v.datetime.split(' ')[0],
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: v.volume ? parseFloat(v.volume) : null
    })).sort((a: any, b: any) => a.datetime.localeCompare(b.datetime));

    // Only cache daily+ data (intraday has key collisions and short TTL anyway)
    const isIntraday = ['1min','5min','15min','30min','1h','2h','4h'].includes(interval);
    if (!isIntraday) {
      const { error: insertError } = await supabase
        .from('price_history_cache')
        .upsert(priceData, { onConflict: 'instrument,interval,date' });

      if (insertError) {
        console.error('Error caching data:', insertError);
      } else {
        console.log(`Cached ${priceData.length} new price points`);
      }
    } else {
      console.log(`Skipping cache for intraday interval ${interval} (${priceData.length} points)`);
    }

    return new Response(
      JSON.stringify({
        instrument,
        interval,
        data: responseData,
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
