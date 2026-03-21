

## Ajouter 5 nouvelles images pour passer de 20 a 25 images uniques

### Etat actuel

20 images couvrent 86 articles. 10 images sont a 6 articles chacune — encore de la repetition.

### Mapping des 5 nouvelles images

| Image | Fichier cible | Articles reassignes (3 par nouvelle image, pris dans les groupes a 6) |
|-------|--------------|------|
| $100 bills close-up (benscripps) | `cover-hundred-closeup.jpg` | 3 articles Portfolio du groupe hundred-bills: `ai-risk-management-trading`, `ai-portfolio-monitoring`, `liquidity-risk-portfolio-ai` |
| Bank facade (jamesqube) | `cover-bank-facade.jpg` | 3 articles Macro du groupe euro-coins: `central-bank-policy-ai-analysis`, `inflation-forecasting-ai-models`, `yield-curve-analysis-ai` |
| British pounds (stux) | `cover-british-pound.jpg` | 3 articles FX du groupe dirham: `emerging-market-fx-ai`, `asian-fx-markets-ai`, `fx-technical-patterns-ai` |
| Vault/safe (8385) | `cover-vault.jpg` | 3 articles Portfolio du groupe market-rise: `correlation-regime-changes-ai`, `esg-portfolio-integration-ai`, `volatility-targeting-ai` |
| Polish zloty green (alicja) | `cover-zloty-green.jpg` | 3 articles FX du groupe dollar-globe: `fx-carry-trade-ai-analysis`, `fx-carry-trade-optimization`, `fx-hedging-strategies-ai` |

### Resultat apres reassignation

| Image | Articles |
|-------|----------|
| 15 images existantes inchangees ou reduites a 3 | ~56 |
| 5 nouvelles images × 3 articles | 15 |
| + 5 images a 5 articles | 15 |
| **Total** | **86** |

Distribution max par image passe de 6 a 6 (les groupes non touches) mais 5 groupes descendent de 6 a 3, ce qui ajoute beaucoup de variete visuelle. Total: **25 images uniques** (incluant currencies a 1 article).

### Execution

1. **Copier 5 images** dans `public/images/blog/`
2. **1 SQL migration** UPDATE 15 articles pour reassigner les cover_image
3. **Aucun changement de code**

