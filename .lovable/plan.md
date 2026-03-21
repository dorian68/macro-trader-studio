

## SEO Audit + 8 New Blog Articles

### Current SEO Score: 42/100

**CRITICAL BLOCKER: alphalensai.com/blog returns 404**
The blog works on the Lovable preview domain (`macro-trader-studio.lovable.app/blog`) but `alphalensai.com/blog` returns a 404. This means the custom domain deployment is missing or the SPA fallback is not configured. **Zero SEO value until this is fixed.** This is an infrastructure/hosting issue outside of code — the custom domain needs proper SPA routing (all paths should serve `index.html`).

**Can this site reach 10K visits/day? Not yet.** Here's what's missing:

| Dimension | Score | Issue |
|-----------|-------|-------|
| Production accessibility | 0/20 | Blog 404 on production domain |
| Content volume | 8/20 | 8 articles (need 100+) |
| Cover images / OG | 3/10 | All 8 articles have `cover_image: null` |
| SPA rendering for bots | 2/10 | No prerender — bots see empty HTML |
| Internal linking | 7/10 | Related Reading sections present |
| Structured data | 8/10 | Article + Breadcrumb JSON-LD good |
| Sitemap / robots | 8/10 | All 8 articles in sitemap, robots correct |
| Meta / canonicals | 8/10 | Proper meta titles, descriptions, canonicals |
| Backlinks / DA | 0/10 | New domain, no referring domains |

### What needs to happen (priority order):

1. **Fix production 404** — Ensure `alphalensai.com` serves the SPA correctly (hosting config, not code)
2. **Add prerendering** — Without it, Googlebot sees blank pages
3. **Scale content to 50+ articles** — 8 articles cannot generate meaningful traffic
4. **Add cover images** — Improves CTR in social shares and search
5. **Build backlinks** — DA=0 means Google won't rank content regardless of quality

---

### Track 1: Generate 8 New Articles (Database Insert)

These 8 articles expand into new clusters (backtesting, risk management, institutional use cases, portfolio AI) to broaden topical authority. All inserted directly into `blog_posts` via a script.

**3 New Clusters:**

| Cluster | Why | Audience |
|---------|-----|----------|
| Backtesting & Validation | High-intent quant queries, directly maps to product | Quants, algo traders |
| Risk Management & AI | Underserved niche, strong commercial intent | PMs, risk officers |
| Institutional AI Adoption | Decision-maker audience, BOFU conversion | Heads of research, CTOs |

**8 Articles:**

| # | Title | Keyword | Intent | Funnel |
|---|-------|---------|--------|--------|
| 1 | How to Backtest Trading Strategies with AI: A Step-by-Step Guide | ai backtest trading strategy | informational | MOFU |
| 2 | AI Risk Management for Trading Portfolios: What Works in Practice | ai risk management trading | commercial | MOFU |
| 3 | Building an AI-Powered Research Desk: Tools, Workflows, and Lessons | ai research desk finance | informational | TOFU |
| 4 | How Institutional Investors Are Using AI for Market Intelligence | institutional ai market intelligence | informational | TOFU |
| 5 | Signal Validation with AI: From Raw Data to Tradeable Conviction | ai signal validation trading | commercial | MOFU |
| 6 | The Complete Guide to AI-Assisted Portfolio Monitoring | ai portfolio monitoring | informational | MOFU |
| 7 | Why Most AI Trading Tools Fail — And What to Look For Instead | ai trading tools comparison | commercial | BOFU |
| 8 | FX Carry Trade Analysis with AI: A Practical Framework | fx carry trade ai analysis | informational | MOFU |

Each article: ~1,500 words, full SEO metadata, internal links to existing articles + product pages, CTA, Article JSON-LD schema.

### Track 2: Generate Strategy Documents

Create `/mnt/documents/seo-audit-march-2026.md` with:
- Full scored audit
- Prioritized fix list
- Roadmap to 10K visits/month (realistic) then 10K/day (stretch)

### Execution

1. Write 8 articles as Markdown, generate to `/mnt/documents/articles-wave2/`
2. Insert all 8 into `blog_posts` table with `published` status, staggered dates (March 22–April 5)
3. Update `public/sitemap.xml` with 8 new URLs
4. Update `src/seo/sitemapRoutes.ts` with new slugs
5. Generate audit document

### Files modified
- `public/sitemap.xml` — add 8 new article URLs
- `src/seo/sitemapRoutes.ts` — add 8 new paths
- Database: INSERT 8 new rows into `blog_posts`
- `/mnt/documents/articles-wave2/` — 8 Markdown files
- `/mnt/documents/seo-audit-march-2026.md` — audit report

