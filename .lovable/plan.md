

## Add Google Analytics (G-KYJV42E72H)

### Approach
Since this is a React SPA, we need two things:
1. Add the gtag.js script to `index.html`
2. Track page views on route changes via a small component in `App.tsx`

### Changes

#### 1. `index.html` — Add gtag.js script in `<head>`
Add the Google Analytics script tags (async loader + config) right before the closing `</head>`.

#### 2. `src/components/GoogleAnalytics.tsx` — Create route-change tracker
A small component that listens to `useLocation()` changes and fires `gtag('config', 'G-KYJV42E72H', { page_path })` on every navigation. This ensures all SPA page views are tracked, not just the initial load.

#### 3. `src/App.tsx` — Mount the tracker
Add `<GoogleAnalytics />` inside the `<Router>` so it has access to location context.

### Files
- `index.html` — add gtag script
- `src/components/GoogleAnalytics.tsx` — new file
- `src/App.tsx` — add `<GoogleAnalytics />`

