

## Generate 65 Remaining Articles + Fix 5 Placeholders

### Current State
- **21 articles in DB** (16 with real content, 5 with "Placeholder" content)
- **Sitemap routes** already has 30 future slugs (waves 3: signals, macro, FX, crypto) not yet in DB
- Need: 5 placeholder fixes + 30 articles matching existing sitemap slugs + 35 new articles = 70 total operations

### Execution Strategy

**Phase 1: Fix 5 placeholder articles** (batch 1)
UPDATE content for: `how-ai-generates-trading-signals`, `momentum-vs-mean-reversion-ai`, `multi-timeframe-signal-analysis`, `ai-entry-exit-timing`, `risk-reward-optimization-ai`

**Phase 2: Generate 30 articles matching existing sitemap slugs** (batches 2-7, 5 per batch)
These slugs are already in `sitemapRoutes.ts` — just need DB rows with real content:
- Batch 2: `ai-signal-noise-filtering`, `regime-detection-trading-ai`, `ai-stop-loss-placement`, `ai-trade-sizing-algorithms`, `real-time-signal-generation`
- Batch 3: `central-bank-policy-ai-analysis`, `inflation-forecasting-ai-models`, `yield-curve-analysis-ai`, `geopolitical-risk-ai-assessment`, `economic-calendar-ai-trading`
- Batch 4: `gdp-nowcasting-ai-models`, `labor-market-ai-analysis`, `central-bank-communication-nlp`, `macro-regime-shifts-ai`, `cross-asset-macro-correlations`
- Batch 5: `ai-fx-pair-selection`, `fx-carry-trade-optimization`, `fx-volatility-forecasting-ai`, `emerging-market-fx-ai`, `fx-order-flow-analysis-ai`
- Batch 6: `usd-strength-ai-model`, `fx-technical-patterns-ai`, `fx-news-sentiment-trading`, `asian-fx-markets-ai`, `fx-hedging-strategies-ai`
- Batch 7: `bitcoin-on-chain-analysis-ai`, `defi-yield-analysis-ai`, `crypto-market-microstructure`, `ethereum-ecosystem-ai-analysis`, `crypto-sentiment-on-chain-signals`

**Phase 3: Generate 35 NEW articles** (batches 8-14, 5 per batch)
New clusters to fill remaining quota:
- Batch 8-9: Commodities (10 articles) — gold, oil, natural gas, agriculture, metals, energy transition
- Batch 10-11: Quant & Backtesting (10 articles) — model validation, overfitting, walk-forward, Monte Carlo, factor models
- Batch 12-13: Portfolio & Risk (10 articles) — allocation, drawdown, correlation, hedging, rebalancing
- Batch 14: Institutional & Fintech (5 articles) — compliance, MiFID, research automation, desk workflows

### Content Generation Method
Use AI gateway script (`/tmp/lovable_ai.py`) with a finance-expert system prompt to generate ~1,200-1,500 word Markdown articles. Each includes:
- H1 title, H2/H3 structure, internal links, CTA
- Staggered `published_at` dates (April 24, 2025 → March 15, 2026, ~3 days apart)
- Mixed authors: "AlphaLens Research", "AlphaLens Quant Desk", "AlphaLens Macro Team"

### Database Operations
- Phase 1: UPDATE 5 rows (fix placeholders)
- Phase 2-3: INSERT 65 new rows via SQL in batches of 5

### Code Changes
- `src/seo/sitemapRoutes.ts` — add 35 new slugs (for Phase 3 articles)
- `public/sitemap.xml` — regenerate with all ~86 article URLs

### Total: 14 batches × 5 articles = 70 operations (5 updates + 65 inserts)

