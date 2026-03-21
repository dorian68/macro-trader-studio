/**
 * Single source of truth for all public, indexable routes.
 * Add a new entry here when creating a new public page —
 * the sitemap will update automatically on next build.
 */
export interface SitemapRoute {
  path: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export const SITE_URL = 'https://alphalensai.com';

export const sitemapRoutes: SitemapRoute[] = [
  // Core
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/blog', changefreq: 'daily', priority: 0.9 },
  { path: '/features', changefreq: 'monthly', priority: 0.9 },
  { path: '/pricing', changefreq: 'monthly', priority: 0.9 },
  { path: '/product', changefreq: 'monthly', priority: 0.8 },
  { path: '/docs', changefreq: 'monthly', priority: 0.8 },
  { path: '/api', changefreq: 'monthly', priority: 0.7 },

  // Company
  { path: '/about', changefreq: 'monthly', priority: 0.7 },
  { path: '/contact', changefreq: 'monthly', priority: 0.7 },
  { path: '/help', changefreq: 'monthly', priority: 0.6 },

  // Legal
  { path: '/privacy', changefreq: 'yearly', priority: 0.3 },
  { path: '/terms', changefreq: 'yearly', priority: 0.3 },

  // Blog articles
  { path: '/blog/ai-macro-market-analysis-guide', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/market-data-to-decision-ready-commentary', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/quant-research-workflow-data-to-signal', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-fx-research-workflows', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-crypto-market-intelligence', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/commodities-research-ai-assistance', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-explainability-trading-research', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/manual-vs-ai-market-research', changefreq: 'weekly', priority: 0.7 },

  // Wave 2 articles
  { path: '/blog/ai-backtest-trading-strategy', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-risk-management-trading', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-research-desk-finance', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/institutional-ai-market-intelligence', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-signal-validation-trading', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-portfolio-monitoring', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-trading-tools-comparison', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/fx-carry-trade-ai-analysis', changefreq: 'weekly', priority: 0.7 },

  // Wave 3 — AI Trading Signals
  { path: '/blog/how-ai-generates-trading-signals', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/momentum-vs-mean-reversion-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/multi-timeframe-signal-analysis', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-entry-exit-timing', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/risk-reward-optimization-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-signal-noise-filtering', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/regime-detection-trading-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-stop-loss-placement', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-trade-sizing-algorithms', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/real-time-signal-generation', changefreq: 'weekly', priority: 0.7 },

  // Wave 3 — Macro & Central Banks
  { path: '/blog/central-bank-policy-ai-analysis', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/inflation-forecasting-ai-models', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/yield-curve-analysis-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/geopolitical-risk-ai-assessment', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/economic-calendar-ai-trading', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/gdp-nowcasting-ai-models', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/labor-market-ai-analysis', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/central-bank-communication-nlp', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/macro-regime-shifts-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/cross-asset-macro-correlations', changefreq: 'weekly', priority: 0.7 },

  // Wave 3 — FX
  { path: '/blog/ai-fx-pair-selection', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/fx-carry-trade-optimization', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/fx-volatility-forecasting-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/emerging-market-fx-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/fx-order-flow-analysis-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/usd-strength-ai-model', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/fx-technical-patterns-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/fx-news-sentiment-trading', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/asian-fx-markets-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/fx-hedging-strategies-ai', changefreq: 'weekly', priority: 0.7 },

  // Wave 3 — Crypto
  { path: '/blog/bitcoin-on-chain-analysis-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/defi-yield-analysis-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/crypto-market-microstructure', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ethereum-ecosystem-ai-analysis', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/crypto-sentiment-on-chain-signals', changefreq: 'weekly', priority: 0.7 },

  // Wave 4 — Commodities (published)
  { path: '/blog/gold-price-forecasting-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/crude-oil-supply-demand-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/natural-gas-trading-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/agricultural-commodities-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/industrial-metals-ai-analysis', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/energy-transition-commodities-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/commodity-supercycle-ai-analysis', changefreq: 'weekly', priority: 0.7 },

  // Wave 5 — Quant & Backtesting
  { path: '/blog/backtesting-pitfalls-overfitting-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/walk-forward-optimization-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/monte-carlo-simulation-trading-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/factor-models-ai-trading', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/model-validation-ai-trading', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/feature-engineering-trading-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ensemble-methods-trading-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/alternative-data-trading-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/reinforcement-learning-trading', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/quantitative-strategy-lifecycle-ai', changefreq: 'weekly', priority: 0.7 },
];
