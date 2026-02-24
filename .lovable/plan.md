

## Increase Hero Logo Size

### Change

**File: `src/pages/Homepage.tsx`** -- Line 67

Increase the logo height so the text rendered inside the logo image visually matches the `text-5xl` (~3rem) headline size below it. Since the logo is an image containing text, it needs to be taller to make its internal text appear at that scale.

```
BEFORE:
className="h-28 sm:h-40 md:h-48 w-auto object-contain"

AFTER:
className="h-36 sm:h-52 md:h-64 w-auto object-contain"
```

- Mobile: `h-28` (7rem) becomes `h-36` (9rem)
- Tablet: `h-40` (10rem) becomes `h-52` (13rem)
- Desktop: `h-48` (12rem) becomes `h-64` (16rem)

Also adjust the negative top margin on the h1 to keep spacing tight between logo and headline:

```
BEFORE (line 71):
className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4 leading-tight -mt-4 sm:-mt-8 md:-mt-10"

AFTER:
className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4 leading-tight -mt-6 sm:-mt-10 md:-mt-14"
```

### What does NOT change
- Logo image file, hero layout, CTA buttons, overlays, transition, parallax
- Navbar, responsiveness, other sections
