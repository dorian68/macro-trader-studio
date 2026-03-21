

## Insert 8 Portfolio & Risk Articles (Batches 6-9)

### Articles

| # | Slug | Title | Author | Date |
|---|------|-------|--------|------|
| 11 | `ai-portfolio-allocation-optimization` | AI-Powered Portfolio Allocation Optimization | AlphaLens Research | 2026-01-09 |
| 12 | `drawdown-management-ai` | Drawdown Management with AI Models | AlphaLens Research | 2026-01-12 |
| 13 | `correlation-regime-changes-ai` | Detecting Correlation Regime Changes with AI | AlphaLens Research | 2026-01-16 |
| 14 | `tail-risk-hedging-ai` | Tail Risk Hedging Using AI Analytics | AlphaLens Research | 2026-01-19 |
| 15 | `dynamic-rebalancing-ai` | Dynamic Portfolio Rebalancing with AI | AlphaLens Research | 2026-01-22 |
| 16 | `multi-asset-portfolio-ai` | Multi-Asset Portfolio Construction with AI | AlphaLens Research | 2026-01-26 |
| 17 | `esg-portfolio-integration-ai` | ESG Integration in AI Portfolio Management | AlphaLens Research | 2026-01-29 |
| 18 | `volatility-targeting-ai` | Volatility Targeting Strategies with AI | AlphaLens Research | 2026-02-01 |

Dates continue from the last quant article (Jan 6) with ~3-day intervals, reserving slots from Feb onward for the remaining 10 articles.

### Execution

1. **INSERT 8 rows** into `blog_posts` via SQL migration with:
   - Full Markdown content as provided (no modifications)
   - SEO-optimized `meta_title` (50-60 chars), `meta_description` (130-155 chars)
   - `excerpt`, `tags` array, `category = 'portfolio'`
   - `status = 'published'`, `language = 'en'`

2. **Update `src/seo/sitemapRoutes.ts`** — add 8 new slugs

3. **Regenerate `public/sitemap.xml`** — total: 88 URLs (12 static + 76 articles)

### After insertion: 76 articles total, 10 remaining

