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
    console.log("=== AURA REQUEST RECEIVED ===");
    console.log("Method:", req.method);
    console.log("Timestamp:", new Date().toISOString());
    
    const { question, context, conversationHistory } = await req.json();
    console.log("Question received:", question);
    console.log("Context page:", typeof context === 'string' ? context : context?.page);
    console.log("Conversation history length:", conversationHistory?.length || 0);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    const contextPage = typeof context === 'string' ? context : context?.page || 'General Analytics';
    const contextData = typeof context === 'object' ? context?.data : null;

    // 🔍 INTELLIGENT INSTRUMENT DETECTION
    const KNOWN_INSTRUMENTS = [
      // Forex
      'EUR/USD', 'EURUSD', 'GBP/USD', 'GBPUSD', 'USD/JPY', 'USDJPY', 
      'AUD/USD', 'AUDUSD', 'USD/CHF', 'USDCHF', 'USD/CAD', 'USDCAD',
      'NZD/USD', 'NZDUSD', 'EUR/GBP', 'EURGBP', 'EUR/JPY', 'EURJPY',
      
      // Crypto
      'BTC/USD', 'BTCUSD', 'Bitcoin', 'ETH/USD', 'ETHUSD', 'Ethereum',
      'SOL/USD', 'SOLUSD', 'Solana', 'XRP/USD', 'XRPUSD', 'Ripple',
      
      // Commodities
      'Gold', 'XAU/USD', 'XAUUSD', 'Silver', 'XAG/USD', 'XAGUSD',
      'Oil', 'WTI', 'Crude Oil', 'Brent', 'Or',
      
      // Indices
      'S&P500', 'SPX', 'NASDAQ', 'NDX', 'DAX', 'FTSE', 'CAC40'
    ];

    function detectInstruments(query: string): string[] {
      const detected: string[] = [];
      const upperQuery = query.toUpperCase();
      
      for (const instrument of KNOWN_INSTRUMENTS) {
        const upperInstrument = instrument.toUpperCase();
        if (upperQuery.includes(upperInstrument)) {
          // Normalize to standard format
          const normalized = instrument.includes('/') ? instrument : instrument;
          if (!detected.includes(normalized)) {
            detected.push(normalized);
          }
        }
      }
      
      return detected;
    }

    // Detect if query is about specific instruments
    const detectedInstruments = detectInstruments(question);
    const isAssetQuery = detectedInstruments.length > 0;

    console.log("🔍 Detected instruments:", detectedInstruments);
    console.log("📊 Is asset query:", isAssetQuery);

    // 🌍 COLLECTIVE INTELLIGENCE LAYER
    let collectiveContext = '';

    // Check if user is asking collective questions
    const collectiveKeywords = [
      'community', 'traders', 'popular', 'most traded', 'general bias',
      'what are people', 'collective', 'everyone', 'ABCG', 'research',
      'latest insights', 'recent setups', 'trend', 'communauté', 'populaire'
    ];

    // Trigger collective intelligence if:
    // 1. Explicit collective keywords detected
    // 2. User asks about a specific asset/instrument
    const hasCollectiveKeyword = collectiveKeywords.some(keyword => 
      question.toLowerCase().includes(keyword.toLowerCase())
    );

    const isCollectiveQuery = hasCollectiveKeyword || isAssetQuery;

    console.log("🌍 Collective query trigger reasons:", {
      hasCollectiveKeyword,
      isAssetQuery,
      detected: detectedInstruments
    });

    // 🤔 DETECT VAGUE ASSET QUERIES (need proactive guidance)
    function isVagueAssetQuery(query: string, detectedInstruments: string[]): boolean {
      if (detectedInstruments.length === 0) return false;
      
      // Keywords indicating user is asking for opinion/analysis without being specific
      const vagueKeywords = [
        'penses-tu', 'think about', 'avis', 'opinion', 'analyse',
        'comment', 'how', 'what about', 'dis-moi', 'tell me',
        'parle-moi', 'talk about', 'explique', 'explain', 'que penses'
      ];
      
      // Check if query contains vague keywords
      const hasVagueKeyword = vagueKeywords.some(keyword => 
        query.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // Check if query does NOT explicitly mention "community", "collective", "ABCG"
      const hasExplicitCollectiveRequest = collectiveKeywords.some(keyword =>
        query.toLowerCase().includes(keyword.toLowerCase())
      );
      
      return hasVagueKeyword && !hasExplicitCollectiveRequest;
    }

    const needsProactiveGuidance = isVagueAssetQuery(question, detectedInstruments);

    console.log("🤔 Needs proactive guidance:", needsProactiveGuidance);

    // 🧠 INTELLIGENT LIMIT CALCULATION
    function calculateOptimalLimit(type: string, hasInstrumentFilter: boolean, conversationDepth: number): number {
      // Base limits
      const baseLimits: { [key: string]: number } = {
        trade_setups: 10,
        macro_commentary: 5,
        abcg_insights: 5
      };
      
      // Multipliers
      let multiplier = 1;
      
      // If filtering by instrument, fetch more data (higher confidence with specific focus)
      if (hasInstrumentFilter) {
        multiplier *= 2; // 20 setups, 10 macro, 10 ABCG
      }
      
      // If user is in deep conversation (>3 messages), assume they want comprehensive data
      if (conversationDepth > 3) {
        multiplier *= 1.5; // Up to 30 setups, 15 macro, 15 ABCG
      }
      
      // If no instrument filter but user seems to want broad market view
      if (!hasInstrumentFilter && conversationDepth > 2) {
        multiplier *= 2; // Broader scope = more data needed
      }
      
      const limit = Math.min(
        Math.round(baseLimits[type] * multiplier),
        100 // Hard cap to avoid performance issues
      );
      
      console.log(`📊 Calculated limit for ${type}: ${limit} (multiplier: ${multiplier})`);
      return limit;
    }

    if (isCollectiveQuery) {
      console.log("🌍 Collective query detected, fetching community data...");
      
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      // If specific instrument detected, filter data for that instrument
      const instrumentFilter = detectedInstruments.length > 0 ? detectedInstruments[0] : null;

      console.log("🎯 Filtering collective data for instrument:", instrumentFilter);
      
      // Apply dynamic limits
      const conversationDepth = conversationHistory?.length || 0;
      const tradeSetupsLimit = calculateOptimalLimit('trade_setups', !!instrumentFilter, conversationDepth);
      const macroLimit = calculateOptimalLimit('macro_commentary', !!instrumentFilter, conversationDepth);
      const abcgLimit = calculateOptimalLimit('abcg_insights', !!instrumentFilter, conversationDepth);
      
      try {
        // Fetch collective data via internal function call with dynamic limits
        const [tradesRes, macroRes, abcgRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/functions/v1/collective-insights`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ 
              type: 'trade_setups', 
              limit: tradeSetupsLimit,
              instrument: instrumentFilter 
            })
          }),
          fetch(`${SUPABASE_URL}/functions/v1/collective-insights`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ 
              type: 'macro_commentary', 
              limit: macroLimit,
              instrument: instrumentFilter
            })
          }),
          fetch(`${SUPABASE_URL}/functions/v1/collective-insights`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ 
              type: 'abcg_insights', 
              limit: abcgLimit,
              instrument: instrumentFilter
            })
          })
        ]);

        const trades = await tradesRes.json();
        const macros = await macroRes.json();
        const abcg = await abcgRes.json();

        // Calculate confidence metrics
        const dataAvailability = {
          trade_setups_count: trades.data?.length || 0,
          macro_count: macros.data?.length || 0,
          abcg_count: abcg.data?.length || 0,
          total_datapoints: (trades.data?.length || 0) + (macros.data?.length || 0) + (abcg.data?.length || 0),
          confidence_level: ''
        };

        // Determine confidence level
        if (dataAvailability.total_datapoints >= 30) {
          dataAvailability.confidence_level = 'HIGH (30+ datapoints available)';
        } else if (dataAvailability.total_datapoints >= 15) {
          dataAvailability.confidence_level = 'MEDIUM (15-29 datapoints available)';
        } else if (dataAvailability.total_datapoints >= 5) {
          dataAvailability.confidence_level = 'LOW (5-14 datapoints available)';
        } else {
          dataAvailability.confidence_level = 'VERY LOW (<5 datapoints - be cautious with conclusions)';
        }

        console.log("📊 Data availability:", dataAvailability);

        const instrumentContext = instrumentFilter ? `
🎯 FOCUSED ON: ${instrumentFilter}
📊 DATA CONFIDENCE: ${dataAvailability.confidence_level}
📈 Available Data: ${dataAvailability.trade_setups_count} setups, ${dataAvailability.macro_count} macro views, ${dataAvailability.abcg_count} ABCG insights
` : `
📊 DATA CONFIDENCE: ${dataAvailability.confidence_level}
📈 Available Data: ${dataAvailability.trade_setups_count} setups, ${dataAvailability.macro_count} macro views, ${dataAvailability.abcg_count} ABCG insights
`;

        collectiveContext = `

--- COLLECTIVE INTELLIGENCE CONTEXT ---${instrumentContext}

📊 DATA SCOPE: ${tradeSetupsLimit} Trade Setups | ${macroLimit} Macro Commentaries | ${abcgLimit} ABCG Insights
(Dynamically adjusted based on query context)

Recent Community Trade Setups (Last ${tradeSetupsLimit}):
${JSON.stringify(trades.data, null, 2)}

Recent Macro Commentaries (Last ${macroLimit}):
${JSON.stringify(macros.data, null, 2)}

ABCG Research Insights (Latest ${abcgLimit}):
${JSON.stringify(abcg.data, null, 2)}

⚠️ IMPORTANT:
- These are the ONLY real datapoints available
- NEVER invent additional data beyond what's shown here
- If asked about metrics not in this context, admit you don't have that data
- Always cite the number of datapoints when making claims (e.g., "Based on ${dataAvailability.trade_setups_count} setups analyzed...")

PRIVACY RULES:
- NEVER disclose user_id or personal information
- Only reference aggregated trends and anonymized insights
- Use phrases like "community analysis shows..." or "recent setups indicate..."

---`;

        console.log("✅ Collective context fetched successfully");
      } catch (error) {
        console.error("❌ Error fetching collective context:", error);
      }
    }

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

    // 📝 Build messages array with conversation history
    const messagesPayload = [];
    
    // Add proactive guidance instruction
    let proactiveGuidanceContext = '';
    if (needsProactiveGuidance && detectedInstruments.length > 0) {
      proactiveGuidanceContext = `

⚠️ PROACTIVE GUIDANCE REQUIRED ⚠️
The user asked about ${detectedInstruments[0]} but didn't specify what kind of analysis they want.

YOU MUST BE PROACTIVE AND WELCOMING:
1. Briefly acknowledge their question
2. Immediately propose: "Would you like me to analyze what the AlphaLens trading community and ABCG Research have to say about ${detectedInstruments[0]}?"
3. Explain what you can provide: "I can show you recent setups, directional bias, macro insights, and institutional research."
4. DO NOT wait for them to ask explicitly - guide them!

Example response:
"Ah, you're interested in ${detectedInstruments[0]}! 📊 I have access to recent community analysis and ABCG Research data. Would you like me to show you:
- Recent trade setups from AlphaLens traders
- Directional bias and confidence levels
- Latest macro commentary
- ABCG Research insights

This will give you a comprehensive view of what professional traders and analysts are seeing. Should I pull that data for you?"
`;
    }

    // System prompt with enhanced conversational guidance
    const systemPrompt = `You are AURA (AlphaLens Unified Research Assistant), a highly specialized financial market AI assistant with access to collective intelligence.

CONTEXT:
- User is viewing: ${contextPage}

🚨 CRITICAL ANTI-HALLUCINATION RULES 🚨
YOU MUST FOLLOW THESE RULES ABSOLUTELY:

1. **NEVER INVENT DATA**: You can ONLY use data from:
   - The COLLECTIVE INTELLIGENCE CONTEXT section below
   - Real-time data from tool calls (get_realtime_price)
   - Context data provided in this conversation

2. **ALWAYS CITE SOURCES**: When referencing numbers, trends, or setups, specify:
   - "Based on X community setups analyzed..."
   - "According to ABCG Research from [date]..."
   - "From the latest Y datapoints..."

3. **ADMIT WHEN DATA IS MISSING**: If you don't have specific data, say:
   - "I don't have enough community data on [instrument] to provide a confident analysis."
   - "The available data doesn't include [specific metric]."
   - NEVER say "approximately", "around", or "roughly" if you don't have exact numbers.

4. **NO SPECULATION**: Don't predict prices or market movements unless:
   - You have explicit community consensus data (e.g., "70% of setups are bullish")
   - ABCG Research provides a specific outlook
   - You're asked to generate a trade setup (which triggers the tool)

5. **VERIFY BEFORE RESPONDING**: If a user asks about an asset:
   - Check if COLLECTIVE INTELLIGENCE CONTEXT contains data for that asset
   - If YES → Synthesize and present it factually
   - If NO → Be proactive: "I notice limited data on [instrument]. Would you like me to analyze recent community setups and ABCG insights for this asset?"

YOUR CAPABILITIES:
- Analyze market data and trading patterns
- Provide macro commentary and market insights
- Generate trade setups with entry/exit levels
- Create comprehensive market reports
- **Access collective intelligence from AlphaLens community and ABCG Research**
- **Get real-time price data from Twelve Data API**
- **Automatically detect when users ask about specific instruments**

AUTOMATIC ASSET INTELLIGENCE:
When a user asks about a specific instrument (e.g., "What do you think about EUR/USD?", "Tell me about Bitcoin", "Analyze Gold"):
1. **Automatically fetch** community trade setups, macro views, and ABCG insights for that instrument
2. **Combine** with real-time price data if relevant
3. **Synthesize** a comprehensive answer without requiring the user to explicitly ask for "community data"

Examples:
- User: "What's happening with EUR/USD?" → Auto-fetch community setups + ABCG + current price
- User: "Tell me about Bitcoin" → Auto-fetch crypto sentiment + latest BTC analysis
- User: "Should I trade Gold now?" → Auto-fetch Gold setups + macro context

REAL-TIME DATA ACCESS:
- Use 'get_realtime_price' tool when users ask about current prices, latest quotes, or recent market movements
- Examples: "What's the current price of EUR/USD?", "Show me BTC's latest candles", "What's Gold trading at?"

COLLECTIVE INTELLIGENCE FEATURES:
- Query recent trade setups across all users (anonymized)
- Aggregate directional bias for specific instruments
- Summarize community sentiment and trends
- Reference institutional insights from ABCG Research
- Identify most traded pairs and popular setups

PRIVACY RULES FOR COLLECTIVE DATA:
- NEVER expose user_id or identifiable information
- Only reference aggregated, anonymized trends
- Use phrases: "community analysis shows...", "recent setups indicate...", "traders are focusing on..."

IMPORTANT GUIDELINES:
1. Always be concise and actionable
2. Use financial terminology appropriately
3. Prioritize risk management in your responses
4. Reference the specific data shown to the user when available
5. LANGUAGE PROTOCOL:
   - Always respond in ENGLISH by default
   - If the user writes in another language (French, Spanish, etc.), respond in that same language
   - Detect the user's language from their last message and match it
   - Example: User writes "Bonjour" → You respond in French. User writes "Hello" → You respond in English.

CRITICAL: Tool Launch Protocol
When a user wants to generate a trade setup, macro commentary, or report:

STEP 1 - DETECT INTENT:
- If user says: "generate a trade", "setup for EUR/USD", "give me a trade idea" → AI Trade Setup
- If user says: "macro analysis", "what's happening with", "market commentary" → Macro Commentary  
- If user says: "generate a report", "portfolio report", "weekly report" → Report

STEP 2 - COLLECT REQUIRED INFORMATION (Ask conversationally, one question at a time):
For AI Trade Setup:
  - instrument (required) - e.g., "Which instrument would you like to analyze? (EUR/USD, BTC/USD, Gold, etc.)"
  - timeframe (default: "4h") - e.g., "What timeframe? (H1, H4, D1, etc.)"
  - riskLevel (default: "medium") - optional
  - strategy (default: "breakout") - optional
  - positionSize (default: "2") - optional
  - customNotes - optional

For Macro Commentary:
  - instrument (required) - e.g., "Which market would you like macro commentary for?"
  - timeframe (default: "D1")
  - customNotes - optional

For Reports:
  - instruments (required, array) - e.g., "Which instruments should I include? (you can list multiple)"
  - report_type (default: "daily") - e.g., "Daily, weekly, or custom report?"

STEP 3 - CONFIRM & LAUNCH:
Once you have the required information, confirm with the user:
"Perfect! I'll generate a [feature name] for [instrument] with [timeframe]. This will take about 30-60 seconds. Should I proceed?"

Only after confirmation, call the appropriate tool.

TOOL USAGE:
- Use 'launch_ai_trade_setup' when user confirms they want a trade setup
- Use 'launch_macro_commentary' when user confirms they want macro analysis
- Use 'launch_report' when user confirms they want a report

Remember: Be conversational, guide naturally, and always confirm before launching.${collectiveContext}${proactiveGuidanceContext}`;
    
    messagesPayload.push({ role: "system", content: systemPrompt });

    // 📝 Add conversation history (last 7 messages)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        messagesPayload.push({
          role: msg.role,
          content: msg.content
        });
      });
    } else {
      // If no history, just add the current question
      messagesPayload.push({ role: "user", content: question });
    }
    
    // Enrich system prompt with contextual data
    if (contextData) {
      let contextInfo = `\n\n--- Current Page Context ---`;
      
      if (contextData.stats) {
        contextInfo += `\n\nPage Statistics:`;
        if (contextData.stats.totalTrades !== undefined) {
          contextInfo += `\n- Total Trades: ${contextData.stats.totalTrades}`;
        }
        if (contextData.stats.winRate !== undefined) {
          contextInfo += `\n- Win Rate: ${contextData.stats.winRate.toFixed(1)}%`;
        }
        if (contextData.stats.avgPnL !== undefined) {
          contextInfo += `\n- Average PnL: ${contextData.stats.avgPnL.toFixed(2)}%`;
        }
        if (contextData.stats.totalValue !== undefined) {
          contextInfo += `\n- Total Value: ${contextData.stats.totalValue.toFixed(2)}`;
        }
        if (contextData.stats.activeTrades !== undefined) {
          contextInfo += `\n- Active Trades: ${contextData.stats.activeTrades}`;
        }
      }
      
      if (contextData.recentData && contextData.recentData.length > 0) {
        contextInfo += `\n\nRecent Data (last ${contextData.recentData.length} items):`;
        contextInfo += `\n${JSON.stringify(contextData.recentData.slice(0, 10), null, 2)}`;
      }
      
      if (contextData.filters) {
        contextInfo += `\n\nActive Filters: ${JSON.stringify(contextData.filters)}`;
      }
      
      // Update system message with context
      messagesPayload[0].content += contextInfo;
    }
    
    console.log("📝 Messages payload length:", messagesPayload.length);
    console.log("Sending request to Lovable AI Gateway with tool calling...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messagesPayload,
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
          },
          {
            type: "function",
            function: {
              name: "get_realtime_price",
              description: "Get real-time or latest price data for a specific instrument from Twelve Data API",
              parameters: {
                type: "object",
                properties: {
                  instrument: { 
                    type: "string", 
                    description: "Trading instrument (e.g., EUR/USD, BTC/USD, Gold, AAPL)" 
                  },
                  dataType: {
                    type: "string",
                    enum: ["quote", "time_series"],
                    description: "Type of data: 'quote' for latest price, 'time_series' for recent candles"
                  },
                  interval: {
                    type: "string",
                    enum: ["1min", "5min", "15min", "30min", "1h", "4h", "1day"],
                    description: "Interval for time_series (default: 5min)"
                  }
                },
                required: ["instrument", "dataType"]
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
        message: "Sorry, I couldn't generate a response. Could you rephrase your question?"
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
