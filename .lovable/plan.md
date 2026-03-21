

## 100 Blog Articles + SEO Fixes + Pagination

### Current State
- 16 published articles, infrastructure solid
- Footer/Navbar already use `<Link>` (fixed previously)
- SITE_URL already `alphalensai.com`
- noIndex on all utility pages
- Blog page limited to 50 posts — needs pagination for 100+ articles
- Homepage feature cards still use `onClick` buttons (lines 86-91) — not crawlable

### Phase 1: Code Fixes

**1. Blog page: add pagination (load more / infinite scroll)**
- `src/pages/Blog.tsx`: Replace `.limit(50)` with paginated fetch (12 per page, "Load More" button)
- Add category filter dropdown so users can browse by topic

**2. Homepage: replace remaining `<button onClick>` CTAs with `<Link>`**
- `src/pages/Homepage.tsx` lines 86-91: Hero buttons use `onClick={() => navigate()}` — change to `<Link to>`

**3. Blog listing limit bump**
- Ensure pagination handles 100+ articles efficiently

### Phase 2: Generate 100 Articles via Script

Using the AI gateway script, generate articles in **20 batches of 5**, each batch targeting a specific cluster/topic. Articles will be written as full Markdown (~1,200-1,800 words each) with:
- SEO title, meta description, excerpt
- Internal links to other articles and product pages
- Staggered `published_at` dates spread across **12 months** (April 2025 → March 2026, ~2 articles/week) to look natural
- Mixed authors: "AlphaLens Research", "AlphaLens Quant Desk", "AlphaLens Macro Team"
- Diverse categories matching existing taxonomy

**10 Topic Clusters (10 articles each):**

| # | Cluster | Category |
|---|---------|----------|
| 1 | AI Trading Signals & Setups | research |
| 2 | Macro Analysis & Central Banks | market-commentary |
| 3 | FX Trading & Currency Markets | fx |
| 4 | Crypto Research & DeFi | crypto |
| 5 | Commodities (Gold, Oil, Agri) | commodities |
| 6 | Quant Workflows & Backtesting | quant |
| 7 | Portfolio Management & Risk | research |
| 8 | Institutional AI Adoption | research |
| 9 | Fintech Tools & Comparisons | product-guide |
| 10 | Market Commentary & Outlooks | market-commentary |

**Date distribution**: Articles dated from April 2025 to March 2026 (~2/week), looking like a steady editorial cadence over 12 months.

### Phase 3: Insert into Database

All 100 articles inserted via SQL (using the insert tool) in batches. Each with:
- Unique slug, proper meta_title (50-60 chars), meta_description (120-155 chars)
- `status: 'published'`
- Staggered `published_at` across 12 months
- Tags array, category, language `en`

### Phase 4: Update Sitemap

- Add all 100 new slugs to `src/seo/sitemapRoutes.ts`
- Regenerate `public/sitemap.xml` with all entries

### Files Modified
- `src/pages/Blog.tsx` — pagination + category filter
- `src/pages/Homepage.tsx` — fix hero button links
- `src/seo/sitemapRoutes.ts` — add 100 new routes
- `public/sitemap.xml` — add 100 new URLs
- Database: INSERT 100 rows into `blog_posts`

### Execution Strategy
Generate articles using the AI gateway script in `/tmp/`, then insert via SQL. This is a large operation — will process in sequential batches of 5 articles each, writing content to `/mnt/documents/articles-bulk/` for reference.

