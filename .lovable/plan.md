

## Add Bottom Dark Gradient to Hero

### Goal
Add a dark gradient fading from bottom to top on the hero section, creating a smooth visual "overlap" effect where the dark site background merges into the hero image at the bottom edge. This makes the transition between the hero and the "Professional Trading Intelligence" section feel seamless and cinematic.

### Change

**File: `src/pages/Homepage.tsx` (line 55)**

Add a new overlay layer (Overlay 4) right after the existing orange accent overlay:

```
<!-- Existing overlays remain unchanged -->
Overlay 1: from-black/90 via-black/50 to-transparent (top darkening)
Overlay 2: bg-black/30 (overall tint)
Overlay 3: from-accent/5 (subtle orange accent from bottom)

<!-- NEW Overlay 4: Dark gradient from bottom -->
<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
```

This creates a strong fade-to-black at the bottom of the hero (`from-black/80`), transitioning through a subtle mid-zone (`via-black/20`) to fully transparent at the top. The result:

- The bottom edge of the hero blends seamlessly into the dark `bg-background` of the next section
- The image remains most visible in the center/upper-center area
- Combined with the existing top gradient, the image is "framed" by darkness on both top and bottom, with peak visibility in the middle zone

### Visual result

```text
TOP:    ████████████ very dark (navbar overlay)
        ████████░░░░ fading
MIDDLE: ░░░░░░░░░░░░ image most visible here
        ░░░░████░░░░ fading
BOTTOM: ████████████ dark again (merges into site background)
```

### What is NOT changed
- All other overlays remain identical
- Content positioning, text, buttons, logo -- all untouched
- No layout or responsiveness changes
- No other files modified

