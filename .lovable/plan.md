

## Smoother Hero-to-Section Transition

### Problem
The hero section ends at line 88 and the next section starts at line 91 with a hard `bg-background` boundary, creating a visible cutoff line.

### Solution
Two small changes to eliminate the hard edge:

1. **Add a bleed element at the bottom of the hero section** -- a tall gradient div that extends *below* the hero bounds, overlapping into the next section's visual space. This sits inside the hero `<section>` but uses negative margin or absolute positioning to extend past it.

2. **Soften the top of the next section** -- add a top gradient overlay or remove hard top padding to let it blend.

### Implementation Details

**File: `src/pages/Homepage.tsx`**

**Change 1 (after line 87, before `</section>`):** Add a bleed gradient that extends below the hero:

```jsx
{/* Transition bleed: extends below hero for smooth fade */}
<div className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 md:h-48 translate-y-1/2 z-20 bg-gradient-to-b from-transparent via-background/80 to-background pointer-events-none" />
```

This div is half inside, half outside the hero (via `translate-y-1/2`), creating a tall gradient that fades from transparent into `bg-background`. The `pointer-events-none` ensures no interaction issues.

**Change 2 (line 91):** Add `relative` and slight negative top margin to the next section so the bleed overlaps it naturally, plus remove some top padding:

```
BEFORE: className="py-10 px-4 bg-background"
AFTER:  className="relative z-10 pt-6 pb-10 px-4 bg-background"
```

Reduced `pt` (from `py-10` to `pt-6`) since the gradient bleed already provides visual spacing at the top.

### Visual Result

Instead of a hard line between hero and section, there will be a ~6-8rem tall soft gradient zone that fades from the hero's dark imagery into the solid dark background, making the boundary invisible.

### What is NOT changed
- Hero image, overlays, content, CTA, parallax effect
- Navbar, routing, auth
- Content of the "Professional Trading Intelligence" section
- Mobile responsiveness (gradient scales with `sm:h-40 md:h-48`)
