

## Ajouter 6 nouvelles images pour diversifier les covers du blog

### Etat actuel

14 images couvrent 86 articles. Les 2 groupes les plus gros (`cover-futuristic.jpg`: 11, `cover-coins.jpg`: 11) ont encore de la repetition.

### Mapping des 6 nouvelles images

| Image | Fichier cible | Articles reassignes |
|-------|--------------|---------------------|
| Banner US/Shanghai (geralt-banner) | `cover-us-shanghai.jpg` | 5 articles Commodities du groupe coins: `crude-oil-supply-demand-ai`, `natural-gas-trading-ai`, `energy-transition-commodities-ai`, `commodity-supercycle-ai-analysis`, `industrial-metals-ai-analysis` |
| Laptop trading (istockphoto) | `cover-trading-screen.jpg` | 5 articles Quant du groupe futuristic: `backtesting-pitfalls-overfitting-ai`, `walk-forward-optimization-ai`, `monte-carlo-simulation-trading-ai`, `factor-models-ai-trading`, `model-validation-ai-trading` |
| Dirham banknote (mabelamber) | `cover-dirham.jpg` | 3 articles FX du groupe dollar-bill: `emerging-market-fx-ai`, `asian-fx-markets-ai`, `fx-technical-patterns-ai` + 3 du groupe dollar-globe: `fx-news-sentiment-trading`, `ai-fx-pair-selection`, `ai-fx-research-workflows` |
| Frankfurt skyline (leonhard) | `cover-frankfurt.jpg` | 5 articles Institutional du groupe laptop: `mifid-compliance-ai-research`, `research-automation-buy-side`, `ai-trading-desk-integration`, `ai-model-governance-finance`, `future-of-ai-trading-2026` |
| Futuristic finance (thedigitalartist-finance-8045002) | `cover-ai-data.jpg` | 6 articles Quant restants du groupe futuristic: `feature-engineering-trading-ai`, `ensemble-methods-trading-ai`, `alternative-data-trading-ai`, `reinforcement-learning-trading`, `quantitative-strategy-lifecycle-ai`, `how-ai-generates-trading-signals` |
| Currencies (cover-currencies deja a 1 article) | Pas de changement, `cover-currencies.jpg` reste a 1 |

### Resultat apres reassignation

| Image | Articles |
|-------|----------|
| cover-coins.jpg | 6 (gold, agricultural, commodities-research, commodity-futures, commodity-correlation, precious-metals) |
| cover-us-shanghai.jpg | 5 (oil, gas, energy, supercycle, industrial-metals) |
| cover-futuristic.jpg | 0 (vide, remplace par 2 nouvelles) |
| cover-trading-screen.jpg | 5 (backtesting, walk-forward, monte-carlo, factor-models, model-validation) |
| cover-ai-data.jpg | 6 (feature-eng, ensemble, alt-data, RL, strategy-lifecycle, how-ai-generates) |
| cover-dirham.jpg | 6 (emerging-fx, asian-fx, fx-technical, fx-news, fx-pair, fx-research) |
| cover-frankfurt.jpg | 5 (mifid, research-auto, trading-desk, governance, future-2026) |
| cover-dollar-bill.jpg | 3 (fx-carry-opt deja la... restants) |
| + 8 images existantes inchangees | ~50 articles |

Total: **20 images** pour 86 articles.

### Execution

1. **Copier 5 images** dans `public/images/blog/` (le banner est en double, on prend une seule version)
2. **1 SQL migration** UPDATE ~30 articles pour reassigner les cover_image
3. **Aucun changement de code**

