

## Add Parallax / Fixed-Background Effect to Hero

### Approach

Use the simplest and most reliable technique: change the hero background image `<div>` to use `background-attachment: fixed` on desktop, with a media-query-based fallback for mobile/tablet (where `fixed` is notoriously buggy, especially on iOS Safari).

This is implemented purely in CSS -- no JS scroll listeners, no libraries, no performance concerns.

### Change

**File: `src/pages/Homepage.tsx`** -- Line 47 only

Add `md:bg-fixed` to the background image div's className:

```
BEFORE:
  className="absolute inset-0 bg-cover bg-center bg-no-repeat"

AFTER:
  className="absolute inset-0 bg-cover bg-center bg-no-repeat md:bg-fixed"
```

That is the entire change. Tailwind's `md:bg-fixed` applies `background-attachment: fixed` only at `min-width: 768px` (desktop/tablet landscape), so:

- **Desktop/laptop:** The skyscraper image stays anchored as the user scrolls, creating the parallax effect. Page content scrolls over it naturally.
- **Mobile/small tablet:** Normal scroll behavior (no `fixed`), avoiding iOS Safari rendering bugs.

### Why this works cleanly

- The overlay divs (gradients, tints) are `absolute inset-0` children of the hero `<section>`, so they stay within the hero bounds regardless of background attachment.
- The hero content (`z-10` div) scrolls normally with the page.
- The `min-h-screen` section height means the fixed background is visible for the full viewport, then the next section scrolls over it seamlessly.
- No additional CSS, no JS, no new files needed.

### What is NOT changed

- No overlay modifications
- No content, text, logo, or CTA changes
- No navbar or routing changes
- No new dependencies
- No other files modified

