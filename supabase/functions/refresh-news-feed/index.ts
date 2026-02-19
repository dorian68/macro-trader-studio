import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_CATEGORIES = ['all', 'general', 'forex', 'crypto', 'merger'] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category = 'all' } = req.method === 'POST' 
      ? await req.json().catch(() => ({ category: 'all' }))
      : { category: 'all' };

    if (!ALLOWED_CATEGORIES.includes(category as any)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}` 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!FINNHUB_API_KEY) {
      throw new Error('FINNHUB_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // "all" mode: fetch from DB across all categories, refresh if stale
    if (category === 'all') {
      const { data: lastNews } = await supabase
        .from('news_feed')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = Date.now();
      const lastRefresh = lastNews ? new Date(lastNews.created_at).getTime() : 0;
      const TTL_MS = 30 * 60 * 1000;

      if (now - lastRefresh >= TTL_MS) {
        // Refresh all categories
        const categoriesToFetch = ['general', 'forex', 'crypto', 'merger'];
        for (const cat of categoriesToFetch) {
          try {
            const finnhubRes = await fetch(
              `https://finnhub.io/api/v1/news?category=${cat}&token=${FINNHUB_API_KEY}`
            );
            if (finnhubRes.ok) {
              const newsData = await finnhubRes.json();
              const top30 = newsData.slice(0, 30);
              const newsToInsert = top30.map((item: any) => ({
                id: item.id,
                category: cat,
                datetime: new Date(item.datetime * 1000).toISOString(),
                headline: item.headline,
                image: item.image || null,
                source: item.source,
                summary: item.summary || '',
                url: item.url,
              }));
              await supabase.from('news_feed').upsert(newsToInsert, { onConflict: 'id' });
            }
          } catch (e) {
            console.error(`Error fetching ${cat}:`, e);
          }
        }

        // Clean old news > 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('news_feed').delete().lt('created_at', sevenDaysAgo);
      }

      const { data } = await supabase
        .from('news_feed')
        .select('*')
        .order('datetime', { ascending: false })
        .limit(80);

      return new Response(JSON.stringify({ data, cached: now - lastRefresh < TTL_MS, category: 'all' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single category mode
    const { data: lastNews } = await supabase
      .from('news_feed')
      .select('created_at')
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    const lastRefresh = lastNews ? new Date(lastNews.created_at).getTime() : 0;
    const TTL_MS = 30 * 60 * 1000;

    if (now - lastRefresh < TTL_MS) {
      const { data } = await supabase
        .from('news_feed')
        .select('*')
        .eq('category', category)
        .order('datetime', { ascending: false })
        .limit(50);
      
      return new Response(JSON.stringify({ data, cached: true, category }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔄 Fetching fresh news from Finnhub for category: ${category}...`);
    const finnhubRes = await fetch(
      `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_API_KEY}`
    );
    
    if (!finnhubRes.ok) {
      throw new Error(`Finnhub API error: ${finnhubRes.status}`);
    }

    const newsData = await finnhubRes.json();
    const top30 = newsData.slice(0, 30);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('news_feed')
      .delete()
      .eq('category', category)
      .lt('created_at', sevenDaysAgo);

    const newsToInsert = top30.map((item: any) => ({
      id: item.id,
      category: category,
      datetime: new Date(item.datetime * 1000).toISOString(),
      headline: item.headline,
      image: item.image || null,
      source: item.source,
      summary: item.summary || '',
      url: item.url,
    }));

    const { error: upsertError } = await supabase
      .from('news_feed')
      .upsert(newsToInsert, { onConflict: 'id' });
    
    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw upsertError;
    }

    const { data } = await supabase
      .from('news_feed')
      .select('*')
      .eq('category', category)
      .order('datetime', { ascending: false })
      .limit(50);

    console.log(`✅ Successfully refreshed ${data?.length || 0} news items for category: ${category}`);

    return new Response(JSON.stringify({ data, cached: false, category }), {
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
