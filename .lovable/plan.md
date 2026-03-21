

## Insert Batches 3 (Macro 2) + 4 (FX 1) — 10 Articles

### Current State
- **31 articles** in DB, last batch ended at 2025-05-21
- Batches 3-4 continue the staggered schedule from 2025-05-24 onward

### Batch 3 — Macro 2 (dates: May 24 → Jun 5)

| Slug | Author | Date |
|------|--------|------|
| `gdp-nowcasting-ai-models` | AlphaLens Macro Team | 2025-05-24 |
| `labor-market-ai-analysis` | AlphaLens Research | 2025-05-27 |
| `central-bank-communication-nlp` | AlphaLens Macro Team | 2025-05-30 |
| `macro-regime-shifts-ai` | AlphaLens Research | 2025-06-02 |
| `cross-asset-macro-correlations` | AlphaLens Quant Desk | 2025-06-05 |

### Batch 4 — FX 1 (dates: Jun 8 → Jun 20)

| Slug | Author | Date |
|------|--------|------|
| `ai-fx-pair-selection` | AlphaLens Quant Desk | 2025-06-08 |
| `fx-carry-trade-optimization` | AlphaLens Macro Team | 2025-06-11 |
| `fx-volatility-forecasting-ai` | AlphaLens Quant Desk | 2025-06-14 |
| `emerging-market-fx-ai` | AlphaLens Research | 2025-06-17 |
| `fx-order-flow-analysis-ai` | AlphaLens Quant Desk | 2025-06-20 |

### Execution
1. Generate 10 articles (~1,500 words each) via AI gateway with finance-expert system prompt
2. INSERT 10 rows into `blog_posts` via psql
3. Categories: `market-commentary` for Macro 2, `fx` for FX 1
4. All slugs already in `sitemapRoutes.ts` — no code changes needed

### After insertion: 41 articles total, 45 remaining

