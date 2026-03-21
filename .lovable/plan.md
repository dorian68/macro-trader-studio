

## Update sitemap.xml to Match 58 Published Articles

### Problem
- `sitemapRoutes.ts` currently lists **~86 blog slugs** including 28 that don't exist in the database yet (Quant, Portfolio, Institutional waves)
- Having non-existent URLs in the sitemap causes 404s which hurts SEO
- Need to trim to only the **58 actually published** articles

### Changes

**1. `src/seo/sitemapRoutes.ts`** — Remove 28 blog routes not yet in DB:
- Remove all Wave 4 entries: Quant & Backtesting (10), Portfolio & Risk (10), Institutional & Governance (5)
- Remove Wave 4 Commodities entries not in DB: `precious-metals-portfolio-ai`, `commodity-futures-curve-ai`, `commodity-correlation-macro-ai`
- Keep all 58 slugs that have published content

**2. `public/sitemap.xml`** — Regenerate with:
- 12 static pages (homepage, blog, features, pricing, etc.)
- 58 blog article URLs
- Total: 70 URLs

### No database changes needed — only file updates.

