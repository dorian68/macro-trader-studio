

## Improve Internal Linking Across the Website

### Current Gaps

| Page | Links TO other pages (in content) | Missing links to |
|------|----------------------------------|-----------------|
| Homepage | /dashboard, /macro-analysis, /reports, /contact, /auth | /features, /pricing, /about, /docs, /api |
| Features | /dashboard, /macro-analysis, /reports, /auth, /contact | /pricing, /about, /docs |
| Pricing | /contact, /auth | /features, /docs |
| About | None (only navbar/footer) | /features, /pricing, /contact |
| Documentation | None | /features, /pricing, /help, /contact |
| API | /contact, /docs | /features, /pricing |
| HelpCenter | /docs, /pricing, /terms, /contact | /features |
| Contact | None | /features, /pricing, /docs |
| Privacy | None | /contact, /terms |
| Terms | None | /contact, /privacy |

Navbar and Footer provide baseline linking, but Google values **contextual in-content links** much more for understanding page hierarchy.

### Approach

Two changes, no visual layout modifications:

#### 1. Create a reusable `RelatedPages` component
A small, unobtrusive section rendered just before the Footer on each page. Displays 3-4 contextual links as simple text buttons, styled consistently with existing muted text. Pattern: "Explore more: Features | Pricing | Documentation | Contact". This eliminates orphan pages and creates a cross-linking mesh.

#### 2. Add inline contextual links to key pages
- **Homepage**: Add "Explore all features" link to /features in the product section, and "See pricing" link in CTA section
- **Features**: Add /pricing link in CTA section ("See our plans")
- **Pricing**: Add /features link ("Compare features")
- **About**: Add /contact link in mission section
- **Documentation**: Add /help link in FAQ tab
- **API**: Already has /docs link; add /pricing link

### Files
- **New**: `src/components/RelatedPages.tsx` — reusable contextual links component
- **Modified**: Homepage, Features, Pricing, About, Documentation, API, HelpCenter, Contact, Privacy, Terms — add `<RelatedPages>` and select inline links

### No visual layout changes. Links blend into existing design using current styling patterns.

