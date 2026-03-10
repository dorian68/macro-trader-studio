

## URL SEO Audit & Improvements

### Current URLs — Issues Found

| Current URL | Issue | New URL |
|---|---|---|
| `/documentation` | Too long for a primary nav page | `/docs` |
| `/help-center` | Could be shorter | `/help` |
| `/alphalens-labs` | Brand-specific, long | `/labs` |
| `/portfolio-analytics` | Long, can be shortened | `/analytics` |
| `/email-confirmation-success` | Long utility URL | `/confirm-success` |
| `/forecast-playground` | Long | `/playground` |
| `/forecast-playground/tool` | Nested under old name | `/playground/tool` |
| `/forecast-playground/macro-commentary` | Legacy, long | Keep as redirect only |
| `/forecast-playground/trade-generator` | Legacy, long | Keep as redirect only |

All other URLs (`/pricing`, `/features`, `/about`, `/contact`, `/auth`, `/dashboard`, `/reports`, `/portfolio`, `/history`, `/credits`, `/admin`, `/privacy`, `/terms`, `/api`, `/trade-generator`, `/macro-lab`, `/macro-analysis`, `/ai-setup`, `/asset/:symbol`, `/reset-password`, `/payment-success`, `/payment-canceled`) are already short, descriptive, and use hyphens correctly.

### Implementation

#### 1. Update routes in `App.tsx`
- Change primary paths to new short URLs
- Keep old paths as redirects using `<Navigate to="/docs" replace />` for backward compatibility and to preserve any existing Google index

#### 2. Update all internal references
Files with links to update:
- **`/documentation` → `/docs`**: Footer.tsx, HelpCenter.tsx, API.tsx, Documentation.tsx (canonicalPath)
- **`/help-center` → `/help`**: Footer.tsx, HelpCenter.tsx (canonicalPath)
- **`/alphalens-labs` → `/labs`**: App.tsx only
- **`/portfolio-analytics` → `/analytics`**: App.tsx only
- **`/forecast-playground` → `/playground`**: App.tsx routes

#### 3. Update sitemap
Replace `/documentation` with `/docs` and add `/help` URL.

#### 4. Update canonical paths in SEOHead
Each renamed page gets its canonical updated to the new short URL.

### Files Modified
- `src/App.tsx` — route paths + redirect routes
- `src/components/Footer.tsx` — nav links
- `src/pages/HelpCenter.tsx` — canonicalPath + internal links
- `src/pages/Documentation.tsx` — canonicalPath
- `src/pages/API.tsx` — link to docs
- `public/sitemap.xml` — updated URLs

### No Breaking Changes
- Old URLs redirect to new ones via `<Navigate replace />`
- All functionality preserved

