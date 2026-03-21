

## Insert 6 Articles (Batches 12-14)

### Articles

| # | Slug | Title | Category | Date |
|---|------|-------|----------|------|
| 23 | `ai-trading-desk-integration` | Integrating AI into the Trading Desk Workflow | institutional | 2026-02-17 |
| 24 | `ai-model-governance-finance` | AI Model Governance in Financial Services | institutional | 2026-02-21 |
| 25 | `future-of-ai-trading-2026` | The Future of AI Trading in 2026 | institutional | 2026-02-24 |
| 26 | `precious-metals-portfolio-ai` | Precious Metals in AI Portfolio Strategies | commodities | 2026-02-27 |
| 27 | `commodity-futures-curve-ai` | Commodity Futures Curve Analysis with AI | commodities | 2026-03-03 |
| 28 | `commodity-correlation-macro-ai` | Commodity-Macro Correlation Analysis with AI | commodities | 2026-03-06 |

Dates continue from last institutional article (Feb 14) with ~3-4 day spacing, all before today (Mar 21).

### Execution

1. **INSERT 6 rows** into `blog_posts` via SQL migration with:
   - Full Markdown content as provided (no modifications)
   - SEO-optimized `meta_title` (50-60 chars), `meta_description` (130-155 chars)
   - `excerpt`, `tags` array, appropriate `category`
   - `status = 'published'`, `language = 'en'`

2. **Update `src/seo/sitemapRoutes.ts`** — add 6 new slugs

3. **Regenerate `public/sitemap.xml`** — total: 98 URLs (12 static + 86 articles)

### After insertion: 86 articles total, 0 remaining

