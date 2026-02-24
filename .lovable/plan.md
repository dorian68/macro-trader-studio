

## Hero Redesign: Cinematic Institutional Landing

### Overview
Transform the hero section into a full-viewport cinematic landing with the uploaded skyscraper image as background, layered dark gradient overlays (darker at top, image visible toward bottom), and content repositioned to the lower half for a premium institutional finance aesthetic.

### Step 1 -- Copy the background image into the project

Copy the uploaded skyscraper image to `public/images/hero-bg.jpg` so it can be used as a CSS background image with proper caching and no bundling overhead.

### Step 2 -- Modify `src/pages/Homepage.tsx` (hero section only, lines 43-71)

Replace the current hero `<section>` with a new structure:

```text
CURRENT:
  <section class="relative pt-0 pb-24 px-4 text-center bg-background">
    [logo centered at top]
    [headline right below]
    [description]
    [buttons]
  </section>

NEW:
  <section class="relative min-h-screen flex flex-col">
    <!-- Background image layer -->
    <div class="absolute inset-0 bg-cover bg-center bg-no-repeat"
         style="backgroundImage: url('/images/hero-bg.jpg')" />

    <!-- Overlay 1: Strong dark gradient from top (navbar readability) -->
    <div class="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />

    <!-- Overlay 2: Subtle overall dark tint -->
    <div class="absolute inset-0 bg-black/30" />

    <!-- Overlay 3: Very subtle orange tint at lower-center -->
    <div class="absolute inset-0 bg-gradient-to-t from-accent/5 via-transparent to-transparent" />

    <!-- Content: pushed to lower half -->
    <div class="relative z-10 flex-1 flex flex-col justify-end pb-16 sm:pb-20 md:pb-24 px-4">
      <div class="container mx-auto max-w-5xl text-center">
        [logo -- slightly smaller: h-28 sm:h-40 md:h-48]
        [headline -- white text, strong contrast]
        [description -- white/70 or muted lighter]
        [CTA buttons -- with subtle backdrop-blur behind group]
      </div>
    </div>
  </section>
```

### Key styling details

**Background image:**
- `bg-cover bg-center bg-no-repeat` ensures the upward-perspective vanishing point stays prominent
- Full `min-h-screen` height for strong first-screen impact

**Gradient overlays (3 layers):**
1. Top-to-bottom gradient: `from-black/90 via-black/50 to-transparent` -- makes the top very dark (navbar readable), fading to reveal the image toward the bottom
2. Subtle overall tint: `bg-black/30` -- slight dimming for text contrast everywhere
3. Optional brand accent: `from-accent/5 via-transparent to-transparent` from bottom -- very restrained orange warmth near the content area

**Content positioning:**
- `flex-1 flex flex-col justify-end` pushes all content to the lower portion
- `pb-16 sm:pb-20 md:pb-24` gives breathing room from the bottom edge
- Logo reduced slightly (h-28/h-40/h-48) since the hero is now full-height and the image is the star

**Headline:**
- Change from `text-primary` to `text-white` for maximum contrast against the image
- Keep existing i18n keys and text content unchanged

**CTA buttons:**
- Wrap in a container with `backdrop-blur-sm bg-black/20 rounded-xl px-6 py-4 inline-flex` for subtle glass effect ensuring readability over the image
- Keep existing click handlers and variants

**Responsiveness:**
- Mobile: `min-h-screen` still works, content stacks naturally at bottom
- Tablet/desktop: generous vertical space above content for the image to breathe
- No structural layout changes -- just vertical repositioning within the hero

### What is NOT changed

- PublicNavbar component -- completely untouched (stays sticky at top with its own bg)
- Product Features section (lines 73-125) -- untouched
- CTA section and Footer -- untouched
- All routing, auth logic, i18n keys -- untouched
- No new dependencies

### Technical approach

| Aspect | Implementation |
|--------|---------------|
| Image | Static file in `public/images/` referenced via inline style `backgroundImage` |
| Overlays | 3 stacked `absolute inset-0` divs with Tailwind gradients |
| Layout | Flexbox with `justify-end` to anchor content low |
| Glass effect | `backdrop-blur-sm` on CTA button wrapper |
| No JS changes | Only className and JSX structure changes in the hero section |

