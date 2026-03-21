

## SEO Quick Wins (No AI Credits Required)

### Current State
- 58 articles in DB, sitemap aligned at 70 URLs
- Homepage links and prerender tags already fixed
- **14 meta_descriptions** too short (57-117 chars vs target 130-155)
- Several crawlability and performance issues in code

### Changes

**1. Fix 14 Short Meta Descriptions** (SQL UPDATE)
Manually rewrite meta_descriptions to 130-155 chars for:
- 5 Wave 3 stubs: `multi-timeframe-signal-analysis`, `risk-reward-optimization-ai`, `momentum-vs-mean-reversion-ai`, `ai-entry-exit-timing`, `how-ai-generates-trading-signals`
- 9 Wave 1-2 articles: `market-data-to-decision-ready-commentary`, `ai-explainability-trading-research`, `manual-vs-ai-market-research`, `commodities-research-ai-assistance`, `ai-macro-market-analysis-guide`, `quant-research-workflow-data-to-signal`, `ai-crypto-market-intelligence`, `fx-carry-trade-ai-analysis`, `ai-fx-research-workflows`

**2. Fix Pricing Page onClick → Semantic Link**
`src/pages/Pricing.tsx` line 183: `onClick={() => navigate('/features')}` → `<Link to="/features">`
This is a public, indexed page — crawlers miss this link currently.

**3. Add `loading="lazy"` to Blog Cover Images**
`src/pages/BlogPost.tsx` line 187: Add `loading="lazy"` attribute to the cover image for Core Web Vitals (LCP optimization).

**4. Improve Blog Article Breadcrumb Depth**
`src/pages/BlogPost.tsx`: Change breadcrumb from Home → Article to Home → Blog → Article (3 levels). This helps Google understand site hierarchy better.

**5. Add Estimated Reading Time to Blog Posts**
`src/pages/BlogPost.tsx`: Calculate and display reading time (~200 words/min) in the article header. This improves user engagement metrics and can appear in search snippets.

### Impact
- All 58 articles get proper-length meta descriptions (better CTR in search results)
- 1 additional crawlable internal link on Pricing page
- Better Core Web Vitals with lazy-loaded images
- Improved structured data with 3-level breadcrumbs
- Reading time signals content depth to users and search engines

