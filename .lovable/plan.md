

## Remove Blur Backdrop from Hero CTA Buttons

### Change

**File: `src/pages/Homepage.tsx`** -- Line 78

The two CTA buttons ("Try Demo" and "Get Started") are wrapped in a `div` with `backdrop-blur-sm bg-black/20 rounded-xl px-6 py-4`. This creates a semi-transparent blurred panel behind the buttons. We remove those styles and keep only the flex layout.

```
BEFORE:
<div className="inline-flex flex-col sm:flex-row gap-4 justify-center items-center backdrop-blur-sm bg-black/20 rounded-xl px-6 py-4">

AFTER:
<div className="inline-flex flex-col sm:flex-row gap-4 justify-center items-center">
```

### What does NOT change
- The two buttons themselves (style, text, routes, click handlers)
- Hero layout, logo, overlays, text, spacing
- Everything else on the page

