

## Intensify Bottom Gradient for Seamless Hero-to-Site Blend

### Goal
Make the bottom fade of the hero image so strong and gradual that the transition between the hero and the rest of the site is completely invisible -- creating the illusion that the site content "slides over" the hero background as you scroll.

### Change

**File: `src/pages/Homepage.tsx` (line 55)**

Replace the current Overlay 4:
```
from-black/80 via-black/20 to-transparent
```

With a stronger, more gradual gradient:
```
from-black via-black/60 to-transparent
```

Key differences:
- `from-black` (100% opacity instead of 80%) -- fully opaque black at the very bottom, matching `bg-background` exactly
- `via-black/60` (instead of /20) -- the mid-transition zone is much darker, extending the fade further up the image
- This ensures there is zero visible "seam" between the hero bottom and the next section

### Visual result

```text
TOP:      very dark (navbar overlay)
UPPER:    fading, image becoming visible
CENTER:   image most visible
LOWER:    gradually darkening
BOTTOM:   pure black -- indistinguishable from bg-background
```

The scroll effect: as the user scrolls, the dark "Professional Trading Intelligence" section appears to slide seamlessly over the hero image because the bottom of the hero is already pure black.

### What is NOT changed
- All other overlays (1, 2, 3) remain identical
- Content, layout, responsiveness -- untouched
- No other files modified

