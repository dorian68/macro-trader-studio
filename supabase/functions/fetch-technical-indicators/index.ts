import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { mapToTwelveData } from '../_shared/instrument-mappings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWELVE_API_KEY = Deno.env.get('TWELVE_DATA_API_KEY') || '';
const VALID_INDICATORS = ['rsi', 'atr', 'sma', 'ema', 'macd', 'bbands'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      instrument, 
      indicators = ['rsi'],
      time_period = 14, 
      interval = '1day',
      outputsize = 30,
      start_date,
      end_date
    } = await req.json();

    if (!instrument) {
      throw new Error('Missing required parameter: instrument');
    }

    const requestedIndicators = Array.isArray(indicators) ? indicators : [indicators];
    const validIndicators = requestedIndicators.filter(ind => 
      VALID_INDICATORS.includes(ind.toLowerCase())
    );

    if (validIndicators.length === 0) {
      throw new Error(`Invalid indicators. Supported: ${VALID_INDICATORS.join(', ')}`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiSymbol = mapToTwelveData(instrument);
    
    if (apiSymbol === null) {
      return new Response(
        JSON.stringify({
          instrument,
          error: 'not_supported',
          message: `Instrument "${instrument}" is not supported for technical indicators.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Fetching technical indicators for ${instrument} (${apiSymbol}): ${validIndicators.join(', ')}`);

    const results: any = {};
    
    await Promise.all(
      validIndicators.map(async (indicator) => {
        const indicatorLower = indicator.toLowerCase();
        
        const { data: cachedData } = await supabase
          .from('technical_indicators_cache')
          .select('*')
          .eq('instrument', instrument)
          .eq('indicator', indicatorLower)
          .eq('interval', interval)
          .eq('time_period', time_period)
          .order('date', { ascending: false })
          .limit(outputsize);

        if (cachedData && cachedData.length >= outputsize * 0.8) {
          // Check cache freshness based on interval
          const maxAgeMs = ['1min','5min','15min','30min','1h','2h','4h'].includes(interval)
            ? 2 * 60 * 60 * 1000
            : interval === '1day' ? 24 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000;

          const newestCachedAt = cachedData.reduce((latest: Date, d: any) =>
            d.cached_at && new Date(d.cached_at) > latest ? new Date(d.cached_at) : latest,
            new Date(0)
          );

          const isFresh = (Date.now() - newestCachedAt.getTime()) < maxAgeMs;

          if (isFresh) {
            console.log(`Using fresh cached data for ${indicatorLower} (${cachedData.length} points, age: ${Math.round((Date.now() - newestCachedAt.getTime()) / 60000)}min)`);
            results[indicatorLower] = {
              values: cachedData.map(d => ({
                datetime: d.date,
                [indicatorLower]: parseFloat(d.value)
              })),
              cached: true
            };
            return;
          } else {
            console.log(`Cache stale for ${indicatorLower} (age: ${Math.round((Date.now() - newestCachedAt.getTime()) / 60000)}min), refetching`);
          }
        }

        let url = `https://api.twelvedata.com/${indicatorLower}?symbol=${encodeURIComponent(apiSymbol)}&interval=${interval}&time_period=${time_period}&outputsize=${outputsize}&apikey=${TWELVE_API_KEY}&format=JSON`;
        
        if (['sma', 'ema'].includes(indicatorLower)) {
          url += '&series_type=close';
        }

        // Add time window if provided
        if (start_date && end_date) {
          const startDateOnly = start_date.split('T')[0];
          const endDateOnly = end_date.split('T')[0];
          url += `&start_date=${startDateOnly}&end_date=${endDateOnly}`;
          console.log(`Using time window: ${startDateOnly} to ${endDateOnly}`);
        }

        console.log(`Calling TwelveData API for ${indicatorLower}`);
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'error') {
          console.error(`TwelveData error for ${indicatorLower}:`, data.message);
          results[indicatorLower] = { error: data.message, cached: false };
          return;
        }

        if (!data.values || data.values.length === 0) {
          console.log(`No data returned for ${indicatorLower}`);
          results[indicatorLower] = { values: [], cached: false };
          return;
        }

        const indicatorData = data.values.map((v: any) => ({
          instrument,
          indicator: indicatorLower,
          interval,
          time_period,
          date: v.datetime.split(' ')[0],
          value: parseFloat(v[indicatorLower])
        }));

        const { error: insertError } = await supabase
          .from('technical_indicators_cache')
          .upsert(indicatorData, { onConflict: 'instrument,indicator,interval,time_period,date' });

        if (insertError) {
          console.error(`Error caching ${indicatorLower}:`, insertError);
        } else {
          console.log(`Cached ${indicatorData.length} ${indicatorLower} points`);
        }

        results[indicatorLower] = {
          values: data.values.map((v: any) => ({
            datetime: v.datetime,
            [indicatorLower]: parseFloat(v[indicatorLower])
          })),
          meta: data.meta,
          cached: false
        };
      })
    );

    return new Response(
      JSON.stringify({
        instrument,
        interval,
        time_period,
        indicators: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-technical-indicators:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
