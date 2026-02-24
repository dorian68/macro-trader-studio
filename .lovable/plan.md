

## Fix Hero-to-Section Transition

### Problem
The current transition bleed div (line 90) uses `translate-y-1/2` and `z-20`, which causes it to extend into and overlay the next section's text content. Meanwhile, the hero image bottom edge remains visible because the internal gradient (Overlay 4, line 57) is too subtle to fully hide it.

### Solution
Two changes, both in `src/pages/Homepage.tsx`:

**1. Remove the bleed div that overlaps the next section (line 89-90)**

Delete the transition bleed div entirely. It is the cause of the gradient sitting on top of the next section text.

**2. Strengthen the bottom fade inside the hero (line 57)**

Replace Overlay 4 with a stronger, more concentrated bottom fade that fully dissolves the hero image into solid dark *before* the section boundary:

```
BEFORE (line 57):
<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

AFTER:
<div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
```

Changing `from-black/80` to `from-black` (fully opaque) and `via-black/20` to `via-black/60` ensures the bottom ~30% of the hero is effectively solid dark, hiding the image edge completely.

**3. Restore normal styling on the next section (line 94)**

```
BEFORE: className="relative z-10 pt-6 pb-10 px-4 bg-background"
AFTER:  className="py-10 px-4 bg-background"
```

Remove `relative z-10` (no longer needed since there is no overlapping bleed) and restore `py-10` for balanced spacing.

### Result
- The hero image dissolves into solid dark entirely within the hero section
- The next section starts cleanly on a dark background with no gradient haze over its text
- No hard cutoff line visible
- No overlay on the "Professional Trading Intelligence" heading
- Parallax effect unchanged
- All other hero elements (overlays, content, CTA) unchanged

