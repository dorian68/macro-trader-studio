

## Full SEO Optimization Sprint

### Summary
Execute all SEO improvements identified in the audit to move from 68/100 to 85+/100 and accelerate organic traffic growth. This covers 6 workstreams.

---

### 1. Fix Homepage onClick Buttons → Semantic Links
**Files:** `src/pages/Homepage.tsx`
- Line 86: Hero "Try Demo" button uses `onClick={handleFreeTrialClick}` → Replace with `<Link to="/auth?intent=free_trial">`
- Line 164: CTA "Request Demo" uses `onClick={() => navigate("/contact")}` → Replace with `<Link to="/contact">`
- Line 167: CTA "Start Free Trial" uses `onClick={handleFreeTrialClick}` → Replace with `<Link to="/auth?intent=free_trial">`
- Keep the visual styling identical, just wrap with `<Link>` instead of `onClick`

### 2. Enrich 12 Short Articles (< 4000 chars)
**Method:** AI gateway script → UPDATE in DB via psql

12 articles need content expansion from ~2K to 7K+ chars:
`multi-timeframe-signal-analysis`, `momentum-vs-mean-reversion-ai`, `ai-entry-exit-timing`, `ai-signal-validation-trading`, `risk-reward-optimization-ai`, `ai-portfolio-monitoring`, `ai-trading-tools-comparison`, `institutional-ai-market-intelligence`, `fx-carry-trade-ai-analysis`, `how-ai-generates-trading-signals`, `ai-research-desk-finance`, `ai-risk-management-trading`

Also fix 14 short meta_descriptions (< 120 chars) to 130-155 chars.

Process: Generate enriched content in batches of 4 via AI gateway, then UPDATE each row.

### 3. Generate 28 Remaining Articles + Insert
**Method:** AI gateway script → INSERT via psql in batches of 5

Missing clusters:
- Batch 1-2: Quant & Backtesting (10 articles)
- Batch 3-4: Portfolio & Risk (10 articles)
- Batch 5: Institutional (5 articles)
- Batch 6: Commodities extras (3 articles: `precious-metals-portfolio-ai`, `commodity-futures-curve-ai`, `commodity-correlation-macro-ai`)

Dates continue from Nov 5, 2025 → Mar 15, 2026 at 3-day intervals.

### 4. Add Prerender Meta Tag for SPA Indexing
**Files:** `index.html`
- Add `<meta name="fragment" content="!">` for AJAX crawling hint
- Add `<link rel="prerender">` hints for key pages
- This is a quick win; full prerender.io integration requires hosting config outside Lovable

### 5. Update Sitemap with All Articles
**Files:** `src/seo/sitemapRoutes.ts`, `public/sitemap.xml`
- Add 28 new article slugs to routes
- Regenerate sitemap.xml with all ~86 article URLs + 12 static pages = ~98 URLs

### 6. Generate Cover Images for All Articles
**Method:** AI image generation via gateway → Upload to Supabase storage → UPDATE `cover_image` in DB

Generate dark-themed finance visuals for all 86 articles using AI image generation. Process in batches of 5. Upload to `email-assets` public bucket (or create a `blog-images` public bucket).

---

### Execution Order
1. Homepage link fixes (quick code change)
2. Prerender meta tag (quick code change)
3. Enrich 12 short articles (3 batches × 4 articles)
4. Generate 28 new articles (6 batches × ~5 articles)
5. Update sitemap (code + file)
6. Generate cover images (17 batches × 5 images)

### Expected Impact
- SEO score: 68 → 85+
- All 86+ articles with full content (7K+ chars), proper meta, and cover images
- Homepage fully crawlable with semantic links
- Sitemap accurate with zero 404s

