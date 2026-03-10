

## SEO Internal Linking Improvements

### What's already in place
- `SiteNavigationElement` JSON-LD already on Homepage
- `RelatedPages` component already on all public pages
- Features page already has a CTA section with `/auth` and `/contact`
- Translation keys for `nav.documentation` already exist in all locales

### Changes needed

#### 1. Add "Documentation" to PublicNavbar (`src/components/PublicNavbar.tsx`)
Add `{ name: t('nav.documentation'), path: "/docs" }` to `navigationItems` array after Pricing.

#### 2. Add Help Center to Homepage RelatedPages (`src/pages/Homepage.tsx`)
Add `{ label: "Help Center", path: "/help" }` to the existing RelatedPages links array.

#### 3. Add cross-page CTAs

- **Features** (`src/pages/Features.tsx`): Add a "See our plans" button linking to `/pricing` in the existing CTA section (alongside the current Start Trial and Request Demo buttons).

- **Pricing** (`src/pages/Pricing.tsx`): Add a text link "Compare all features" → `/features` near the top of the pricing section.

- **Documentation** (`src/pages/Documentation.tsx`): Add a small CTA section before RelatedPages with "Need help? Contact us" → `/contact`.

#### 4. Update static sitemap (`public/sitemap.xml`)
Add the missing `/help` URL entry. The route source-of-truth (`sitemapRoutes.ts`) already includes it, but the static fallback `public/sitemap.xml` does not.

### Files modified
- `src/components/PublicNavbar.tsx` — add Documentation nav item
- `src/pages/Homepage.tsx` — add Help Center to RelatedPages
- `src/pages/Features.tsx` — add Pricing button in CTA
- `src/pages/Pricing.tsx` — add Features link near top
- `src/pages/Documentation.tsx` — add Contact CTA
- `public/sitemap.xml` — add `/help` URL

