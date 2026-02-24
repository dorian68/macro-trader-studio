

## Center Hero Text Vertically

### Change

**File: `src/pages/Homepage.tsx`** -- Line 60

The hero content container currently uses `justify-end` which pushes everything to the bottom. Change it to `justify-center` to vertically center the content, and reduce the bottom padding:

```
BEFORE:
<div className="relative z-10 flex-1 flex flex-col justify-end pb-16 sm:pb-20 md:pb-24 px-4">

AFTER:
<div className="relative z-10 flex-1 flex flex-col justify-center pb-10 sm:pb-14 md:pb-16 px-4">
```

- `justify-end` becomes `justify-center`: centers the content block vertically in the hero viewport
- Bottom padding reduced (`pb-16` to `pb-10`, etc.) so the content sits closer to true center rather than being pulled too low

### What does NOT change
- Logo, headline text, description, CTA buttons, routes
- Overlays, parallax effect, transition to next section
- Navbar, responsiveness, layout of other sections
