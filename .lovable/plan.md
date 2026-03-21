

## Ajouter 3 nouvelles images pour reduire la repetition

### Etat actuel

32 images pour 86 articles. 24 groupes a 3 articles, 5 a 2, 2 a 1.

### Mapping des 3 nouvelles images

| Image | Fichier cible | Articles reassignes (1 par groupe de 3) |
|-------|--------------|------|
| Finance concept (Money/Profit/Management) | `cover-finance-concept.jpg` | 1 du groupe hundred-bills + 1 du groupe hundred-closeup: `tail-risk-hedging-ai`, `liquidity-risk-portfolio-ai` |
| Gold coins stacks | `cover-gold-stacks.jpg` | 1 du groupe risk-dial + 1 du groupe coins-trading: `gold-price-forecasting-ai`, `macro-regime-shifts-ai` |
| Finance calculator | `cover-finance-calculator.jpg` | 1 du groupe euro-coins + 1 du groupe financial-stats: `economic-calendar-ai-trading`, `feature-engineering-trading-ai` |

### Resultat

- 6 groupes passent de 3 a 2
- 3 nouvelles images a 2 articles chacune
- Total: **35 images uniques**, max 3 par image

### Execution

1. Copier 3 images dans `public/images/blog/`
2. 1 migration SQL UPDATE 6 articles
3. Aucun changement de code

