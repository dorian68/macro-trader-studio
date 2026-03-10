

## Add Schema.org Structured Data (JSON-LD)

### Current State
The Homepage already has basic `Organization` and `WebSite` schemas, but they're minimal — no `SearchAction`, no `SiteNavigationElement`, and no structured data on any other pages.

### Plan

#### 1. Create a shared schema definitions file (`src/seo/structuredData.ts`)
Centralizes all reusable JSON-LD objects so they're consistent and maintainable:

- **Organization** — name, url, logo, description, contactPoint
- **WebSite** — name, url, with `SearchAction` (potentialAction) pointing to the site (even without server-side search, this signals Google)
- **SiteNavigationElement** — array of nav items (Features, Pricing, Docs, About, Contact, Help, API) with name + url pairs

#### 2. Update Homepage (`src/pages/Homepage.tsx`)
Replace the inline `jsonLd` array with the centralized schemas: `Organization` + `WebSite` + `SiteNavigationElement`.

#### 3. Add BreadcrumbList to key public pages
Add `BreadcrumbList` JSON-LD to Features, Pricing, About, Contact, Docs, Help, API pages via their existing `SEOHead` `jsonLd` prop. Each gets a 2-level breadcrumb: `Home > Page Name`.

### Files
- **New**: `src/seo/structuredData.ts`
- **Modified**: `src/pages/Homepage.tsx` — use centralized schemas
- **Modified**: 7 public pages — add BreadcrumbList JSON-LD (Features, Pricing, About, Contact, Documentation, HelpCenter, API)

### No visual changes.

