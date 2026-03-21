

## Insérer 4 Articles Quant (Batch 1-2)

### Articles identifiés

| # | Slug | Titre | Catégorie | Auteur | Date |
|---|------|-------|-----------|--------|------|
| 1 | `backtesting-pitfalls-overfitting-ai` | Backtesting Pitfalls: How AI Detects and Prevents Overfitting | quant | AlphaLens Quant Desk | 2025-11-05 |
| 2 | `walk-forward-optimization-ai` | Walk-Forward Optimization with AI Trading Models | quant | AlphaLens Research | 2025-11-08 |
| 3 | `monte-carlo-simulation-trading-ai` | Monte Carlo Simulation for AI-Driven Trading Strategies | quant | AlphaLens Quant Desk | 2025-11-11 |
| 4 | `factor-models-ai-trading` | Factor Models in AI Trading: From Theory to Implementation | quant | AlphaLens Research | 2025-11-14 |

### Execution

1. **INSERT 4 rows** into `blog_posts` via psql with:
   - Full Markdown content as-is (no modifications)
   - SEO-optimized `meta_title` (50-60 chars with primary keyword)
   - SEO-optimized `meta_description` (130-155 chars)
   - `excerpt` (first 2 sentences summarizing the article)
   - `tags` array with relevant keywords for each article
   - `status = 'published'`, `language = 'en'`
   - Staggered `published_at` dates (3-day intervals from Nov 5, 2025)

2. **Update `src/seo/sitemapRoutes.ts`** — add the 4 new slugs to the routes array

3. **Regenerate `public/sitemap.xml`** — include the 4 new URLs (total: 74 URLs)

### SEO Maximization per Article
- `meta_title`: keyword-front-loaded, under 60 chars
- `meta_description`: action-oriented, 130-155 chars, includes primary keyword
- `tags`: 5-8 relevant tags per article for internal categorization
- `excerpt`: compelling 2-sentence summary for blog listing cards
- Content kept exactly as provided (already includes H2/H3 structure, FAQ schema-ready sections, internal linking references)

### After insertion: 62 articles total, 24 remaining

