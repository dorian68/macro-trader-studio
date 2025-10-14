import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, limit = 10, instrument } = await req.json();
    
    console.log(`Fetching collective insights: type=${type}, limit=${limit}, instrument=${instrument || 'ALL'}`);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let data;

    switch (type) {
      case 'trade_setups':
        let setupsQuery = supabase
          .from('jobs')
          .select('id, feature, created_at, response_payload, request_payload')
          .eq('status', 'completed')
          .eq('feature', 'AI Trade Setup')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        // Apply instrument filter if provided
        if (instrument) {
          setupsQuery = setupsQuery.ilike('request_payload->instrument', `%${instrument}%`);
        }
        
        const { data: setups } = await setupsQuery;
        
        data = setups?.map(job => ({
          instrument: job.request_payload?.instrument || 'Unknown',
          direction: job.response_payload?.message?.content?.direction || 
                     job.response_payload?.content?.direction || 
                     job.response_payload?.direction,
          confidence: job.response_payload?.message?.content?.confidence ||
                      job.response_payload?.content?.confidence ||
                      job.response_payload?.confidence,
          created_at: job.created_at,
          entry_price: job.response_payload?.message?.content?.entry_price ||
                       job.response_payload?.content?.entry_price ||
                       job.response_payload?.entry_price,
        })) || [];
        break;

      case 'macro_commentary':
        let macrosQuery = supabase
          .from('jobs')
          .select('id, feature, created_at, response_payload, request_payload')
          .eq('status', 'completed')
          .eq('feature', 'Macro Commentary')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        // Apply instrument filter if provided
        if (instrument) {
          macrosQuery = macrosQuery.ilike('request_payload->instrument', `%${instrument}%`);
        }
        
        const { data: macros } = await macrosQuery;
        
        data = macros?.map(job => ({
          instrument: job.request_payload?.instrument || 'General',
          summary: job.response_payload?.message?.content?.content?.substring(0, 300) || 
                   job.response_payload?.content?.substring(0, 300) ||
                   job.response_payload?.summary?.substring(0, 300),
          created_at: job.created_at,
        })) || [];
        break;

      case 'reports':
        let reportsQuery = supabase
          .from('jobs')
          .select('id, feature, created_at, response_payload, request_payload')
          .eq('status', 'completed')
          .eq('feature', 'Reports')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        // Apply instrument filter if provided (check instruments array)
        if (instrument) {
          reportsQuery = reportsQuery.contains('request_payload->instruments', [instrument]);
        }
        
        const { data: reports } = await reportsQuery;
        
        data = reports?.map(job => ({
          report_type: job.request_payload?.report_type || 'custom',
          instruments: job.request_payload?.instruments || [],
          summary: job.response_payload?.message?.content?.substring(0, 300) ||
                   job.response_payload?.content?.substring(0, 300),
          created_at: job.created_at,
        })) || [];
        break;

      case 'abcg_insights':
        const { data: insights } = await supabase
          .from('abcg_chunks')
          .select(`
            content,
            created_at,
            abcg_documents (
              title,
              topics,
              tickers
            )
          `)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        data = insights?.map(chunk => ({
          title: chunk.abcg_documents?.title,
          content: chunk.content.substring(0, 500),
          topics: chunk.abcg_documents?.topics,
          tickers: chunk.abcg_documents?.tickers,
          created_at: chunk.created_at,
        })) || [];
        break;

      case 'instrument_focus':
        const { data: allSetups } = await supabase
          .from('jobs')
          .select('request_payload, created_at')
          .eq('status', 'completed')
          .eq('feature', 'AI Trade Setup')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });
        
        const instrumentCounts: Record<string, number> = {};
        allSetups?.forEach(job => {
          const inst = job.request_payload?.instrument;
          if (inst) {
            instrumentCounts[inst] = (instrumentCounts[inst] || 0) + 1;
          }
        });
        
        data = Object.entries(instrumentCounts)
          .map(([instrument, count]) => ({ instrument, count }))
          .sort((a, b) => (b.count as number) - (a.count as number))
          .slice(0, limit);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid type' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Collective insights error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
