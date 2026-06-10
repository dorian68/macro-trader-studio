import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { mapToTwelveData } from '../_shared/instrument-mappings.ts';
import { requireProductAccess } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { user, error: authError, status } = await requireProductAccess(req);
    if (!user) {
      return new Response(JSON.stringify({ error: authError }), {
        status: status ?? 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { instrument } = await req.json();
    if (typeof instrument !== 'string' || !instrument || instrument.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid instrument' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    const apiSymbol = mapToTwelveData(instrument);
    if (!apiKey || !apiSymbol) throw new Error('Market data provider is not configured for this instrument');

    const response = await fetch(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(apiSymbol)}&apikey=${apiKey}`,
    );
    const data = await response.json();
    const price = Number(data?.price);
    if (!response.ok || data?.status === 'error' || !Number.isFinite(price)) {
      throw new Error(data?.message || 'Failed to fetch current price');
    }

    return new Response(JSON.stringify({ instrument, price }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to fetch current price',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
