

## Dynamic Sitemap Generation

### Problem
The current `public/sitemap.xml` is a static file that must be manually updated when pages are added. It's also missing several public pages.

### Approach
Since this is a Vite SPA (no server-side rendering), we cannot generate the sitemap at request time. Instead, we'll create a **build-time sitemap generator** — a script that runs during `vite build` to produce `sitemap.xml` from a single source-of-truth route registry. When new pages are added, the developer only adds an entry to the registry and the sitemap updates automatically on next build.

### Implementation

#### 1. Create route registry (`src/seo/sitemapRoutes.ts`)
A single array defining all public, indexable routes with their metadata (path, priority, changefreq). This is the single source of truth — adding a new page means adding one line here.

```ts
export const sitemapRoutes = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/features', changefreq: 'monthly', priority: 0.9 },
  { path: '/pricing', changefreq: 'monthly', priority: 0.9 },
  // ... all public pages
];
```

#### 2. Create build-time generator script (`scripts/generate-sitemap.ts`)
A Node script that reads `sitemapRoutes`, generates valid XML, and writes to `dist/sitemap.xml`. Includes `<lastmod>` with the build date (Google standard).

#### 3. Integrate into Vite build via plugin
Add a small Vite plugin in `vite.config.ts` that runs the generator after build (`closeBundle` hook), so `sitemap.xml` is always up-to-date in production builds. Also keep the static `public/sitemap.xml` for dev mode.

#### 4. Update `public/sitemap.xml`
Update the static file to include all currently missing public pages (product, auth, privacy, terms are there — but missing `/coming-soon`). This serves as the dev-mode fallback.

### Files
- **New**: `src/seo/sitemapRoutes.ts` — route registry
- **New**: `scripts/generate-sitemap.ts` — build script  
- **Modified**: `vite.config.ts` — add sitemap generation plugin
- **Modified**: `public/sitemap.xml` — sync with full route list

### No design changes, no breaking changes.

