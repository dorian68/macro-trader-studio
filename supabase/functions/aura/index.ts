import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    const contextPage = typeof context === 'string' ? context : context?.page || 'General Analytics';
    const contextData = typeof context === 'object' ? context?.data : null;

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let systemPrompt = `You are AURA (AlphaLens Unified Research Assistant), a professional AI assistant specialized in portfolio analysis, trade setup evaluation, backtesting insights, and risk management.

Context: ${contextPage}

Instructions:
- Provide clear, actionable insights based on the data
- Be professional but conversational
- Focus on risk management and trading psychology
- Identify patterns (over-leveraging, instrument biases, holding time issues, strategy performance)
- Suggest concrete improvements
- Keep responses concise (2-4 paragraphs max unless asked for deep analysis)
- Use bullet points for clarity when listing multiple items
- For Backtester context, focus on win rates, R/R ratios, and recurring patterns
- For Portfolio context, emphasize position sizing and diversification
- For Scenario Simulator context, focus on risk scenarios and stress testing`;

    // Enrich with contextual data
    if (contextData) {
      systemPrompt += `\n\n--- Current Page Context ---`;
      
      if (contextData.stats) {
        systemPrompt += `\n\nPage Statistics:`;
        if (contextData.stats.totalTrades !== undefined) {
          systemPrompt += `\n- Total Trades: ${contextData.stats.totalTrades}`;
        }
        if (contextData.stats.winRate !== undefined) {
          systemPrompt += `\n- Win Rate: ${contextData.stats.winRate.toFixed(1)}%`;
        }
        if (contextData.stats.avgPnL !== undefined) {
          systemPrompt += `\n- Average PnL: ${contextData.stats.avgPnL.toFixed(2)}%`;
        }
        if (contextData.stats.totalValue !== undefined) {
          systemPrompt += `\n- Total Value: ${contextData.stats.totalValue.toFixed(2)}`;
        }
        if (contextData.stats.activeTrades !== undefined) {
          systemPrompt += `\n- Active Trades: ${contextData.stats.activeTrades}`;
        }
      }
      
      if (contextData.recentData && contextData.recentData.length > 0) {
        systemPrompt += `\n\nRecent Data (last ${contextData.recentData.length} items):`;
        systemPrompt += `\n${JSON.stringify(contextData.recentData.slice(0, 10), null, 2)}`;
      }
      
      if (contextData.filters) {
        systemPrompt += `\n\nActive Filters: ${JSON.stringify(contextData.filters)}`;
      }
      
      // Add contextual quick action suggestions
      if (contextPage === 'Backtester' && contextData.stats) {
        systemPrompt += `\n\nSuggested Quick Actions:`;
        if (contextData.stats.winRate && contextData.stats.winRate < 50) {
          systemPrompt += `\n- Analyze why win rate is below 50%`;
        }
        if (contextData.stats.totalTrades && contextData.stats.totalTrades < 10) {
          systemPrompt += `\n- Suggest generating more trade setups`;
        }
      }
      
      if (contextPage === 'Portfolio Analytics' && contextData.stats) {
        systemPrompt += `\n\nSuggested Quick Actions:`;
        if (contextData.stats.activeTrades && contextData.stats.activeTrades > 0) {
          systemPrompt += `\n- Review active positions and risk exposure`;
        }
      }
    }

    console.log("Sending request to Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("aura error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
