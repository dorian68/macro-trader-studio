export interface AURAContextData {
  page: string;
  stats?: {
    totalTrades?: number;
    winRate?: number;
    avgPnL?: number;
    totalValue?: number;
    activeTrades?: number;
  };
  recentData?: any[];
  filters?: Record<string, any>;
}

export interface AURATeaser {
  text: string;
  cta: string;
  query: string;
  contexts?: string[];
}

export const AURA_TEASERS: AURATeaser[] = [
  {
    text: "👋 Need a quick market summary?",
    cta: "Ask AURA",
    query: "Give me a quick market summary",
  },
  {
    text: "💡 Want to discover insights from your data?",
    cta: "Show Insights",
    query: "Show me key insights from my current data",
  },
  {
    text: "🔁 Which setups had the highest win rate?",
    cta: "Analyze Now",
    query: "Which trade setups had the highest win rate?",
    contexts: ["Backtester"],
  },
  {
    text: "📊 Want to backtest your AI setups in one click?",
    cta: "Launch Backtest",
    query: "Help me backtest my AI-generated trade setups",
    contexts: ["Backtester"],
  },
  {
    text: "📈 Curious how your portfolio performed this week?",
    cta: "Analyze",
    query: "Analyze my portfolio performance for this week",
    contexts: ["Portfolio Analytics"],
  },
  {
    text: "⚠️ Which trades were over-leveraged?",
    cta: "Find Out",
    query: "Show me which trades were over-leveraged",
    contexts: ["Portfolio Analytics"],
  },
  {
    text: "🧮 Try running a scenario — AURA can simulate macro shocks for you",
    cta: "Open AURA",
    query: "Help me simulate a macroeconomic scenario",
    contexts: ["Scenario Simulator"],
  },
  {
    text: "⚙️ Ready to generate your next market report?",
    cta: "Generate",
    query: "Generate a market report for me",
    contexts: ["default", "AlphaLens Labs"],
  },
];

export function getContextualTeasers(context: string): AURATeaser[] {
  return AURA_TEASERS.filter(
    teaser => !teaser.contexts || teaser.contexts.includes(context) || teaser.contexts.includes("default")
  );
}

export function getRandomTeaser(context: string): AURATeaser {
  const contextualTeasers = getContextualTeasers(context);
  return contextualTeasers[Math.floor(Math.random() * contextualTeasers.length)];
}
