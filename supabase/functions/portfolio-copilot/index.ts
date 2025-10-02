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
    const { trades, question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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

    // Calculate portfolio stats
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t: any) => t.pnl > 0);
    const losingTrades = trades.filter((t: any) => t.pnl < 0);
    const winRate = (winningTrades.length / totalTrades) * 100;
    const totalPnl = trades.reduce((sum: number, t: any) => sum + t.pnl, 0);
    const largestGain = Math.max(...trades.map((t: any) => t.pnl));
    const largestLoss = Math.min(...trades.map((t: any) => t.pnl));
    const avgLeverage = trades.reduce((sum: number, t: any) => sum + t.leverage, 0) / totalTrades;

    // Instrument breakdown
    const instrumentStats = trades.reduce((acc: any, trade: any) => {
      if (!acc[trade.instrument]) {
        acc[trade.instrument] = { wins: 0, losses: 0, totalPnl: 0, count: 0 };
      }
      acc[trade.instrument].count += 1;
      acc[trade.instrument].totalPnl += trade.pnl;
      if (trade.pnl > 0) acc[trade.instrument].wins += 1;
      else acc[trade.instrument].losses += 1;
      return acc;
    }, {});

    const systemPrompt = `You are Alphalens AI Co-Pilot, a professional trading assistant specialized in portfolio analysis and risk management.

Portfolio Summary:
- Total Trades: ${totalTrades}
- Win Rate: ${winRate.toFixed(2)}% (${winningTrades.length} wins, ${losingTrades.length} losses)
- Total PNL: $${totalPnl.toFixed(2)}
- Largest Gain: $${largestGain.toFixed(2)}
- Largest Loss: $${largestLoss.toFixed(2)}
- Average Leverage: ${avgLeverage.toFixed(1)}x

Instrument Performance:
${Object.entries(instrumentStats)
  .map(([instrument, stats]: [string, any]) => 
    `- ${instrument}: ${stats.count} trades, Win Rate: ${((stats.wins / stats.count) * 100).toFixed(1)}%, Total PNL: $${stats.totalPnl.toFixed(2)}`
  )
  .join('\n')}

Individual Trades Data (for detailed analysis):
${JSON.stringify(trades, null, 2)}

Instructions:
- Provide clear, actionable insights based on the data
- Be professional but conversational
- Focus on risk management and trading psychology
- Identify patterns (over-leveraging, instrument biases, holding time issues)
- Suggest concrete improvements
- Keep responses concise (2-4 paragraphs max unless asked for deep analysis)
- Use bullet points for clarity when listing multiple items`;

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
    console.error("portfolio-copilot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
