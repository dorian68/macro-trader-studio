

# Fix: Add visible Privacy Policy link to Homepage

## Problem
Compliance auditors report that `https://alphalensai.com/` doesn't contain a link to the privacy policy. The Footer component **does** have a `/privacy` link, but it may not be detected by automated crawlers — likely because it's at the very bottom of a long page with lazy-loaded content, or the crawler doesn't scroll far enough.

## Solution
Two small changes to ensure the privacy link is unmissable:

### 1. Add a legal links bar in the Footer bottom section
**File: `src/components/Footer.tsx`**

In the copyright bar at the bottom (the `border-t` section), add explicit inline links to Privacy and Terms next to the copyright text:

```
© 2025–2026 alphaLens AI. All rights reserved. · Privacy Policy · Terms of Service
```

This ensures the links appear in the most standard, crawler-friendly location (footer bottom bar), separate from the column navigation above.

### 2. Verify the existing column link renders correctly
The existing `/privacy` link in the "Support" column uses `{t('footer.privacy')}` which resolves to "Privacy Policy" — this is correct. No change needed there.

## Why this works
- Automated compliance scanners specifically look for `<a href="...privacy...">` patterns in footers
- Having the link in both the footer columns AND the bottom copyright bar is the industry standard pattern (Google, Stripe, etc.)
- The bottom bar renders immediately without scrolling issues or lazy loading

