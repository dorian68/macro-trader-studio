import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!FINNHUB_API_KEY) {
      throw new Error('FINNHUB_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check last refresh time
    const { data: lastNews } = await supabase
      .from('news_feed')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    const lastRefresh = lastNews ? new Date(lastNews.created_at).getTime() : 0;
    const TTL_MS = 30 * 60 * 1000; // 30 minutes

    if (now - lastRefresh < TTL_MS) {
      console.log('✅ Cached news still fresh');
      const { data } = await supabase
        .from('news_feed')
        .select('*')
        .order('datetime', { ascending: false })
        .limit(20);
      
      return new Response(JSON.stringify({ data, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch fresh news from Finnhub
    console.log('🔁 Refreshing news from Finnhub...');
    const finnhubRes = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`
    );
    
    if (!finnhubRes.ok) {
      throw new Error(`Finnhub API error: ${finnhubRes.status}`);
    }

    const newsData = await finnhubRes.json();
    const top20 = newsData.slice(0, 20);

    // Clear old news
    await supabase.from('news_feed').delete().neq('id', 0);

    // Insert fresh news
    const newsToInsert = top20.map((item: any) => ({
      id: item.id,
      category: item.category || 'general',
      datetime: new Date(item.datetime * 1000).toISOString(),
      headline: item.headline,
      image: item.image || null,
      source: item.source,
      summary: item.summary || '',
      url: item.url,
    }));

    const { error: insertError } = await supabase.from('news_feed').insert(newsToInsert);
    
    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    const { data } = await supabase
      .from('news_feed')
      .select('*')
      .order('datetime', { ascending: false })
      .limit(20);

    console.log(`✅ Successfully refreshed ${data?.length || 0} news items`);

    return new Response(JSON.stringify({ data, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error refreshing news:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
