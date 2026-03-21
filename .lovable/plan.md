

## Continue Batch Article Generation & DB Insertion

### Current State
- **21 articles in DB** (13 with full content 7K+, 8 with short content 1.8K-3.9K)
- **Sitemap routes already defined** for ~65 additional slugs (waves 3-4) not yet in DB
- Need to generate content and INSERT ~65 articles in batches of 5

### Slugs still missing from DB (grouped by batch)

**Batch 1** (AI Signals): `ai-signal-noise-filtering`, `regime-detection-trading-ai`, `ai-stop-loss-placement`, `ai-trade-sizing-algorithms`, `real-time-signal-generation`

**Batch 2** (Macro 1): `central-bank-policy-ai-analysis`, `inflation-forecasting-ai-models`, `yield-curve-analysis-ai`, `geopolitical-risk-ai-assessment`, `economic-calendar-ai-trading`

**Batch 3** (Macro 2): `gdp-nowcasting-ai-models`, `labor-market-ai-analysis`, `central-bank-communication-nlp`, `macro-regime-shifts-ai`, `cross-asset-macro-correlations`

**Batch 4** (FX 1): `ai-fx-pair-selection`, `fx-carry-trade-optimization`, `fx-volatility-forecasting-ai`, `emerging-market-fx-ai`, `fx-order-flow-analysis-ai`

**Batch 5** (FX 2): `usd-strength-ai-model`, `fx-technical-patterns-ai`, `fx-news-sentiment-trading`, `asian-fx-markets-ai`, `fx-hedging-strategies-ai`

**Batch 6** (Crypto): `bitcoin-on-chain-analysis-ai`, `defi-yield-analysis-ai`, `crypto-market-microstructure`, `ethereum-ecosystem-ai-analysis`, `crypto-sentiment-on-chain-signals`

**Batch 7** (Commodities 1): `gold-price-forecasting-ai`, `crude-oil-supply-demand-ai`, `natural-gas-trading-ai`, `agricultural-commodities-ai`, `industrial-metals-ai-analysis`

**Batch 8** (Commodities 2): `energy-transition-commodities-ai`, `commodity-supercycle-ai-analysis`, `precious-metals-portfolio-ai`, `commodity-futures-curve-ai`, `commodity-correlation-macro-ai`

**Batch 9** (Quant 1): `backtesting-pitfalls-overfitting-ai`, `walk-forward-optimization-ai`, `monte-carlo-simulation-trading-ai`, `factor-models-ai-trading`, `model-validation-ai-trading`

**Batch 10** (Quant 2): `feature-engineering-trading-ai`, `ensemble-methods-trading-ai`, `alternative-data-trading-ai`, `reinforcement-learning-trading`, `quantitative-strategy-lifecycle-ai`

**Batch 11** (Portfolio 1): `ai-portfolio-allocation-optimization`, `drawdown-management-ai`, `correlation-regime-changes-ai`, `tail-risk-hedging-ai`, `dynamic-rebalancing-ai`

**Batch 12** (Portfolio 2): `multi-asset-portfolio-ai`, `esg-portfolio-integration-ai`, `volatility-targeting-ai`, `liquidity-risk-portfolio-ai`, `stress-testing-portfolios-ai`

**Batch 13** (Institutional): `mifid-compliance-ai-research`, `research-automation-buy-side`, `ai-trading-desk-integration`, `ai-model-governance-finance`, `future-of-ai-trading-2026`

### Execution per batch
1. Generate 5 articles (~1,500 words each) via AI gateway with finance-expert system prompt
2. INSERT into `blog_posts` with staggered `published_at` dates (April 24, 2025 → March 15, 2026, ~3 days apart)
3. Mixed authors and categories matching each cluster

### Date staggering
- Batch 1 starts at 2025-04-24, each article +3 days
- Total span: April 2025 → March 2026 (natural editorial cadence)

### After all insertions
- Regenerate `public/sitemap.xml` with all URLs
- Total target: ~86 published articles

### Files modified
- Database: INSERT 65 rows into `blog_posts` (13 batches × 5)
- `public/sitemap.xml` — regenerate after all insertions

