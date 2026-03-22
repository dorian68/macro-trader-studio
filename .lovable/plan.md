

## Ajouter 6 nouvelles images (8 uploadees, 2 paires de doublons)

### Analyse des uploads

Les images 2.png et 6.png sont identiques (laptop+telephone trading). Les images 3.png et 7.png sont identiques (globe sur pieces). Donc **6 images uniques** sur 8 uploadees.

### Etat actuel

36 images pour 86 articles. 15 groupes a 3 articles.

### Mapping des 6 nouvelles images

| Image source | Fichier cible | Articles reassignes (pris dans groupes de 3) |
|---|---|---|
| 2.png (laptop + telephone trading) | `cover-mobile-trading.webp` | 2 du groupe laptop-teal: `factor-models-ai-trading`, `model-validation-ai-trading` |
| 4.png (carnet INVEST + loupe) | `cover-invest-notebook.webp` | 2 du groupe skyscrapers: `quant-research-workflow-data-to-signal`, `ai-stop-loss-placement` |
| 1.png (pieces + calculatrice desk) | `cover-coins-desk.webp` | 2 du groupe british-pound: `asian-fx-markets-ai`, `emerging-market-fx-ai` |
| 7.png (globe sur pieces + fleche) | `cover-global-investment.webp` | 2 du groupe market-rise: `dynamic-rebalancing-ai`, `multi-asset-portfolio-ai` |
| 5.png (piles pieces + lunettes) | `cover-coins-stacks-reports.webp` | 2 du groupe vault: `esg-portfolio-integration-ai`, `volatility-targeting-ai` |
| 8.png (skyline ville + fleche) | `cover-city-growth.webp` | 2 du groupe laptop-charts: `natural-gas-trading-ai`, `energy-transition-commodities-ai` |

### Resultat

- 6 groupes passent de 3 a 1 article
- 6 nouvelles images a 2 articles chacune
- Total: **42 images uniques**, max 3 par image (9 groupes restants)

### Execution

1. Copier 6 images dans `public/images/blog/` (convertir en WebP, 1200px)
2. 1 migration SQL UPDATE 12 articles
3. Aucun changement de code

