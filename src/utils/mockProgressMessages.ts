export interface MockMessage {
  text: string;
  minDelay: number;
  maxDelay: number;
}

export interface MockSequence {
  duration: number;
  messages: MockMessage[];
}

export const MOCK_PROGRESS_SEQUENCES: Record<string, MockSequence> = {
  ai_trade_setup: {
    duration: 120000, // 120s
    messages: [
      { text: "Initializing market data collection...", minDelay: 3000, maxDelay: 8000 },
      { text: "Scanning recent macroeconomic signals...", minDelay: 5000, maxDelay: 10000 },
      { text: "Interpreting sentiment and institutional insights...", minDelay: 4000, maxDelay: 9000 },
      { text: "Merging technical patterns and economic forecasts...", minDelay: 6000, maxDelay: 12000 },
      { text: "Generating optimal entry and target levels...", minDelay: 5000, maxDelay: 10000 },
      { text: "Finalizing trade setup report...", minDelay: 4000, maxDelay: 8000 }
    ]
  },
  macro_commentary: {
    duration: 90000, // 90s
    messages: [
      { text: "Collecting real-time market updates...", minDelay: 3000, maxDelay: 7000 },
      { text: "Filtering top news sources...", minDelay: 4000, maxDelay: 9000 },
      { text: "Analyzing expert commentary and sentiment...", minDelay: 5000, maxDelay: 11000 },
      { text: "Synthesizing macro view and strategy notes...", minDelay: 4000, maxDelay: 10000 },
      { text: "Delivering summarized market outlook...", minDelay: 3000, maxDelay: 8000 }
    ]
  },
  reports: {
    duration: 110000, // 110s
    messages: [
      { text: "Compiling performance metrics...", minDelay: 4000, maxDelay: 9000 },
      { text: "Retrieving benchmark and index data...", minDelay: 5000, maxDelay: 10000 },
      { text: "Merging AI insights with institutional analytics...", minDelay: 6000, maxDelay: 12000 },
      { text: "Structuring financial visuals and summaries...", minDelay: 5000, maxDelay: 11000 },
      { text: "Generating complete report...", minDelay: 4000, maxDelay: 9000 }
    ]
  },
  report: { // Alias for reports
    duration: 110000,
    messages: [
      { text: "Compiling performance metrics...", minDelay: 4000, maxDelay: 9000 },
      { text: "Retrieving benchmark and index data...", minDelay: 5000, maxDelay: 10000 },
      { text: "Merging AI insights with institutional analytics...", minDelay: 6000, maxDelay: 12000 },
      { text: "Structuring financial visuals and summaries...", minDelay: 5000, maxDelay: 11000 },
      { text: "Generating complete report...", minDelay: 4000, maxDelay: 9000 }
    ]
  }
};
