

## Ajouter les 8 images uploadees comme cover images sur les articles du blog

### Principe

Les 86 articles n'ont actuellement aucune `cover_image` en DB -- le fallback utilise 4 images par categorie. On va :
1. Copier les 8 images dans `public/images/blog/`
2. Assigner chaque image a ~10-11 articles via UPDATE SQL, en repartissant par theme
3. Les 4 images categorie existantes restent en fallback pour tout article sans cover_image specifique

### Mapping images → themes

| Image | Fichier cible | Articles assignes |
|-------|--------------|-------------------|
| Coins (stocksnap) | `cover-coins.jpg` | ~11 articles Commodities (commodities, gold, oil, gas, metals, agriculture, energy, supercycle, precious-metals, commodity-futures, commodity-correlation) |
| $50 bill (kevinmullett) | `cover-dollar-bill.jpg` | ~12 articles FX (fx-carry, fx-pair, fx-volatility, fx-hedging, fx-order-flow, fx-technical, fx-news, fx-research, emerging-fx, asian-fx, usd-strength, fx-carry-optimization) |
| Futuristic city (thedigitalartist) | `cover-futuristic.jpg` | ~11 articles Quant (backtesting, walk-forward, monte-carlo, factor-models, model-validation, feature-engineering, ensemble, alternative-data, reinforcement, strategy-lifecycle, how-ai-generates) |
| Dollar bills pile (istockphoto) | `cover-dollars-pile.jpg` | ~6 articles Crypto (crypto-intelligence, bitcoin, defi, microstructure, ethereum, crypto-sentiment) |
| Dollar arrow up (geralt) | `cover-market-rise.jpg` | ~12 articles Portfolio (allocation, drawdown, correlation, tail-risk, dynamic-rebalancing, multi-asset, esg, volatility-targeting, liquidity-risk, stress-testing, risk-management, portfolio-monitoring) |
| Polish zloty (byszek) | `cover-currencies.jpg` | ~12 articles Macro (macro-guide, market-data, central-bank, inflation, yield-curve, geopolitical, economic-calendar, gdp, labor-market, central-bank-nlp, macro-regime, cross-asset) |
| Laptop dark (20260321_2319) | `cover-laptop.jpg` | ~5 articles Institutional (governance, mifid, research-automation, trading-desk, future-2026) |
| Skyscrapers (20260321_2315) | `cover-skyscrapers.jpg` | ~5 articles Institutional (explainability, manual-vs-ai, research-desk, institutional-intelligence, tools-comparison) + remaining quant (signal-noise, signal-validation, stop-loss, trade-sizing, real-time, momentum, multi-timeframe, entry-exit, risk-reward, regime-detection, quant-workflow, backtest-strategy) |

### Execution

1. **Copier 8 images** dans `public/images/blog/`
2. **1 migration SQL** avec ~86 UPDATE statements assignant `cover_image` par slug
3. **Aucun changement de code** -- le composant Blog.tsx affiche deja `post.cover_image` en priorite

