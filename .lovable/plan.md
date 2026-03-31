

# Fix: Remove grid lines from dashboard chart

## Root Cause
`DEFAULT_DISPLAY_OPTIONS.showGrid` was changed to `true` in the previous fix, causing visible grid lines. The grid color `rgba(255,255,255,0.04)` is subtle but still visible.

## Fix (2 files)

### 1. `src/types/chartDisplayOptions.ts`
Set `showGrid: false` (revert to original).

### 2. `src/components/LightweightChartWidget.tsx`
- Line 198: hardcode grid to `transparent` regardless of `displayOptions.showGrid` — the dashboard chart should never show grid lines.
- Line 285: same change in the dynamic `applyOptions` effect.
- Keep `background: '#0f1117'` and all other institutional styling intact.

This removes the grid while preserving the dark premium background, readable scales, and proper chart fill.

