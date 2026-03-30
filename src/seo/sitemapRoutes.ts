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
  { path: '/blog/category/quant-backtesting', changefreq: 'weekly', priority: 0.8 },
  { path: '/blog/category/portfolio-risk', changefreq: 'weekly', priority: 0.8 },
  { path: '/blog/category/institutional-governance', changefreq: 'weekly', priority: 0.8 },
  { path: '/blog/category/commodities-macro', changefreq: 'weekly', priority: 0.8 },
  { path: '/features', changefreq: 'monthly', priority: 0.9 },
  { path: '/pricing', changefreq: 'monthly', priority: 0.9 },
  { path: '/product', changefreq: 'monthly', priority: 0.8 },
  { path: '/docs', changefreq: 'monthly', priority: 0.8 },
  { path: '/api', changefreq: 'monthly', priority: 0.7 },

  // Topic Hubs
  { path: '/blog/hub/ai-trading', changefreq: 'weekly', priority: 0.8 },
  { path: '/blog/hub/forex-ai', changefreq: 'weekly', priority: 0.8 },
  { path: '/blog/hub/crypto-ai', changefreq: 'weekly', priority: 0.8 },
  { path: '/blog/hub/macro-analysis', changefreq: 'weekly', priority: 0.8 },
  { path: '/blog/hub/portfolio-risk', changefreq: 'weekly', priority: 0.8 },
  { path: '/blog/hub/quant-education', changefreq: 'weekly', priority: 0.8 },

  // Question-led SEO articles
  { path: '/blog/what-is-ai-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-does-ai-trading-work', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/is-ai-trading-profitable', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/best-ai-trading-software-beginners', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-accurate-are-ai-trading-signals', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/difference-algorithmic-trading-ai-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-to-use-ai-for-forex-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/can-ai-predict-forex-moves', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/can-ai-generate-forex-entry-stop-loss-take-profit', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-to-use-ai-for-crypto-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/can-ai-predict-crypto-prices', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-to-use-ai-for-gold-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/can-ai-help-predict-oil-prices', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-do-interest-rates-affect-forex', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-does-the-fed-affect-us-dollar', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-do-cpi-inflation-reports-affect-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-does-gdp-impact-currency-markets', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-to-read-central-bank-statement-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-to-combine-macro-analysis-with-ai-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/what-economic-calendar-events-matter-traders', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/what-is-nowcasting-macro-investing', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-to-manage-risk-in-ai-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-to-size-positions-using-volatility', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/what-is-portfolio-optimization-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-to-reduce-drawdown-ai-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-to-use-stop-loss-take-profit-effectively', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/can-ai-improve-portfolio-allocation', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/what-is-backtesting-ai-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-to-backtest-ai-trading-strategy', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/what-is-overfitting-trading-models', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/what-is-walk-forward-optimization', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/what-is-monte-carlo-simulation-trading', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/how-to-evaluate-ai-trading-model', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/which-metrics-matter-trading-strategy-evaluation', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/what-is-sharpe-ratio-simple-terms', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog/what-is-quantitative-trading-strategy', changefreq: 'monthly', priority: 0.7 },

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

  // Wave 6-9 — Portfolio & Risk
  { path: '/blog/ai-portfolio-allocation-optimization', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/drawdown-management-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/correlation-regime-changes-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/tail-risk-hedging-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/dynamic-rebalancing-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/multi-asset-portfolio-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/esg-portfolio-integration-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/volatility-targeting-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/liquidity-risk-portfolio-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/stress-testing-portfolios-ai', changefreq: 'weekly', priority: 0.7 },

  // Wave 10-11 — Institutional
  { path: '/blog/mifid-compliance-ai-research', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/research-automation-buy-side', changefreq: 'weekly', priority: 0.7 },

  // Wave 12-14 — Institutional & Commodities
  { path: '/blog/ai-trading-desk-integration', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/ai-model-governance-finance', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/future-of-ai-trading-2026', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/precious-metals-portfolio-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/commodity-futures-curve-ai', changefreq: 'weekly', priority: 0.7 },
  { path: '/blog/commodity-correlation-macro-ai', changefreq: 'weekly', priority: 0.7 },
];
