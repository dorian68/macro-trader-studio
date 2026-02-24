
## Plan: Adjust AURA Reduced Panel Proportions

### Problem
The reduced (non-fullscreen) AURA panel currently uses `w-full md:w-1/3` -- meaning it takes 1/3 width starting at 768px (tablet), which is too narrow on tablets and doesn't precisely align with the dashboard's right column on desktop.

### Changes

**File: `src/components/AURA.tsx` (line 2122)**

Update the reduced panel width classes from:
```
right-0 top-0 h-full w-full md:w-1/3 z-40
```
to:
```
right-0 top-0 h-full w-full md:w-1/2 lg:w-1/3 z-40
```

This single class change achieves both goals:

| Breakpoint | Screen | Current | New |
|------------|--------|---------|-----|
| < 768px (mobile) | Phone | Full width | Full width (unchanged) |
| 768px-1023px (tablet) | iPad/tablet | 1/3 width | **1/2 width** |
| >= 1024px (desktop) | Desktop | 1/3 width | 1/3 width (matches dashboard right column) |

### Why This Works
- The dashboard right column (Quick Access + Market News) uses `lg:grid-cols-[2fr_1fr]`, which renders the right column as exactly 1/3 of the viewport at the `lg` breakpoint (1024px+). Using `lg:w-1/3` on AURA aligns it perfectly.
- On tablets (768px-1023px), the dashboard right column is hidden entirely, so AURA at 1/2 width provides a balanced, comfortable reading area.

### No Side Effects
- Only one CSS class string is modified on line 2122.
- No structural, logic, or state changes.
- Fullscreen mode is unaffected (uses a separate branch with `inset-0`).
- The collapsed bubble (not expanded) is unaffected.
