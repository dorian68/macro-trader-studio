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
    
    const { question, context, conversationHistory, sessionMemory } = await req.json();
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
      'Oil', 'WTI', 'Crude Oil', 'Brent',
      
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

    // 🕒 INTELLIGENT TIMEFRAME DETECTION
    function detectTimeframe(query: string): {
      horizon: string;
      interval: string;
      outputsize: number;
      startDate?: string;
      endDate: string;
    } {
      const lowerQuery = query.toLowerCase();
      const now = new Date();
      const endDate = now.toISOString();
      
      // Intraday patterns (hours)
      const hoursMatch = lowerQuery.match(/(?:last|past|previous)\s+(\d+)\s+hours?/i);
      if (hoursMatch) {
        const hours = parseInt(hoursMatch[1]);
        const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
        return {
          horizon: 'intraday',
          interval: hours <= 6 ? '5min' : '15min',
          outputsize: Math.min(hours * 12, 300),
          startDate,
          endDate
        };
      }
      
      // Daily patterns
      const daysMatch = lowerQuery.match(/(?:last|past|previous)\s+(\d+)\s+days?/i);
      if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
        return {
          horizon: 'daily',
          interval: days <= 7 ? '1h' : '1day',
          outputsize: days <= 7 ? days * 24 : Math.min(days, 200),
          startDate,
          endDate
        };
      }
      
      // Weekly patterns
      const weeksMatch = lowerQuery.match(/(?:last|past|previous)\s+(\d+)\s+weeks?/i);
      if (weeksMatch) {
        const weeks = parseInt(weeksMatch[1]);
        const startDate = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString();
        return {
          horizon: 'weekly',
          interval: weeks <= 8 ? '1day' : '1week',
          outputsize: weeks <= 8 ? weeks * 7 : Math.min(weeks, 100),
          startDate,
          endDate
        };
      }
      
      // Monthly patterns
      const monthsMatch = lowerQuery.match(/(?:last|past|previous)\s+(\d+)\s+months?/i);
      if (monthsMatch) {
        const months = parseInt(monthsMatch[1]);
        const startDate = new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000).toISOString();
        return {
          horizon: 'monthly',
          interval: '1week',
          outputsize: Math.min(months * 4, 100),
          startDate,
          endDate
        };
      }
      
      // Implicit patterns
      if (/short[\s-]?term/i.test(lowerQuery)) {
        return {
          horizon: 'intraday',
          interval: '15min',
          outputsize: 100,
          startDate: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
          endDate
        };
      }
      
      if (/medium[\s-]?term/i.test(lowerQuery)) {
        return {
          horizon: 'daily',
          interval: '1day',
          outputsize: 30,
          startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate
        };
      }
      
      if (/long[\s-]?term/i.test(lowerQuery)) {
        return {
          horizon: 'weekly',
          interval: '1week',
          outputsize: 52,
          startDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          endDate
        };
      }
      
      // DEFAULT: 1 day analysis (backward compatible)
      return {
        horizon: 'daily',
        interval: '1day',
        outputsize: 30,
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate
      };
    }

    const detectedTimeframe = detectTimeframe(question);
    console.log("🕒 Detected timeframe:", detectedTimeframe);

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

    // 🌍 DETECT USER LANGUAGE
  function detectLanguage(text: string): string {
    const lowerText = text.toLowerCase();
    
    // STRICT DETECTION: Use phrases and strong indicators only
    // French detection - require strong signals
    const strongFrenchIndicators = [
      'bonjour',
      'bonsoir', 
      'merci beaucoup',
      'que penses-tu',
      'parle-moi de',
      'dis-moi',
      'pourrais-tu',
      'peux-tu',
      'qu\'est-ce que',
      'est-ce que',
      's\'il te plaît',
      'stp'
    ];
    
    // Spanish detection
    const strongSpanishIndicators = [
      'hola',
      'buenos días',
      'gracias',
      'por favor',
      '¿qué opinas',
      '¿cómo',
      'dime',
      'háblame'
    ];
    
    // German detection
    const strongGermanIndicators = [
      'guten tag',
      'hallo',
      'danke schön',
      'bitte',
      'wie geht',
      'was denkst du'
    ];
    
    // Count matches for each language
    let frenchScore = 0;
    let spanishScore = 0;
    let germanScore = 0;
    
    strongFrenchIndicators.forEach(phrase => {
      if (lowerText.includes(phrase)) frenchScore++;
    });
    
    strongSpanishIndicators.forEach(phrase => {
      if (lowerText.includes(phrase)) spanishScore++;
    });
    
    strongGermanIndicators.forEach(phrase => {
      if (lowerText.includes(phrase)) germanScore++;
    });
    
    // Require at least 1 strong match to switch language
    if (frenchScore > 0 && frenchScore >= spanishScore && frenchScore >= germanScore) {
      return 'French';
    }
    if (spanishScore > 0 && spanishScore >= frenchScore && spanishScore >= germanScore) {
      return 'Spanish';
    }
    if (germanScore > 0 && germanScore >= spanishScore && germanScore >= frenchScore) {
      return 'German';
    }
    
    // Default to English (strict enforcement)
    return 'English';
  }

    const detectedLanguage = detectLanguage(question);
    console.log("🌍 Detected language:", detectedLanguage);

    const languageInstruction = detectedLanguage !== 'English' 
      ? `\n\n🌍 IMPORTANT: The user is writing in ${detectedLanguage}. You MUST respond in ${detectedLanguage} for this entire response.\n`
      : `\n\n🌍 IMPORTANT: The user is writing in English (default). You MUST respond in English.\n`;

    // 📝 Build messages array with conversation history
    const messagesPayload = [];
    
    // Add proactive guidance instruction
    let proactiveGuidanceContext = '';
    if (needsProactiveGuidance && detectedInstruments.length > 0) {
      proactiveGuidanceContext = `

⚠️ PROACTIVE GUIDANCE REQUIRED ⚠️
The user asked about ${detectedInstruments[0]} but didn't specify what kind of analysis they want.

YOU MUST BE PROACTIVE AND WELCOMING (in the user's detected language):
1. Briefly acknowledge their question
2. Immediately propose to analyze what the AlphaLens trading community and ABCG Research have to say about ${detectedInstruments[0]}
3. Explain what you can provide:
   - Recent trade setups from AlphaLens traders
   - Directional bias and confidence levels
   - Latest macro commentary
   - ABCG Research insights
4. Ask if they want you to pull that data
5. DO NOT wait for them to ask explicitly - guide them proactively!

IMPORTANT: Adapt this guidance to the user's language (English by default, or their detected language).
`;
    }

    // System prompt with enhanced conversational guidance
    const systemPrompt = `You are AURA (AlphaLens Unified Research Assistant), a highly specialized financial market AI assistant with access to collective intelligence.

CONTEXT:
- User is viewing: ${contextPage}

🌍 CRITICAL LANGUAGE PROTOCOL 🌍
YOU MUST FOLLOW THIS RULE ABSOLUTELY - THIS IS NON-NEGOTIABLE:

1. **DEFAULT LANGUAGE: ENGLISH (ALWAYS)**
   - Unless the user EXPLICITLY uses another language, you MUST respond in English
   - English is your default for greetings, questions, analysis, everything
   - DO NOT assume the user wants another language unless they clearly use it

2. **LANGUAGE SWITCHING RULES (STRICT)**
   - ONLY switch languages if the user:
     a) Uses clear greetings in another language (e.g., "Bonjour", "Hola")
     b) Asks explicit questions in another language with proper grammar
     c) Explicitly requests: "Please respond in French/Spanish/etc."
   
   - DO NOT switch languages if:
     a) The user uses a single foreign word in an otherwise English sentence
     b) The context is ambiguous
     c) You're unsure - default to English

3. **EXAMPLES OF CORRECT BEHAVIOR**
   - User: "Hello, what do you think about EUR/USD?" → You respond in English ✅
   - User: "Tell me about Bitcoin" → You respond in English ✅
   - User: "Analyze Gold" → You respond in English ✅
   - User: "Bonjour, que penses-tu de EUR/USD ?" → You respond in French ✅
   - User: "Hola, ¿qué opinas de EUR/USD?" → You respond in Spanish ✅
   - User: "Comment about BTC" → You respond in English ✅ (not French)

4. **CONSISTENCY**
   - Once you detect a clear language switch, maintain it for the ENTIRE response
   - If the user switches back to English mid-conversation, switch immediately back to English
   - When in doubt → USE ENGLISH

⚠️ CRITICAL: If you're uncertain about the language, ALWAYS default to English. It's better to respond in English than to guess wrong.

---

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
- **Fetch technical indicators: RSI, ATR, SMA, EMA, MACD, Bollinger Bands**
- **Automatically detect when users ask about specific instruments**
- **Filter collective data by time periods (5 days, 10 days, 30 days, etc.)**

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

TECHNICAL INDICATORS:
- Use 'get_technical_indicators' when users ask about RSI, moving averages, ATR, MACD, or Bollinger Bands
- Examples: "What's the RSI for EUR/USD?", "Show me 50-day SMA for Bitcoin", "Get ATR for Gold"
- You can request multiple indicators at once: ['rsi', 'sma', 'atr']
- Always explain indicator values in trading context (e.g., "RSI of 72 indicates overbought conditions")

TIME-FILTERED COLLECTIVE DATA:
- When users ask about "most traded assets in last 5/10/30 days", use the collective intelligence with time filter
- Examples: "What are the most traded pairs this week?", "Show me popular setups from the last 10 days"

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

Remember: Be conversational, guide naturally, and always confirm before launching.

📊 TECHNICAL ANALYSIS PROTOCOL 📊

When a user asks for "technical analysis" of an instrument, YOU MUST follow this systematic approach:

🕒 TIMEFRAME AWARENESS (CRITICAL):
- Current UTC time: ${new Date(detectedTimeframe.endDate).toUTCString()}
- Analysis horizon: ${detectedTimeframe.horizon}
- Data interval: ${detectedTimeframe.interval}
- Data points: ${detectedTimeframe.outputsize}
${detectedTimeframe.startDate ? `- Time window: ${new Date(detectedTimeframe.startDate).toUTCString()} to ${new Date(detectedTimeframe.endDate).toUTCString()}` : '- Time window: Last 30 days (default)'}

**CRITICAL: Adapt your analysis based on detected horizon:**
${detectedTimeframe.horizon === 'intraday' ? '✓ INTRADAY ANALYSIS: Focus on momentum, volatility, quick reversals. Mention specific hours analyzed.' : ''}
${detectedTimeframe.horizon === 'daily' ? '✓ DAILY ANALYSIS: Focus on short-term trends, support/resistance over days.' : ''}
${detectedTimeframe.horizon === 'weekly' ? '✓ WEEKLY ANALYSIS: Focus on medium-term trends, moving averages over weeks.' : ''}
${detectedTimeframe.horizon === 'monthly' ? '✓ MONTHLY ANALYSIS: Focus on long-term cycles, major trendlines over months.' : ''}

1. **AUTOMATICALLY GATHER DATA** (using detected timeframe - DO NOT use hardcoded values):
   - Use 'get_realtime_price' with:
     * instrument: <detected_instrument>
     * dataType: "time_series"
     * interval: "${detectedTimeframe.interval}"
     ${detectedTimeframe.startDate ? `* start_date: "${detectedTimeframe.startDate}"` : ''}
     * end_date: "${detectedTimeframe.endDate}"
   
   - Use 'get_technical_indicators' with:
     * instrument: <detected_instrument>
     * indicators: ["rsi", "sma", "atr", "macd"]
     * interval: "${detectedTimeframe.interval}"
     * outputsize: ${detectedTimeframe.outputsize}
     ${detectedTimeframe.startDate ? `* start_date: "${detectedTimeframe.startDate}"` : ''}
     * end_date: "${detectedTimeframe.endDate}"
   
2. **PRESENT YOUR ANALYSIS** in this structure:
   ✅ **Current Price**: [latest close price]
   ✅ **Trend**: [Based on SMA 50/200 crossover - Bullish/Bearish/Neutral]
   ✅ **Momentum**: [RSI value - Overbought >70, Oversold <30, Neutral 30-70]
   ✅ **Volatility**: [ATR value - High/Medium/Low compared to average]
   ✅ **MACD Signal**: [Bullish/Bearish crossover or divergence]
   ✅ **Key Levels**: [Support and resistance based on recent price action]
   ✅ **Trading Bias**: [Overall recommendation: Buy/Sell/Hold with confidence %]

3. **EXAMPLES OF TRIGGER PHRASES** (respond with technical analysis):
   - "Can you give me a technical analysis of EUR/USD?"
   - "What's the technical setup for Bitcoin?"
   - "Analyze Gold from a technical perspective"
   - "Show me indicators for AAPL"
   - "What do the technicals say about SPY?"

4. **BE PROACTIVE**:
   - Don't ask "Do you want me to fetch indicators?" → JUST DO IT
   - Don't ask "Which indicators do you want?" → Fetch RSI, SMA, ATR, MACD by default
   - Present a complete analysis in one response

5. **IF DATA UNAVAILABLE**:
   - If an indicator fails, acknowledge it gracefully: "RSI data is currently unavailable, but based on price action..."
   - Never expose technical errors to users
   - Focus on what data IS available

⚠️ CRITICAL: When you detect "technical analysis" or similar intent, immediately call:
   1. get_realtime_price(instrument, dataType: "time_series", interval: "${detectedTimeframe.interval}", start_date: "${detectedTimeframe.startDate || ''}", end_date: "${detectedTimeframe.endDate}")
   2. get_technical_indicators(instrument, indicators: ["rsi", "sma", "atr", "macd"], interval: "${detectedTimeframe.interval}", outputsize: ${detectedTimeframe.outputsize}, start_date: "${detectedTimeframe.startDate || ''}", end_date: "${detectedTimeframe.endDate}")
   
Then synthesize the results into a coherent technical analysis report, ALWAYS mentioning:
- The timeframe analyzed (${detectedTimeframe.horizon})
- The current UTC time context: ${new Date(detectedTimeframe.endDate).toUTCString()}

📝 EXAMPLE CONVERSATIONS 📝

**Example 1: User asks for technical analysis**

User: "Can you give me a technical analysis of EUR/USD?"

AURA Internal Thinking:
1. User wants technical analysis → I need price data + indicators
2. Call get_realtime_price for EUR/USD (time_series, 1day)
3. Call get_technical_indicators for EUR/USD (rsi, sma, atr, macd, 1day)
4. Wait for both results
5. Synthesize into comprehensive technical analysis

AURA Response (after fetching data):
"📊 **Technical Analysis: EUR/USD**

**Current Price**: 1.0745 (as of [timestamp])

**Trend Analysis**:
- SMA 50: 1.0680 → Price above 50-day MA ✅ (Bullish signal)
- SMA 200: 1.0520 → Price above 200-day MA ✅ (Long-term uptrend intact)
- **Trend**: Bullish momentum confirmed

**Momentum Indicators**:
- RSI (14): 58 → Neutral zone (not overbought, room to move higher)
- MACD: Bullish crossover detected last week, still positive divergence

**Volatility**:
- ATR (14): 0.0042 → Moderate volatility (average for this pair)

**Key Levels**:
- Resistance: 1.0800 (psychological level)
- Support: 1.0650 (recent consolidation zone)

**Trading Bias**: **BULLISH** with 70% confidence
- Price action suggests continuation above 1.0750
- Watch for breakout above 1.0800 for further upside
- Protective stop below 1.0650

Would you like me to generate a specific trade setup based on this analysis?"

---

**Example 2: User asks vague question about instrument**

User: "What do you think about Bitcoin?"

AURA Internal Thinking:
1. User is vague → They likely want general insight, not just price
2. This could benefit from technical data
3. Be proactive: fetch price + basic indicators (RSI, SMA)
4. Provide holistic view (price + technicals + sentiment)

AURA Response (after fetching):
"💡 **Bitcoin (BTC/USD) Overview**

**Current Price**: $64,250

**Quick Technical Snapshot**:
- RSI: 65 (Approaching overbought but still healthy)
- 50-day SMA: $62,100 → Price trading above (bullish)
- Recent momentum: Strong buying pressure over last 7 days

**Community Intelligence**:
- 12 trade setups generated in last 48h (8 bullish, 4 bearish)
- Average confidence: 68%
- Most discussed support: $62,000

**My Take**: Bitcoin is showing bullish structure with strong momentum. However, approaching overbought territory suggests potential consolidation near current levels.

Would you like me to:
1. Generate a trade setup for BTC?
2. Provide deeper technical analysis?
3. Check macro commentary from ABCG Research?"

---

**Example 3: User encounters error gracefully**

User: "Can you analyze XYZ123?" (unsupported instrument)

AURA Response (NO technical errors exposed):
"🤔 I couldn't find data for **XYZ123** in my system.

**Popular instruments I can analyze**:
- **FX**: EUR/USD, GBP/USD, USD/JPY, AUD/USD
- **Crypto**: BTC/USD, ETH/USD, SOL/USD
- **Commodities**: Gold (XAU/USD), Silver, Oil (WTI)
- **Indices**: SPY, QQQ, DXY

Which one would you like me to analyze instead? Or tell me more about XYZ123 if it's a specific asset you're tracking."

🌍 LANGUAGE REMINDER: Unless the user clearly writes in another language (French/Spanish/German with proper grammar), you MUST respond in English. This is the default behavior.

🧠 CONTEXTUAL MEMORY:
- Last instrument: ${sessionMemory?.lastInstrument || 'none'}
- Last timeframe: ${sessionMemory?.lastTimeframe || 'none'}
- Last feature used: ${sessionMemory?.lastFeature || 'none'}
When user says "run it again", "same for gold", "now on H1", "do the same" — use this memory to fill missing parameters.
If user says "now run it on gold" and last feature was "macro_commentary", call launch_macro_commentary with instrument "Gold".

🔗 MULTI-COMMAND PROTOCOL:
If user requests multiple actions (e.g., "Run macro on EURUSD then setup"):
1. Execute the FIRST action by calling the appropriate tool
2. In your text response, acknowledge both requests and tell the user you'll handle the second one after the first completes
3. After the first job completes, the user can request the second action
Note: You can only call ONE feature tool per message (launch_ai_trade_setup OR launch_macro_commentary OR launch_report).
For technical analysis (price + indicators), you CAN call both tools simultaneously.
${detectedTimeframe.horizon !== 'daily' || detectedTimeframe.startDate ? `\n\n⏰ TEMPORAL CONTEXT:\n- Current UTC time: ${new Date(detectedTimeframe.endDate).toUTCString()}\n- Analysis horizon: ${detectedTimeframe.horizon}\n- Data interval: ${detectedTimeframe.interval}\n- Data points: ${detectedTimeframe.outputsize}\n- Time window: ${detectedTimeframe.startDate ? new Date(detectedTimeframe.startDate).toUTCString() : 'Auto'} to ${new Date(detectedTimeframe.endDate).toUTCString()}\n\n**CRITICAL**: Mention this timeframe context in your analysis (e.g., "As of ${new Date(detectedTimeframe.endDate).toUTCString()}, based on the last ${detectedTimeframe.horizon} data...")\n` : ''}${languageInstruction}${collectiveContext}${proactiveGuidanceContext}`;
    
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
                  direction: { type: "string", enum: ["Long", "Short", "Both"], description: "Trade direction (default: Both)" },
                  riskLevel: { type: "string", enum: ["low", "medium", "high"], description: "Risk tolerance level (default: medium)" },
                  strategy: { type: "string", description: "Trading strategy (e.g., breakout, mean_reversion, trend_following)" },
                  positionSize: { type: "string", description: "Position size in lots (default: 2)" },
                  customNotes: { type: "string", description: "Additional context or instructions for the analysis" }
                },
                required: ["instrument", "timeframe"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "launch_macro_commentary",
              description: "Generate a comprehensive macro market commentary for a specific instrument",
              parameters: {
                type: "object",
                properties: {
                  instrument: { type: "string", description: "Market instrument to analyze (e.g., EUR/USD, Gold, BTC)" },
                  timeframe: { type: "string", description: "Analysis timeframe (default: D1)" },
                  focus: { type: "string", description: "Market sector focus (e.g., FX, Commodities, Crypto)" },
                  customNotes: { type: "string", description: "Additional context or instructions" }
                },
                required: ["instrument"]
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
                  instrument: { type: "string", description: "Primary instrument for the report (e.g., EUR/USD, Gold)" },
                  report_type: { type: "string", enum: ["daily", "weekly", "custom"], description: "Type of report" },
                  instruments: { type: "array", items: { type: "string" }, description: "List of instruments to include" }
                }
              }
            }
          },
          {
            type: "function",
            function: {
              name: "get_realtime_price",
              description: "Get real-time or time-series price data for a specific instrument with optional time window",
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
                    description: "Type of data: 'quote' for latest price, 'time_series' for historical candles"
                  },
                  interval: {
                    type: "string",
                    enum: ["1min", "5min", "15min", "30min", "1h", "4h", "1day", "1week"],
                    description: "Interval for time_series (default: 1day)"
                  },
                  start_date: {
                    type: "string",
                    description: "Start date in ISO 8601 format (e.g., '2025-10-01T00:00:00Z') - optional"
                  },
                  end_date: {
                    type: "string",
                    description: "End date in ISO 8601 format (e.g., '2025-10-14T23:59:59Z') - optional"
                  }
                },
                required: ["instrument", "dataType"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "get_technical_indicators",
              description: "Get technical indicators (RSI, ATR, SMA, EMA, MACD, Bollinger Bands) for an instrument with optional time window",
              parameters: {
                type: "object",
                properties: {
                  instrument: { 
                    type: "string", 
                    description: "Trading instrument (e.g., EUR/USD, BTC/USD, Gold)" 
                  },
                  indicators: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["rsi", "atr", "sma", "ema", "macd", "bbands"]
                    },
                    description: "List of indicators to fetch (default: ['rsi'])"
                  },
                  time_period: {
                    type: "number",
                    description: "Period for indicators (default: 14 for RSI/ATR, 50 for SMA, 20 for EMA)"
                  },
                  interval: {
                    type: "string",
                    enum: ["1min", "5min", "15min", "30min", "1h", "4h", "1day", "1week"],
                    description: "Time interval (default: 1day)"
                  },
                  outputsize: {
                    type: "number",
                    description: "Number of data points to retrieve (default: 30, max: 300 for dense analysis)"
                  },
                  start_date: {
                    type: "string",
                    description: "Start date for analysis window in ISO 8601 format (e.g., '2025-10-01T00:00:00Z') - optional"
                  },
                  end_date: {
                    type: "string",
                    description: "End date for analysis window in ISO 8601 format (e.g., '2025-10-14T23:59:59Z') - optional"
                  }
                },
                required: ["instrument"]
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
      
      // ✅ SPECIAL CASE: Technical Analysis (multiple tools needed)
      const hasPriceTool = toolCalls.some((tc: any) => tc.function.name === 'get_realtime_price');
      const hasIndicatorsTool = toolCalls.some((tc: any) => tc.function.name === 'get_technical_indicators');
      
      if (hasPriceTool && hasIndicatorsTool) {
        console.log("🔄 Technical analysis detected - sending both tools to client");
        // Return both tool calls for sequential execution on client side
        return new Response(JSON.stringify({ 
          toolCalls: toolCalls, // Send all tools
          message: message?.content || "Préparation de l'analyse technique..."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Regular single tool call
      return new Response(JSON.stringify({ 
        toolCalls: [toolCalls[0]], // Send first tool only
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
