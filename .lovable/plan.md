

# Question-Led SEO Content Architecture for AlphaLens Blog

## Overview

Build a scalable "question-first" editorial system entirely within the existing blog infrastructure. 6 thematic hub pages aggregate articles by topic. ~40 question articles are inserted as `blog_posts` rows with enhanced rendering. No new database tables needed — leverages existing `blog_posts` with a `tags` field to link articles to hubs.

## Architecture

```text
/blog                          ← existing listing (unchanged)
/blog/hub/ai-trading           ← NEW hub page (6 total)
/blog/hub/forex-ai
/blog/hub/crypto-ai
/blog/hub/macro-analysis
/blog/hub/portfolio-risk
/blog/hub/quant-education
/blog/:slug                    ← existing + enhanced article template
```

Articles are tagged with hub slugs (e.g. `tags: ["hub:ai-trading", "hub:quant-education"]`) so hub pages can query dynamically.

## Deliverables

### 1. Question Article Data — `src/data/seoQuestionArticles.ts`

A single TypeScript file containing all ~40 question articles as structured objects:

```ts
interface SEOQuestionArticle {
  slug: string;
  title: string;           // H1 = exact search question
  metaTitle: string;        // ≤60 chars with "| AlphaLens AI"
  metaDescription: string;  // ≤155 chars
  excerpt: string;
  category: string;         // maps to existing 4 categories
  tags: string[];           // includes "hub:xxx" + "seo-question"
  hubSlugs: string[];       // which hubs this belongs to
  author: string;
  content: string;          // full markdown following template
  relatedSlugs: string[];   // 2-3 related question article slugs
  publishedAt: string;      // staggered dates
}
```

Each article follows this markdown template:
- Short direct answer (2-4 lines, featured-snippet optimized)
- Table of contents (markdown links to H2s)
- 4-7 H2/H3 sections with practical examples
- "Common Mistakes" section
- "How AlphaLens AI Helps" section
- Soft CTA
- "## FAQ" section (3-4 Q&As for FAQ schema)
- Related questions links block
- Internal links to hub, pricing, product pages

### 2. Hub Page Data — `src/data/seoHubPages.ts`

6 hub definitions:

```ts
interface SEOHubPage {
  slug: string;              // e.g. "ai-trading"
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroDescription: string;   // 2-3 sentence intro
  sections: {                // grouped question clusters
    title: string;
    description: string;
    articleSlugs: string[];
  }[];
  relatedHubs: string[];
  ctaText: string;
}
```

### 3. Migration — Seed question articles into `blog_posts`

A Supabase migration that INSERTs all ~40 question articles into `blog_posts` with:
- `status: 'published'`
- `tags` including `"seo-question"` and `"hub:xxx"`
- Staggered `published_at` dates (every 2-3 days, past dates only)
- `category` mapped to existing 4 categories

Uses `ON CONFLICT (slug) DO NOTHING` to be idempotent.

### 4. Hub Page Component — `src/pages/BlogHub.tsx`

New page component that:
- Takes `hubSlug` from URL params
- Looks up hub data from the static data file
- Queries `blog_posts` where `tags` contains `hub:{hubSlug}`
- Renders:
  - Breadcrumb: Home > Blog > Hub Name
  - Hero section with hub title + description
  - "Popular Questions" grid (top 6 articles as cards)
  - Sectioned article lists grouped by cluster
  - Related hubs cross-links
  - CTA to signup/dashboard
  - RelatedPages footer
- Full SEO: Helmet with meta tags, canonical, OG, breadcrumb + WebPage JSON-LD

### 5. Enhanced BlogPost Template

Modify `src/pages/BlogPost.tsx` to detect question articles (tag `"seo-question"`) and render enhanced UI:
- **Table of Contents** sidebar/block (extracted from H2 headings in markdown)
- **Share buttons** (Twitter, LinkedIn, copy link)
- **"Related Questions" block** at bottom (query by `relatedSlugs` from article data)
- **"Updated" date** display (using `updated_at`)
- **Author card** with byline
- Existing features preserved: breadcrumb, reading time, cover image, FAQ schema, CTA

### 6. Routes — `src/App.tsx`

Add hub route:
```tsx
<Route path="/blog/hub/:hubSlug" element={<BlogHub />} />
```

### 7. Sitemap & Robots — `src/seo/sitemapRoutes.ts` + `scripts/generate-sitemap.ts`

- Add all 6 hub pages: `/blog/hub/ai-trading` etc. (priority 0.8)
- Add all ~40 question article slugs (priority 0.7)
- Sync `generate-sitemap.ts` routes array

### 8. Internal Linking Integration

- **Blog.tsx**: Add a "Topic Hubs" section above the post grid with 6 hub cards
- **BlogPost.tsx**: For non-question articles, add "Explore by Topic" links to relevant hubs
- **Hub pages**: Cross-link to other hubs + pricing/features

### 9. Blog Category Expansion

The existing 4 categories remain. Question articles are assigned to the closest matching category. The `tags` field handles hub membership separately, so no category schema change is needed.

## Files Modified/Created

| File | Action |
|------|--------|
| `src/data/seoQuestionArticles.ts` | CREATE — all 40 article definitions with full content |
| `src/data/seoHubPages.ts` | CREATE — 6 hub page definitions |
| `src/pages/BlogHub.tsx` | CREATE — hub page component |
| `src/pages/BlogPost.tsx` | EDIT — enhanced template for question articles |
| `src/pages/Blog.tsx` | EDIT — add hub cards section |
| `src/App.tsx` | EDIT — add hub route |
| `src/seo/sitemapRoutes.ts` | EDIT — add hub + question URLs |
| `scripts/generate-sitemap.ts` | EDIT — sync routes |
| `supabase/migrations/xxx.sql` | CREATE — seed question articles |
| `src/seo/structuredData.ts` | EDIT — add hub page schema helper |

## What Does NOT Change

- Existing 86 blog articles — untouched
- Blog listing page layout and pagination — preserved
- Existing category system — preserved
- BlogPost rendering for non-question articles — preserved
- Admin BlogManagement — works as before (question articles editable too)
- Auth, payments, credits — untouched

## Content Quality Guardrails

- Each article has a unique angle — no duplicate intros
- Expert tone matching existing blog voice
- Practical examples tied to FX/crypto/commodities/macro
- "How AlphaLens AI Helps" section is product-relevant, not generic
- FAQ sections only where genuinely useful (not forced)
- All internal links use semantic `<Link>` components

## Implementation Order

1. Create data files (articles + hubs)
2. Create migration to seed articles
3. Create BlogHub page component
4. Enhance BlogPost for question articles
5. Add hub route to App.tsx
6. Add hub cards to Blog.tsx
7. Update sitemap routes
8. Verify no regressions on existing blog pages

