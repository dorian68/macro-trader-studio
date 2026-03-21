

## Comprehensive SEO Growth Strategy — 10K Organic Visits/Day

This plan has two parallel tracks: **Code Implementation** (blog infrastructure + technical SEO) and **Strategy Documents** (editorial calendar, articles, outreach, KPIs) delivered as downloadable files.

---

### Track A: Code Implementation (Blog Infrastructure)

#### A1. Create `blog_posts` Supabase table

```text
blog_posts
├── id (uuid, PK)
├── slug (text, unique, NOT NULL)        -- URL-friendly slug
├── title (text, NOT NULL)
├── meta_title (text)                    -- 50-60 chars
├── meta_description (text)             -- 120-155 chars
├── excerpt (text)                       -- Short preview
├── content (text, NOT NULL)            -- Markdown content
├── cover_image (text)                  -- OG image URL
├── author (text, default 'AlphaLens Research')
├── category (text)                      -- market-commentary, tutorial, etc.
├── tags (text[])                        -- Array of tags
├── language (text, default 'en')        -- en, fr, es
├── status (text, default 'draft')       -- draft / published
├── published_at (timestamptz)
├── created_at (timestamptz)
├── updated_at (timestamptz)
```

RLS: Public SELECT for `status = 'published'`. Admin/super_user for INSERT/UPDATE/DELETE.

#### A2. New frontend pages and routes

- `src/pages/Blog.tsx` — Blog listing page (`/blog`), public, no auth
- `src/pages/BlogPost.tsx` — Individual post page (`/blog/:slug`), public, no auth
- Both pages use `PublicNavbar` + `Footer` + `SEOHead` + `RelatedPages`
- Blog listing: paginated grid of posts with cover image, title, excerpt, date, category
- Blog post: rendered Markdown content with Article JSON-LD schema, breadcrumbs, OG tags

#### A3. Add "Blog" to PublicNavbar

Add `{ name: "Blog", path: "/blog" }` to `navigationItems` array.

#### A4. Article JSON-LD structured data

New helper in `src/seo/structuredData.ts`:
```typescript
export function articleSchema(post: BlogPost): Record<string, unknown>
```
Includes: `@type: Article`, `headline`, `author`, `datePublished`, `dateModified`, `image`, `publisher` (Organization), `description`.

#### A5. Update sitemap and robots

- Add `/blog` to `sitemapRoutes.ts` (priority 0.9, changefreq daily)
- Blog post URLs are dynamic — add an edge function `generate-blog-sitemap` that queries published posts and returns XML
- Update `robots.txt`: `Allow: /blog`

#### A6. Prerendering strategy

Since this is a Vite SPA, add `<meta name="fragment" content="!">` for AJAX crawling hint, and document a recommendation to use prerender.io or similar service as a reverse proxy for bots. This requires external infrastructure (CDN-level config) that cannot be done inside Lovable, but I will provide the full configuration guide.

#### A7. Admin blog management

Add a simple blog editor to the existing Admin page:
- List all posts (draft + published)
- Create/edit post form: title, slug (auto-generated), content (textarea with Markdown), meta fields, category, tags, cover image URL, status toggle, publish date
- No new routes needed — add as a tab in the existing Admin page

---

### Track B: Strategy Documents (Downloadable Files)

Generated as files in `/mnt/documents/`:

#### B1. SEO Strategy Roadmap (`seo-strategy-roadmap.md`)
- Phase 0-3 months: Technical foundation + 5 pilot articles + GA4/GSC setup
- Phase 3-6 months: Scale to 30 articles + outreach 20-50 targets + prerender
- Phase 6-12 months: 2-3 articles/week + backlink scale + conversion optimization
- KPIs and milestones per phase

#### B2. Editorial Calendar (`editorial-calendar.csv`)
120 titles (10/month for 12 months) with columns:
- Month, Title, Meta Title, Meta Description, Target Keywords, Search Intent, Difficulty, Word Count, Category, H1/H2 Structure Brief, CTA, Sources, Language

#### B3. 5 Pilot Articles (`articles/`)
Full SEO-optimized articles (1,200-2,000 words each) in Markdown:
1. "Comment l'IA transforme le trading institutionnel en 2025" (FR, informational)
2. "AI-Powered Trade Setups: A Complete Guide for Portfolio Managers" (EN, commercial)
3. "Analyse macro FX : guide complet pour traders professionnels" (FR, informational)
4. "Les 10 indicateurs techniques essentiels pour le trading algorithmique" (FR, informational)
5. "Copilote IA pour la gestion de portefeuille : cas d'usage réels" (FR, commercial)

Each includes: JSON-LD Article schema snippet, meta title/description, H1/H2 structure, internal links, CTA.

#### B4. Technical SEO Checklist (`technical-seo-checklist.md`)
- Canonical rules, hreflang, robots, sitemap strategy
- Structured data inventory (Organization, WebSite, BreadcrumbList, Article, FAQ)
- OG/Twitter preview templates
- Performance targets (LCP < 2.5s, CLS < 0.1)
- Prerender.io setup guide
- Core Web Vitals monitoring plan

#### B5. Netlinking Plan (`netlinking-plan.csv` + `outreach-templates.md`)
- 50 target sites (fintech blogs, quant newsletters, asset management publications)
- Outreach email templates (guest post pitch, case study collaboration, partnership)
- Acquisition calendar by month

#### B6. Tracking & KPI Plan (`tracking-kpi-plan.md`)
- GA4 event setup (organic sessions, signups, trial starts, blog CTA clicks)
- GSC configuration instructions
- Daily/weekly KPI dashboard structure
- A/B test priority list (titles, metas, CTAs, landing pages)

---

### Files Summary

**New files:**
- `src/pages/Blog.tsx` — Blog listing page
- `src/pages/BlogPost.tsx` — Individual article page
- Migration: `blog_posts` table + RLS policies
- `/mnt/documents/seo-strategy-roadmap.md`
- `/mnt/documents/editorial-calendar.csv`
- `/mnt/documents/articles/` (5 articles)
- `/mnt/documents/technical-seo-checklist.md`
- `/mnt/documents/netlinking-plan.csv`
- `/mnt/documents/outreach-templates.md`
- `/mnt/documents/tracking-kpi-plan.md`

**Modified files:**
- `src/App.tsx` — Add `/blog` and `/blog/:slug` routes
- `src/components/PublicNavbar.tsx` — Add Blog nav item
- `src/seo/structuredData.ts` — Add `articleSchema` helper
- `src/seo/sitemapRoutes.ts` — Add `/blog`
- `public/robots.txt` — Add `Allow: /blog`
- `public/sitemap.xml` — Add `/blog`
- `src/pages/Admin.tsx` — Add Blog management tab

**No changes to:** Dashboard, reports, credits, authentication logic, or any protected app functionality.

