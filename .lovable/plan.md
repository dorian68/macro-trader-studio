

## Insert Batch 1 (AI Signals) + Generate & Insert Batch 2 (Macro 1)

### Current State
- 21 articles in DB, 13 with full content (7K+), 8 with shorter content (2K-4K)
- Batch 1 slugs missing: `ai-signal-noise-filtering`, `regime-detection-trading-ai`, `ai-stop-loss-placement`, `ai-trade-sizing-algorithms`, `real-time-signal-generation`
- Batch 2 slugs missing: `central-bank-policy-ai-analysis`, `inflation-forecasting-ai-models`, `yield-curve-analysis-ai`, `geopolitical-risk-ai-assessment`, `economic-calendar-ai-trading`

### Execution

1. **Generate 10 articles** via AI gateway script (2 batches of 5), each ~1,500 words Markdown with H2/H3, internal links, CTA
2. **Insert 10 rows** into `blog_posts` via migration with staggered dates:
   - Batch 1 dates: 2025-04-24, 2025-04-27, 2025-04-30, 2025-05-03, 2025-05-06
   - Batch 2 dates: 2025-05-09, 2025-05-12, 2025-05-15, 2025-05-18, 2025-05-21
3. Authors: Mix of "AlphaLens Research", "AlphaLens Quant Desk", "AlphaLens Macro Team"

### Articles

| # | Slug | Category | Author |
|---|------|----------|--------|
| 1 | ai-signal-noise-filtering | research | AlphaLens Quant Desk |
| 2 | regime-detection-trading-ai | research | AlphaLens Research |
| 3 | ai-stop-loss-placement | research | AlphaLens Quant Desk |
| 4 | ai-trade-sizing-algorithms | research | AlphaLens Quant Desk |
| 5 | real-time-signal-generation | research | AlphaLens Research |
| 6 | central-bank-policy-ai-analysis | market-commentary | AlphaLens Macro Team |
| 7 | inflation-forecasting-ai-models | market-commentary | AlphaLens Macro Team |
| 8 | yield-curve-analysis-ai | market-commentary | AlphaLens Macro Team |
| 9 | geopolitical-risk-ai-assessment | market-commentary | AlphaLens Research |
| 10 | economic-calendar-ai-trading | market-commentary | AlphaLens Macro Team |

### Files Modified
- Database: INSERT 10 rows into `blog_posts` (1 migration)
- No code file changes needed (slugs already in sitemapRoutes.ts)

