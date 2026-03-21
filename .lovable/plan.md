

## Insert 4 Articles (Batches 10-11)

### Articles

| # | Slug | Title | Category | Date |
|---|------|-------|----------|------|
| 19 | `liquidity-risk-portfolio-ai` | Liquidity Risk Assessment in AI Portfolios | portfolio | 2026-02-05 |
| 20 | `stress-testing-portfolios-ai` | Stress Testing Portfolios with AI Scenarios | portfolio | 2026-02-08 |
| 21 | `mifid-compliance-ai-research` | MiFID II Compliance in AI-Powered Research | institutional | 2026-02-11 |
| 22 | `research-automation-buy-side` | Research Automation for Buy-Side Firms | institutional | 2026-02-14 |

Dates continue from last portfolio article (Feb 1) with ~3-day spacing.

### Execution

1. **INSERT 4 rows** into `blog_posts` via SQL migration with full Markdown content as provided, SEO-optimized meta_title/meta_description, excerpt, tags, status=published, language=en

2. **Update `src/seo/sitemapRoutes.ts`** — add 4 new slugs

3. **Regenerate `public/sitemap.xml`** — total: 92 URLs

### After insertion: 80 articles total, 6 remaining

