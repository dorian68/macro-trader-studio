

## Insert 6 Quant Articles (Batches 3-5)

### Articles

| # | Slug | Title | Author | Date |
|---|------|-------|--------|------|
| 5 | `model-validation-ai-trading` | AI Model Validation for Trading: Best Practices | AlphaLens Quant Desk | 2025-11-17 |
| 6 | `feature-engineering-trading-ai` | Feature Engineering for AI Trading Systems | AlphaLens Research | 2025-11-20 |
| 7 | `ensemble-methods-trading-ai` | Ensemble Methods in AI Trading Strategies | AlphaLens Quant Desk | 2025-11-23 |
| 8 | `alternative-data-trading-ai` | Alternative Data Sources for AI Trading Intelligence | AlphaLens Research | 2025-11-26 |
| 9 | `reinforcement-learning-trading` | Reinforcement Learning Applied to Trading | AlphaLens Quant Desk | 2025-11-29 |
| 10 | `quantitative-strategy-lifecycle-ai` | The Full Lifecycle of a Quantitative AI Strategy | AlphaLens Research | 2025-12-02 |

### Execution

1. **INSERT 6 rows** into `blog_posts` via SQL migration with:
   - Full Markdown content as provided (no modifications)
   - SEO-optimized `meta_title` (50-60 chars), `meta_description` (130-155 chars)
   - `excerpt`, `tags` array, `category = 'quant'`
   - `status = 'published'`, `language = 'en'`
   - Staggered dates (3-day intervals from Nov 17, 2025)

2. **Update `src/seo/sitemapRoutes.ts`** — add the 6 new slugs

3. **Regenerate `public/sitemap.xml`** — total: 80 URLs (12 static + 68 articles)

### After insertion: 68 articles total, 18 remaining

