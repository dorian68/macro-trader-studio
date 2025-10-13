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

    let systemPrompt = `You are AURA (AlphaLens Unified Research Assistant), an AI assistant specialized in financial markets.

CRITICAL CAPABILITIES:
1. **Answer questions** about current page data (stats, trades, portfolios)
2. **Launch features** using your tools:
   - AI Trade Setup: Call launch_ai_trade_setup(instrument, timeframe, direction)
   - Macro Commentary: Call launch_macro_commentary(focus)
   - Reports: Call launch_report(report_type, instruments)

INTERACTION GUIDELINES:
- If a user says "lance un trade setup sur EUR/USD H1", immediately call launch_ai_trade_setup
- If missing parameters, ask conversationally: "Sur quelle timeframe ?" (not "Please specify timeframe")
- After launching, confirm with: "✅ Trade setup lancé ! Vous recevrez les résultats dans votre dashboard."
- Be concise (2-3 paragraphs max)
- Focus on actionable insights, risk management, and trading psychology
- For Backtester: analyze win rates, R/R ratios, recurring patterns
- For Portfolio: emphasize position sizing and diversification

Context: ${contextPage}`;

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
    }

    console.log("Sending request to Lovable AI Gateway with tool calling...");

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
        stream: false, // Tool calling requires non-streaming
        tools: [
          {
            type: "function",
            function: {
              name: "launch_ai_trade_setup",
              description: "Launch an AI Trade Setup analysis for a specific instrument and timeframe",
              parameters: {
                type: "object",
                properties: {
                  instrument: { type: "string", description: "Trading pair (e.g., EUR/USD, BTC/USD, Gold)" },
                  timeframe: { type: "string", enum: ["M1", "M5", "M15", "M30", "H1", "H4", "D1"], description: "Chart timeframe" },
                  direction: { type: "string", enum: ["Long", "Short", "Both"], description: "Trade direction (default: Both)" }
                },
                required: ["instrument", "timeframe"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "launch_macro_commentary",
              description: "Generate a comprehensive macro market commentary",
              parameters: {
                type: "object",
                properties: {
                  focus: { type: "string", description: "Market sector focus (e.g., FX, Commodities, Crypto)" }
                }
              }
            }
          },
          {
            type: "function",
            function: {
              name: "launch_report",
              description: "Generate a detailed market analysis report",
              parameters: {
                type: "object",
                properties: {
                  report_type: { type: "string", enum: ["daily", "weekly", "custom"], description: "Type of report" },
                  instruments: { type: "array", items: { type: "string" }, description: "List of instruments" }
                }
              }
            }
          }
        ],
        tool_choice: "auto"
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

    const data = await response.json();
    console.log("Lovable AI response:", JSON.stringify(data));
    const message = data.choices?.[0]?.message;
    console.log("Extracted message:", JSON.stringify(message));
    
    // Handle tool calls
    const toolCalls = message?.tool_calls;
    
    if (toolCalls && toolCalls.length > 0) {
      console.log("Tool calls detected:", JSON.stringify(toolCalls));
      
      // Return the tool call information to the client
      return new Response(JSON.stringify({ 
        toolCalls: toolCalls,
        message: message?.content || "Processing your request..."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No tool calls - return the response normally
    console.log("No tool calls detected, preparing normal response");
    console.log("Message content available:", !!message?.content);
    
    if (!message?.content) {
      console.error("No message content received from Lovable AI");
      return new Response(JSON.stringify({ 
        message: "Désolé, je n'ai pas pu générer une réponse. Pouvez-vous reformuler votre question ?"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Returning normal message, length:", message.content.length);
    return new Response(JSON.stringify({ message: message.content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
