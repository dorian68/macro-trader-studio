

## Ajouter 6 nouvelles images pour diversifier les covers du blog

### Etat actuel

8 images couvrent 86 articles. Les groupes les plus gros (skyscrapers: 17, currencies/dollar-bill/market-rise: 12 chacun) ont trop de repetition visuelle.

### Mapping des 6 nouvelles images

| Image | Fichier cible | Articles reassignes (pris dans les groupes satures) |
|-------|--------------|------|
| Finance charts (thedigitalartist-finance) | `cover-finance-charts.jpg` | 6 articles Quant du groupe skyscrapers: `ai-signal-noise-filtering`, `ai-signal-validation-trading`, `real-time-signal-generation`, `regime-detection-trading-ai`, `momentum-vs-mean-reversion-ai`, `multi-timeframe-signal-analysis` |
| Dollar globe (geralt-dollar) | `cover-dollar-globe.jpg` | 6 articles FX du groupe dollar-bill: `fx-carry-trade-ai-analysis`, `fx-carry-trade-optimization`, `fx-volatility-forecasting-ai`, `fx-order-flow-analysis-ai`, `usd-strength-ai-model`, `fx-hedging-strategies-ai` |
| $100 bills (sandra-gabriel) | `cover-hundred-bills.jpg` | 6 articles Portfolio du groupe market-rise: `drawdown-management-ai`, `tail-risk-hedging-ai`, `liquidity-risk-portfolio-ai`, `stress-testing-portfolios-ai`, `ai-risk-management-trading`, `ai-portfolio-monitoring` |
| Euro coins (fotoblend) | `cover-euro-coins.jpg` | 6 articles Macro du groupe currencies: `central-bank-policy-ai-analysis`, `inflation-forecasting-ai-models`, `yield-curve-analysis-ai`, `gdp-nowcasting-ai-models`, `labor-market-ai-analysis`, `economic-calendar-ai-trading` |
| Dollar bills spread (hbschw) | `cover-dollars-spread.jpg` | 5 articles restants skyscrapers (institutional): `ai-explainability-trading-research`, `ai-research-desk-finance`, `institutional-ai-market-intelligence`, `manual-vs-ai-market-research`, `ai-trading-tools-comparison` |
| Central Bank (denisstreltsov) | `cover-central-bank.jpg` | 5 articles Macro du groupe currencies: `central-bank-communication-nlp`, `macro-regime-shifts-ai`, `cross-asset-macro-correlations`, `geopolitical-risk-ai-assessment`, `market-data-to-decision-ready-commentary` |

### Resultat apres reassignation

| Image | Articles |
|-------|----------|
| cover-skyscrapers.png | 6 (quant: backtest, entry-exit, stop-loss, trade-sizing, quant-workflow, risk-reward) |
| cover-finance-charts.jpg | 6 (quant signals) |
| cover-dollar-bill.jpg | 6 (FX) |
| cover-dollar-globe.jpg | 6 (FX) |
| cover-market-rise.jpg | 6 (Portfolio) |
| cover-hundred-bills.jpg | 6 (Portfolio) |
| cover-currencies.jpg | 1 (ai-macro-market-analysis-guide) |
| cover-euro-coins.jpg | 6 (Macro) |
| cover-central-bank.jpg | 5 (Macro) |
| cover-coins.jpg | 11 (Commodities) |
| cover-futuristic.jpg | 11 (Quant batch 1-14) |
| cover-dollars-pile.jpg | 6 (Crypto) |
| cover-laptop.png | 5 (Institutional) |
| cover-dollars-spread.jpg | 5 (Institutional) |

Total: 14 images pour 86 articles — bien plus de variete visuelle.

### Execution

1. **Copier 6 images** dans `public/images/blog/`
2. **UPDATE** ~34 articles via API PATCH pour reassigner les cover_image
3. **Aucun changement de code** — Blog.tsx utilise deja `post.cover_image`

