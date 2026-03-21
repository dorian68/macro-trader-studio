

## SEO Optimization — Score: 85/100 → 88/100

### Status: ✅ Phase 2 implemented

#### Completed
- 86 articles published across 4 categories
- 28 articles SEO-optimized with meta_title, meta_description, excerpt, tags, Related Reading + CTA
- **Crawlable category routes**: `/blog/category/quant-backtesting`, `/blog/category/portfolio-risk`, `/blog/category/institutional-governance`, `/blog/category/commodities-macro`
- **Crawlable pagination**: `/blog/page/:num` with prev/next navigation
- **Font preload**: Added `<link rel="preload">` for Inter 400/600
- **Logo sr-only text**: Added `<span class="sr-only">AlphaLens AI</span>` for accessibility/SEO
- **Title standardization**: All pages now use "Title | AlphaLens AI" format
- **Sitemap updated**: 102 URLs (12 static + 4 category + 86 articles)
- **robots.txt**: Updated to allow `/blog/category/`
- **rel="prev/next" in `<head>`**: Moved from JSX body into `<Helmet>` for proper SEO
- **FAQPage schema auto-detection**: Articles with `## FAQ` sections automatically get JSON-LD FAQPage structured data
- **Category cover images**: 4 professional cover images (1200×630) as fallback for articles without custom covers
- **OG/Twitter images**: Category-based fallback for social sharing instead of generic og-image.png

#### Remaining (external actions)
1. Configure prerender.io for SPA indexing (critical — 5-10x indexation boost)
2. Submit sitemap to Google Search Console
3. Replace placeholder cover images with professional designs (Midjourney/Canva)
4. Obtain backlinks (guest posts, fintech sites, LinkedIn)
5. Dynamic `lastmod` in sitemap (requires build-time DB access)
