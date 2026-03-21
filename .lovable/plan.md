

## Harmoniser les 58 articles vers les 4 categories SEO

### Mapping des 58 articles

**Quant & Backtesting (13 articles)** — signals, backtesting, trading algorithms
- `quant-research-workflow-data-to-signal`, `how-ai-generates-trading-signals`, `momentum-vs-mean-reversion-ai`, `multi-timeframe-signal-analysis`, `ai-entry-exit-timing`, `risk-reward-optimization-ai`, `ai-backtest-trading-strategy`, `ai-signal-validation-trading`, `ai-signal-noise-filtering`, `regime-detection-trading-ai`, `ai-stop-loss-placement`, `ai-trade-sizing-algorithms`, `real-time-signal-generation`

**Portfolio & Risk (2 articles)** — portfolio, risk management
- `ai-risk-management-trading`, `ai-portfolio-monitoring`

**Institutional & Governance (5 articles)** — research desks, governance, comparisons
- `ai-explainability-trading-research`, `manual-vs-ai-market-research`, `ai-research-desk-finance`, `institutional-ai-market-intelligence`, `ai-trading-tools-comparison`

**Commodities & Macro (38 articles)** — macro, FX, crypto, commodities
- All macro/commentary: `ai-macro-market-analysis-guide`, `market-data-to-decision-ready-commentary`, `central-bank-policy-ai-analysis`, `inflation-forecasting-ai-models`, `yield-curve-analysis-ai`, `geopolitical-risk-ai-assessment`, `economic-calendar-ai-trading`, `gdp-nowcasting-ai-models`, `labor-market-ai-analysis`, `central-bank-communication-nlp`, `macro-regime-shifts-ai`, `cross-asset-macro-correlations`
- All FX: `ai-fx-research-workflows`, `fx-carry-trade-ai-analysis`, `ai-fx-pair-selection`, `fx-carry-trade-optimization`, `fx-volatility-forecasting-ai`, `emerging-market-fx-ai`, `fx-order-flow-analysis-ai`, `usd-strength-ai-model`, `fx-technical-patterns-ai`, `fx-news-sentiment-trading`, `asian-fx-markets-ai`, `fx-hedging-strategies-ai`
- All crypto: `ai-crypto-market-intelligence`, `bitcoin-on-chain-analysis-ai`, `defi-yield-analysis-ai`, `crypto-market-microstructure`, `ethereum-ecosystem-ai-analysis`, `crypto-sentiment-on-chain-signals`
- All commodities: `commodities-research-ai-assistance`, `gold-price-forecasting-ai`, `crude-oil-supply-demand-ai`, `natural-gas-trading-ai`, `agricultural-commodities-ai`, `industrial-metals-ai-analysis`, `energy-transition-commodities-ai`, `commodity-supercycle-ai-analysis`

### Pour chaque article: mise a jour

1. **`category`** — remapped to one of the 4 standard categories
2. **`meta_title`** — format "Titre | AlphaLens AI" (50-60 chars), optimized for CTR
3. **`meta_description`** — rewritten (130-155 chars), keyword-rich
4. **`excerpt`** — rewritten, action-oriented
5. **`tags`** — refreshed with relevant keywords (5-6 tags per article)
6. **`content`** — append "## Related Reading" block with 3 internal links + CTA (only for the ~40 articles missing it)

### Execution technique

- **4 SQL migrations** (one per category group) to keep each manageable
- Each migration updates `category`, `meta_title`, `meta_description`, `excerpt`, `tags`
- For articles missing Related Reading (~40): UPDATE `content` to append the block
- Internal links follow cluster logic: 2 links within same category + 1 cross-category link

### Impact

- All 86 articles under 4 consistent categories
- `/blog/category/` routes will show balanced content distribution
- Every article has Related Reading for internal link mesh
- Consistent SEO metadata format across entire blog

