

## Fix 5 SEO Quick Wins

### 1. Add all 8 blog article URLs to `public/sitemap.xml` and `scripts/generate-sitemap.ts`
- Add 8 `/blog/{slug}` entries to `public/sitemap.xml` with priority 0.7, changefreq weekly
- Update `scripts/generate-sitemap.ts`: fix SITE_URL to `alphalensai.com`, add `/blog` route, remove `/auth` and `/coming-soon`
- Add blog slugs to `sitemapRoutes.ts` for build-time generation

### 2. Fix WebSite SearchAction in `src/seo/structuredData.ts`
- Change `target` from `/dashboard?q={search_term_string}` to `/blog?q={search_term_string}` (public route, not private dashboard)

### 3. Stagger publication dates via SQL UPDATE
- Space the 8 articles across ~2 weeks (every 2 days) so Google sees a natural editorial cadence instead of all published at the same second

### 4. Inject internal links into article content via SQL UPDATE
For each article, append a "Related Reading" section at the end of the Markdown content with links to 2-3 other articles and 1-2 product pages (`/features`, `/pricing`). The existing Markdown renderer already supports `[text](url)` → `<a>` conversion.

### 5. Fix `scripts/generate-sitemap.ts` domain mismatch
- The build-time generator still uses `macro-trader-studio.lovable.app` — fix to `alphalensai.com`

### Files modified
- `public/sitemap.xml` — add 8 article URLs
- `src/seo/sitemapRoutes.ts` — add 8 article paths
- `scripts/generate-sitemap.ts` — fix domain, add blog routes, remove /auth and /coming-soon
- `src/seo/structuredData.ts` — fix SearchAction target
- Database: UPDATE blog_posts content (add internal links) and published_at (stagger dates)

### Technical details
- Internal links format: Markdown `[Article Title](/blog/slug)` and `[Features](/features)` appended as a `## Related Reading` section
- Date staggering: March 7, 9, 11, 13, 15, 17, 19, 21 (2-day intervals)
- No code logic changes — only content/config fixes

