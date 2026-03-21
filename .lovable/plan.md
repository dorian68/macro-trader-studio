

## Comprehensive SEO Overhaul — AlphaLens AI

This plan is structured in 4 blocks as requested: Audit, Technical Fixes, Content Strategy, and Execution Roadmap.

---

### BLOC A — AUDIT

**What's good:**
- SEOHead component on every public page with unique title/description per page
- Canonical URLs on all public pages
- BreadcrumbList JSON-LD on key pages
- Organization + WebSite + SiteNavigationElement on Homepage
- Article schema on blog posts
- Google Analytics integrated with SPA route tracking
- robots.txt properly blocks private routes
- sitemap.xml covers public pages
- hreflang tags present (en, es, fa, x-default)
- Footer has good link structure (Product, Company, Support columns)
- RelatedPages component on all public pages for internal linking
- Blog infrastructure exists with Supabase backend and public RLS
- Legacy URL redirects in place
- Lazy loading for non-critical routes
- Font preconnect + display:swap
- Hero image preloaded

**What's fragile / problematic:**

1. **SITE_URL mismatch** — `structuredData.ts` and `SEOHead.tsx` use `macro-trader-studio.lovable.app` but the production domain is `alphalensai.com`. All canonical URLs, JSON-LD, OG tags, and sitemap point to the wrong domain. This is the **#1 critical issue** — Google indexes the wrong URLs.

2. **BlogPost.tsx hardcodes wrong SITE_URL** — Line 109: `const SITE_URL = "https://macro-trader-studio.lovable.app"` (unused but indicates confusion).

3. **BlogPost double SEOHead** — Lines 113-139 render two `<SEOHead>` components. The second one has empty titleKey/descriptionKey, which means blog posts with custom meta_title still get broken meta tags.

4. **SPA rendering** — All pages are client-side rendered. Google can crawl JS but it's slower and less reliable. No prerender strategy is actually implemented (only a meta tag recommendation exists).

5. **Homepage has no Blog link in RelatedPages** — Blog is the main SEO growth lever but has no homepage cross-link.

6. **Footer missing Blog link** — The blog is absent from the footer navigation.

7. **No FAQ JSON-LD** — Documentation and Help Center pages have FAQ-like content but no FAQ structured data (missed rich snippet opportunity).

8. **ProductPresentation page** uses `Layout` component (authenticated navbar) instead of `PublicNavbar` — inconsistent for a public page, and the page content is generic/duplicate of Features.

9. **No noindex on utility pages** — Pages like `/coming-soon`, `/email-confirmation`, `/confirm-success`, `/payment-success`, `/payment-canceled`, `/reset-password`, `/test-webhook` are not explicitly noindexed via SEOHead.

10. **Auth page is in sitemap** — `/auth` is indexable but has no real SEO value; should be noindexed or at minimum deprioritized.

11. **Footer uses `<button>` instead of `<a>`** — All footer links use `onClick={navigate}` buttons instead of `<a>` tags, which means crawlers cannot follow them. This kills internal link equity from the footer.

12. **PublicNavbar uses `<Button>` with onClick** — Same issue. Navigation links are not crawlable `<a>` tags.

13. **Homepage feature card CTAs** use `<button>` — Not crawlable links.

14. **Blog listing uses Card onClick** — Blog post links are not `<a>` tags, making them invisible to crawlers.

15. **Missing `<a>` tags everywhere** — This is a systemic issue. The entire site's internal linking is invisible to search engines because all navigation uses JavaScript onClick handlers instead of semantic `<a href>` tags.

16. **No `<meta name="fragment" content="!">` in index.html** — Only mentioned in docs, never implemented.

**What's missing:**
- Crawlable `<a>` links (critical)
- Domain alignment to `alphalensai.com`
- noindex on utility/transactional pages
- FAQ schema on Help Center and Documentation
- Service/Product schema on Features and Pricing
- Blog link in footer and homepage
- Proper prerendering for public pages
- Open Graph image generation per page
- Sitemap for dynamic blog posts
- Page-level performance optimization (defer non-critical JS)

---

### BLOC B — TECHNICAL FIXES (Priority Order)

#### B1. Fix SITE_URL to alphalensai.com (CRITICAL)
**Files:** `src/seo/structuredData.ts`, `src/components/SEOHead.tsx`, `src/seo/sitemapRoutes.ts`, `public/sitemap.xml`, `public/robots.txt`, `src/pages/BlogPost.tsx`
- Change all instances of `macro-trader-studio.lovable.app` to `alphalensai.com`
- This affects all canonical URLs, OG tags, JSON-LD, sitemap, and robots.txt

#### B2. Replace all navigation `<button onClick>` with `<Link>` / `<a>` tags (CRITICAL)
**Files:** `src/components/Footer.tsx`, `src/components/PublicNavbar.tsx`, `src/pages/Homepage.tsx`, `src/pages/Blog.tsx`, `src/pages/Features.tsx`, `src/pages/HelpCenter.tsx`, `src/components/RelatedPages.tsx`
- Replace `<button onClick={() => navigate("/path")}` with `<Link to="/path">` from react-router-dom
- This makes all internal links crawlable by search engines
- Preserve styling with className on Link components
- This is the single most impactful change for SEO — without it, Google sees no internal links

#### B3. Add noindex to utility/transactional pages
**Files:** Pages that should get `noIndex={true}` on their SEOHead:
- `EmailConfirmation`, `EmailConfirmationSuccess`, `PaymentSuccess`, `PaymentCanceled`, `ResetPassword`, `ComingSoon`, `TestWebhook`, `NotFound`
- Remove `/auth` and `/coming-soon` from sitemap

#### B4. Fix BlogPost double SEOHead
**File:** `src/pages/BlogPost.tsx`
- Remove the second SEOHead (lines 133-139)
- Pass custom title/description directly to the first SEOHead using the post's meta_title and meta_description as raw strings (not translation keys)

#### B5. Add Blog to Footer and Homepage
**Files:** `src/components/Footer.tsx`, `src/pages/Homepage.tsx`
- Add "Blog" link in Footer under Product column
- Add `{ label: "Blog", path: "/blog" }` to Homepage RelatedPages

#### B6. Add FAQ JSON-LD to Help Center and Documentation
**Files:** `src/pages/HelpCenter.tsx`, `src/pages/Documentation.tsx`, `src/seo/structuredData.ts`
- Create `faqSchema(items: {question: string, answer: string}[])` helper
- Add FAQ structured data to Help Center (from helpTopics) and Documentation FAQ tab

#### B7. Update sitemap with blog and remove non-SEO pages
**Files:** `public/sitemap.xml`, `src/seo/sitemapRoutes.ts`
- Remove `/auth` and `/coming-soon`
- Ensure `/blog` is present (already is)
- Note: Dynamic blog post URLs need a server-side sitemap generator (future phase)

#### B8. Add noindex meta to all auth-gated pages
**File:** SEOHead already supports `noIndex` prop. Add it to:
- Dashboard, AISetup, MacroAnalysis, Reports, Portfolio, History, Credits, Admin, Labs, Playground, TradeGenerator, MacroLab pages

#### B9. Performance quick wins
**File:** `index.html`
- Add `fetchpriority="high"` to hero image preload
- Defer Google Analytics script loading

---

### BLOC C — CONTENT & BLOG STRATEGY

#### 12 Topic Clusters

| # | Cluster | Pillar Page | Secondary Articles |
|---|---------|-------------|-------------------|
| 1 | AI Trading Signals | /blog/ai-trading-signals-guide | 10 articles on signal types, FX, crypto, entries |
| 2 | Macro Analysis | /blog/macro-analysis-for-traders | 10 articles on central banks, events, FX impact |
| 3 | Portfolio Management AI | /blog/ai-portfolio-management | 8 articles on risk, allocation, rebalancing |
| 4 | FX Trading | /blog/fx-trading-with-ai | 10 articles on pairs, strategies, signals |
| 5 | Crypto Research | /blog/crypto-research-ai | 8 articles on BTC, ETH, DeFi analysis |
| 6 | Quant Workflows | /blog/quant-trading-workflows | 8 articles on backtesting, validation, automation |
| 7 | Commodities | /blog/commodities-trading-ai | 8 articles on gold, oil, agricultural |
| 8 | Research Reports | /blog/financial-research-reports | 8 articles on report types, institutional grade |
| 9 | Risk Management | /blog/risk-management-ai | 8 articles on stop-loss, sizing, drawdown |
| 10 | Fintech Tools | /blog/fintech-trading-tools | 8 articles on platforms, APIs, integrations |
| 11 | Market Commentary | /blog/daily-market-commentary | 10 articles on weekly outlooks, event previews |
| 12 | AI for Institutions | /blog/ai-for-asset-managers | 8 articles on compliance, white-label, B2B |

#### 20 Priority Articles (First Wave)

1. "How AI is Transforming Institutional Trading in 2025"
2. "AI-Powered FX Trade Setups: Complete Guide"
3. "Macro Analysis for Traders: Understanding Central Bank Impact"
4. "Top 10 Technical Indicators for Algorithmic Trading"
5. "AI Portfolio Copilot: Real Use Cases for Asset Managers"
6. "Backtesting Trading Strategies with AI: Step-by-Step"
7. "Gold Trading with AI: Signals, Trends, and Setups"
8. "Bitcoin Analysis 2025: AI-Driven Research Framework"
9. "FX Carry Trade Explained: AI-Enhanced Execution"
10. "AI Risk Management: Stop-Loss Optimization Guide"
11. "EUR/USD Analysis: Macro Drivers and AI Signals"
12. "How to Read AI-Generated Research Reports"
13. "Commodities Trading with AI: Oil, Gold, Agriculture"
14. "Crypto vs FX: Which Markets Benefit Most from AI?"
15. "AI Trading API Integration: Developer Guide"
16. "Weekly Market Outlook: AI-Powered Macro Commentary"
17. "Portfolio Rebalancing with AI Recommendations"
18. "Quant Trading for Beginners: AI Workflow Setup"
19. "AI Trade Setup Validation: Confidence Scores Explained"
20. "Institutional Research Automation with AlphaLens"

#### 5 Pilot Articles (to create and publish)
These will be generated as ready-to-publish Markdown and inserted into the blog_posts table via the admin panel. Each ~1,500 words with proper H1/H2/H3, internal links, and CTA.

#### Pages to Create (Future Phase)
- `/use-cases` — persona-based landing pages (PM, quant, retail trader)
- `/how-it-works` — step-by-step product walkthrough
- `/alternatives` — comparison pages (vs Bloomberg Terminal, vs TradingView)
- `/glossary` — financial terms glossary (long-tail SEO magnet)

---

### BLOC D — EXECUTION ROADMAP

#### Phase 1: 0-30 days (This implementation)
**Quick wins to execute now:**
1. Fix SITE_URL to alphalensai.com everywhere
2. Replace all `<button onClick>` navigation with `<Link to>` (crawlable links)
3. Add noindex to utility pages
4. Fix BlogPost double SEOHead
5. Add Blog to Footer + Homepage
6. Add FAQ schema to Help Center
7. Update sitemap (remove /auth, /coming-soon)
8. Generate and publish 5 pilot articles

**Expected impact:** Site becomes properly indexable. Internal link graph becomes visible to Google. Foundation for sitelinks.

#### Phase 2: 30-90 days
- Publish 15 more articles (hit 20 total)
- Create pillar pages for top 3 clusters
- Add use-case pages
- Implement prerender.io or similar
- Begin outreach (10 targets)
- Target: 300-500 organic visits/day

#### Phase 3: 3-6 months
- Scale to 60 articles total
- All 12 clusters have pillar + 3+ secondaries
- Create comparison and glossary pages
- Outreach to 30 targets
- Target: 1,000-3,000 visits/day

#### Phase 4: 6-12 months
- 120+ articles published
- Full cluster coverage
- Industrialized publishing (2-3/week)
- Backlink profile >100 referring domains
- Target: 5,000-10,000 visits/day

---

### FILES TO MODIFY (This Implementation)

**Critical fixes (Block B1-B5):**
- `src/seo/structuredData.ts` — fix SITE_URL
- `src/components/SEOHead.tsx` — fix SITE_URL
- `src/seo/sitemapRoutes.ts` — fix SITE_URL, remove /auth and /coming-soon
- `public/sitemap.xml` — fix domain, remove /auth and /coming-soon
- `public/robots.txt` — fix domain
- `src/components/Footer.tsx` — replace buttons with Links, add Blog
- `src/components/PublicNavbar.tsx` — replace buttons with Links
- `src/components/RelatedPages.tsx` — replace buttons with Links
- `src/pages/Homepage.tsx` — replace buttons with Links, add Blog to RelatedPages
- `src/pages/Blog.tsx` — replace Card onClick with Links
- `src/pages/BlogPost.tsx` — fix double SEOHead, fix SITE_URL
- `src/pages/Features.tsx` — replace buttons with Links
- `src/pages/HelpCenter.tsx` — replace buttons with Links, add FAQ schema

**noindex additions:**
- `src/pages/EmailConfirmation.tsx`, `src/pages/EmailConfirmationSuccess.tsx`, `src/pages/PaymentSuccess.tsx`, `src/pages/PaymentCanceled.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/ComingSoon.tsx`, `src/pages/NotFound.tsx`

**New helper:**
- `src/seo/structuredData.ts` — add `faqSchema()` function

**Strategy documents (generated to /mnt/documents/):**
- `seo-audit-report.md`
- `editorial-calendar-120-titles.csv`
- `5 pilot articles` ready to publish

**No changes to:** Dashboard, Reports, Credits, Admin logic, authentication flows, edge functions, or any protected app functionality.

