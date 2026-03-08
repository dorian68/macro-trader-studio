

## SEO Audit — Findings & Improvement Plan

### Current State

| Area | Status | Issue |
|------|--------|-------|
| `<title>` + `<meta description>` | ⚠️ Partial | Only Homepage uses `SEOHead`. All other pages (Features, About, Pricing, Contact, Documentation, etc.) have NO per-page title/description |
| Canonical URLs | ❌ Missing | No `<link rel="canonical">` anywhere — risk of duplicate content penalties |
| Sitemap | ❌ Missing | No `sitemap.xml` — crawlers can't discover all pages efficiently |
| robots.txt | ⚠️ Incomplete | No `Sitemap:` directive pointing to sitemap.xml |
| Structured Data (JSON-LD) | ❌ Missing | No schema.org markup — no rich snippets in search results |
| hreflang tags | ⚠️ Broken | SEOHead points to `/en`, `/es`, `/fa` but those routes don't exist in the router |
| OG/Twitter meta | ⚠️ Static | Hardcoded in index.html, never updated per-page — social shares always show homepage info |
| Image alt texts | ⚠️ Inconsistent | Some images have alt, some don't |
| Semantic HTML | ⚠️ Weak | Homepage uses `<section>` but most pages use only `<div>` wrappers |
| Core Web Vitals | ✅ Good | Lazy loading, preconnect, webp, font-display swap already in place |
| `<h1>` structure | ⚠️ Missing on most pages | Only Homepage has clear `<h1>`. Other pages may have inconsistent heading hierarchy |

### Implementation Plan

#### 1. Upgrade `SEOHead` component
- Add `canonicalPath` prop → renders `<link rel="canonical" href="...">`
- Add `ogImage` prop with fallback to default og-image
- Add `ogType` prop (default: `website`)
- Fix hreflang to use actual site URL (no `/en` prefix since routes aren't language-prefixed)
- Add `twitter:card` and `twitter:image` per page
- Remove hardcoded OG tags from `index.html` (let Helmet handle them dynamically)

#### 2. Add `SEOHead` to ALL public pages
Each page gets unique title + description:
- **Features** → "AI Trading Features | alphaLens AI"
- **Pricing** → "Pricing Plans | alphaLens AI"
- **About** → "About Us | alphaLens AI"
- **Contact** → "Contact | alphaLens AI"
- **Documentation** → "Documentation | alphaLens AI"
- **Help Center** → "Help Center | alphaLens AI"
- **Privacy / Terms** → respective titles

Add SEO translation keys to `en/common.json`, `es/common.json`, `fa/common.json`.

#### 3. Create `public/sitemap.xml`
Static sitemap listing all public routes:
```
/, /features, /pricing, /about, /contact, /documentation, 
/help-center, /api, /privacy, /terms, /auth, /product
```
With `<lastmod>`, `<changefreq>`, and `<priority>` attributes.

#### 4. Update `robots.txt`
Add `Sitemap: https://macro-trader-studio.lovable.app/sitemap.xml` directive.

#### 5. Add JSON-LD structured data
- **Homepage**: `Organization` + `WebSite` with `SearchAction`
- **Pricing**: `Product` schema with offers
- **About**: `Organization` schema
- **Contact**: `ContactPage` schema

Implemented as a `<script type="application/ld+json">` inside the `SEOHead` component or a new `StructuredData` component.

#### 6. Minor HTML semantics
- Wrap page content in `<main>` tag on pages that don't have it
- Ensure every page has exactly one `<h1>`

### Files to modify
- `src/components/SEOHead.tsx` — enhanced with canonical, OG, structured data
- `index.html` — remove duplicate OG tags (Helmet manages them)
- `public/robots.txt` — add Sitemap directive
- `public/sitemap.xml` — new file
- `src/locales/en/common.json` — add per-page SEO keys
- `src/locales/es/common.json` — add per-page SEO keys
- `src/locales/fa/common.json` — add per-page SEO keys
- `src/pages/Features.tsx` — add SEOHead
- `src/pages/About.tsx` — add SEOHead
- `src/pages/Pricing.tsx` — add SEOHead
- `src/pages/Contact.tsx` — add SEOHead
- `src/pages/Documentation.tsx` — add SEOHead
- `src/pages/HelpCenter.tsx` — add SEOHead
- `src/pages/Privacy.tsx` — add SEOHead
- `src/pages/Terms.tsx` — add SEOHead
- `src/pages/API.tsx` — add SEOHead

No regressions: all changes are additive (meta tags + sitemap). No routing, logic, or UI changes.

