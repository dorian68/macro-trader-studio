

## Ajouter 8 nouvelles images optimisees (WebP, 1200px) pour diversifier les covers

### Images uploadees (8 uniques)

| # | Description |
|---|---|
| 11.png | Analyste examinant des graphiques barres + laptop |
| 12.png | Lingots or + liasses dollars + fleches marche |
| 13.png | Taureau or + ours argent (bull vs bear) |
| 14.png | Telephone + double ecran trading |
| 21.png | Pieces or + fleche verte montante + chandelier |
| 22.png | Trader laptop + telephone charts |
| 23.png | Globe + calculatrice + dollars + chandelier |
| 24.png | Taureau + ours noirs (bull vs bear sombre) |

### Etat actuel

42 images pour 86 articles. 9 groupes a 3 articles, le reste a 2 ou 1.

### Mapping des 8 nouvelles images

Chaque image prend 1 article d'un groupe de 3 + 1 d'un groupe de 2.

| Image | Fichier cible | Articles reassignes |
|---|---|---|
| 11.png | `cover-analyst-review.webp` | `regime-detection-trading-ai` (market-arrows×3), `alternative-data-trading-ai` (financial-stats×2) |
| 12.png | `cover-gold-bars-market.webp` | `usd-strength-ai-model` (dollar-globe×3), `stress-testing-portfolios-ai` (hundred-bills×2) |
| 13.png | `cover-bull-bear-gold.webp` | `real-time-signal-generation` (finance-charts×3), `future-of-ai-trading-2026` (coins-trading×2) |
| 14.png | `cover-multi-screen.webp` | `fx-news-sentiment-trading` (dirham×3), `ai-portfolio-monitoring` (hundred-closeup×2) |
| 21.png | `cover-coins-arrow-up.webp` | `yield-curve-analysis-ai` (bank-facade×3), `gdp-nowcasting-ai-models` (euro-coins×2) |
| 22.png | `cover-trader-desk.webp` | `ai-backtest-trading-strategy` (laptop-dark×3), `reinforcement-learning-trading` (ai-data×2) |
| 23.png | `cover-global-finance.webp` | `fx-carry-trade-optimization` (zloty-green×3), `geopolitical-risk-ai-assessment` (central-bank×3) |
| 24.png | `cover-bull-bear-dark.webp` | `bitcoin-on-chain-analysis-ai` (risk-puzzle×3), `institutional-ai-market-intelligence` (dollars-spread×2) |

### Resultat

- 9 groupes de 3 → tous passent a 2
- 6 groupes de 2 → passent a 1
- 8 nouvelles images × 2 articles chacune
- Total: **50 images uniques**, max **2** par image partout

### Execution

1. Convertir 8 images en WebP (1200px) via ImageMagick, copier dans `public/images/blog/`
2. 1 migration SQL UPDATE 16 articles
3. Aucun changement de code

