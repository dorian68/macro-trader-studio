

## Replace Hero Background with WebP Version

### Steps

**1. Copy the uploaded WebP image to `public/images/hero-bg.webp`**

The image will be placed alongside the existing `hero-bg.jpg` in the public folder since it's referenced via CSS `background-image` (not a React import).

**2. Update `src/pages/Homepage.tsx` (line 50)**

```
BEFORE:
style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}

AFTER:
style={{ backgroundImage: "url('/images/hero-bg.webp')" }}
```

**3. Add preload hint in `index.html` (after the font preconnect lines, around line 15)**

```html
<link rel="preload" as="image" type="image/webp" href="/images/hero-bg.webp" />
```

This tells the browser to fetch the hero image immediately, before CSS is parsed, improving LCP.

### What does NOT change
- All overlays, gradients, parallax, layout, content, CTA buttons
- Logo size, text centering, spacing -- everything from previous changes preserved
- The old `hero-bg.jpg` file stays in place (harmless, can be deleted manually later)

