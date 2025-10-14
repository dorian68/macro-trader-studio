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
    const { type, limit = 10, instrument, days } = await req.json();
    
    console.log(`Fetching collective insights: type=${type}, limit=${limit}, instrument=${instrument || 'ALL'}, days=${days || 'ALL'}`);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let data;

    switch (type) {
      case 'trade_setups':
        let setupsQuery = supabase
          .from('jobs')
          .select('id, feature, created_at, response_payload, request_payload, user_id')
          .eq('status', 'completed')
          .or('feature.eq.AI Trade Setup,feature.eq.ai_trade_setup,feature.eq.Trade Setup')
          .order('created_at', { ascending: false });
        
        // Apply date filter if provided (only if days is a number)
        if (typeof days === 'number' && days > 0) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          setupsQuery = setupsQuery.gte('created_at', cutoffDate.toISOString());
        }
        
        // Apply instrument filter if provided (use ->> for text extraction from JSONB)
        if (instrument) {
          setupsQuery = setupsQuery.ilike('request_payload->>instrument', `%${instrument}%`);
        }
        
        setupsQuery = setupsQuery.limit(limit);
        const { data: setups } = await setupsQuery;
        
        // Récupérer les emails des utilisateurs
        const userIds = [...new Set(setups?.map(job => job.user_id).filter(Boolean) || [])];
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const userEmailMap = new Map(
          users?.map(u => [u.id, u.email]) || []
        );
        
        data = setups?.map(job => {
          const content = job.response_payload?.message?.content || job.response_payload?.content || job.response_payload;
          return {
            user_email: userEmailMap.get(job.user_id) || null,
            instrument: job.request_payload?.instrument || 'Unknown',
            direction: content?.direction,
            confidence: content?.confidence,
            entry_price: content?.entry_price || content?.entry || content?.entryPrice,
            tp: content?.tp || content?.take_profit || content?.takeProfit,
            tp1: content?.tp1 || content?.take_profit_1 || content?.takeProfits?.[0],
            tp2: content?.tp2 || content?.take_profit_2 || content?.takeProfits?.[1],
            tp3: content?.tp3 || content?.take_profit_3 || content?.takeProfits?.[2],
            sl: content?.sl || content?.stop_loss || content?.stopLoss,
            strategy: content?.strategy || content?.strategyMeta?.name,
            timeframe: content?.timeframe || content?.timeFrame,
            rationale: content?.rationale || content?.reasoning || content?.commentary,
            risk_reward_ratio: content?.risk_reward_ratio || content?.riskRewardRatio,
            created_at: job.created_at,
          };
        }) || [];
        break;

      case 'macro_commentary':
        let macrosQuery = supabase
          .from('jobs')
          .select('id, feature, created_at, response_payload, request_payload, user_id')
          .eq('status', 'completed')
          .or('feature.eq.Macro Commentary,feature.eq.macro_commentary,feature.eq.Macro Analysis')
          .order('created_at', { ascending: false });
        
        // Apply date filter if provided (only if days is a number)
        if (typeof days === 'number' && days > 0) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          macrosQuery = macrosQuery.gte('created_at', cutoffDate.toISOString());
        }
        
        // Apply instrument filter if provided (use ->> for text extraction from JSONB)
        if (instrument) {
          macrosQuery = macrosQuery.ilike('request_payload->>instrument', `%${instrument}%`);
        }
        
        macrosQuery = macrosQuery.limit(limit);
        const { data: macros } = await macrosQuery;
        
        // Récupérer les emails des utilisateurs
        const userIdsMacro = [...new Set(macros?.map(job => job.user_id).filter(Boolean) || [])];
        const { data: { users: usersMacro } } = await supabase.auth.admin.listUsers();
        const userEmailMapMacro = new Map(
          usersMacro?.map(u => [u.id, u.email]) || []
        );
        
        data = macros?.map(job => {
          const content = job.response_payload?.message?.content || job.response_payload?.content || job.response_payload;
          const fullText = typeof content === 'string' ? content : (content?.content || content?.summary || '');
          return {
            user_email: userEmailMapMacro.get(job.user_id) || null,
            instrument: job.request_payload?.instrument || 'General',
            summary: fullText.substring(0, 500),
            full_content: fullText,
            market_outlook: content?.market_outlook || content?.outlook,
            key_points: content?.key_points || content?.keyPoints,
            sentiment: content?.sentiment || content?.market_sentiment,
            timeframe: job.request_payload?.timeframe,
            created_at: job.created_at,
          };
        }) || [];
        break;

      case 'reports':
        let reportsQuery = supabase
          .from('jobs')
          .select('id, feature, created_at, response_payload, request_payload, user_id')
          .eq('status', 'completed')
          .or('feature.eq.Reports,feature.eq.Report,feature.eq.reports')
          .order('created_at', { ascending: false });
        
        // Apply date filter if provided (only if days is a number)
        if (typeof days === 'number' && days > 0) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          reportsQuery = reportsQuery.gte('created_at', cutoffDate.toISOString());
        }
        
        // Fetch more data to filter client-side (avoid JSONB array contains issues)
        const fetchLimit = instrument ? limit * 3 : limit;
        reportsQuery = reportsQuery.limit(fetchLimit);
        const { data: allReports } = await reportsQuery;
        
        // Récupérer les emails des utilisateurs
        const userIdsReports = [...new Set(allReports?.map(job => job.user_id).filter(Boolean) || [])];
        const { data: { users: usersReports } } = await supabase.auth.admin.listUsers();
        const userEmailMapReports = new Map(
          usersReports?.map(u => [u.id, u.email]) || []
        );
        
        // Filter by instrument client-side if needed
        let reports = allReports;
        if (instrument && allReports) {
          reports = allReports.filter(job => {
            const instruments = job.request_payload?.instruments;
            return Array.isArray(instruments) && instruments.includes(instrument);
          }).slice(0, limit);
        }
        
        data = (reports || []).map(job => {
          const content = job.response_payload?.message?.content || job.response_payload?.content || job.response_payload;
          const fullText = typeof content === 'string' ? content : JSON.stringify(content);
          return {
            user_email: userEmailMapReports.get(job.user_id) || null,
            report_type: job.request_payload?.report_type || 'custom',
            instruments: job.request_payload?.instruments || [],
            summary: fullText.substring(0, 500),
            recommendations: content?.recommendations || content?.trade_recommendations,
            risk_analysis: content?.risk_analysis || content?.risks,
            market_overview: content?.market_overview || content?.overview,
            created_at: job.created_at,
          };
        });
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
        // Apply date filter (default 1 day, or custom days if number)
        const daysFilter = typeof days === 'number' && days > 0 ? days : 1;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysFilter);
        
        const { data: allSetups } = await supabase
          .from('jobs')
          .select('request_payload, created_at')
          .eq('status', 'completed')
          .or('feature.eq.AI Trade Setup,feature.eq.ai_trade_setup,feature.eq.Trade Setup')
          .gte('created_at', cutoffDate.toISOString())
          .order('created_at', { ascending: false });
        
        const instrumentCounts: Record<string, number> = {};
        allSetups?.forEach(job => {
          const inst = job.request_payload?.instrument;
          if (inst) {
            instrumentCounts[inst] = (instrumentCounts[inst] || 0) + 1;
          }
        });
        
        data = Object.entries(instrumentCounts)
          .map(([instrument, count]) => ({ instrument, count, period_days: daysFilter }))
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
