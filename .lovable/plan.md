

# Dashboard Layout Redesign -- Clean Viewport-Locked Grid

## What went wrong with the previous attempt

The current implementation has structural CSS issues that prevent the viewport lock from working:

1. The `<section>` uses `w-screen left-1/2 -translate-x-1/2` which breaks out of the flex parent's height constraint -- the browser can't calculate height on a translated element inside a flex column
2. Row 1 and Row 2 are nested inside this broken section, so `flex-[3]` and `flex-[2]` have no effect
3. The chart still passes `height={350}` as a fixed pixel value, ignoring available space

## New approach: Simple two-row flex grid

Remove the `w-screen` translation hack entirely. The `Layout` already provides `max-w-[1920px]` when `fillViewport` is true -- that's sufficient width. The content just needs a clean flex column.

```text
+--[ Layout main: h-[100vh - navbar] overflow-hidden ]--------+
|                                                              |
|  +--[ Row 1: flex-[3] min-h-0 ]-------------------------+   |
|  |  [ Chart card (2/3)        ] [ NavCard 1 ]            |   |
|  |  [   fills height           ] [ NavCard 2 ]            |   |
|  |  [                          ] [ NavCard 3 ]            |   |
|  +-----------------------------------------------------------+
|  +--[ Row 2: flex-[2] min-h-0 ]-------------------------+   |
|  |  [ AssetInfoCard (2/3)     ] [ Market News (1/3)     ]|   |
|  |  [ overflow-y-auto          ] [ internal scroll      ]|   |
|  +-----------------------------------------------------------+
+--------------------------------------------------------------+
```

## Changes by file

### 1. `src/pages/TradingDashboard.tsx`

**Remove the `w-screen` hack** (line 262-263):
- Delete `relative left-1/2 -translate-x-1/2 w-screen px-4 sm:px-6 lg:px-8`
- Replace with a simple flex column container: `lg:flex lg:flex-col lg:h-full lg:overflow-hidden space-y-2`

**Row 1** (line 264): The existing grid `grid-cols-[2fr_1fr]` stays, but gets:
- `lg:flex-[3] lg:min-h-0` to take 60% of viewport and allow shrinking

**Row 2** (lines 419-429): The AssetInfo + MarketNews grid stays, but gets:
- `lg:flex-[2] lg:min-h-0` to take 40% of viewport
- Remove `mt-2` (flex gap handles spacing)

**Remove `max-w-[1920px] mx-auto`** from both rows -- the Layout container already provides this constraint.

### 2. `src/components/CandlestickChart.tsx`

**Make the chart fill its flex container** (line 169):
- The Card already has `flex-1 min-h-0 flex flex-col` (from prior fix) -- keep it
- The TradingView/Lightweight chart container inside: change from fixed `height={350}` to `className="flex-1 min-h-0"` so it stretches to fill available space on desktop
- Keep `height={350}` as a fallback for mobile only

### 3. `src/components/Layout.tsx`

No structural changes needed -- the `fillViewport` prop is already correct. Minor tweak:
- Ensure the inner container div has `lg:overflow-hidden` when fillViewport is true (already present, just verify)

## Files modified

| File | What changes |
|------|-------------|
| `src/pages/TradingDashboard.tsx` | Remove `w-screen` hack, clean flex-col wrapper, proper `flex-[3]`/`flex-[2]` on rows |
| `src/components/CandlestickChart.tsx` | Chart container uses `flex-1` instead of fixed 350px on desktop |
| `src/components/Layout.tsx` | Verify only -- no new changes expected |

## What stays identical

- Every component rendered (zero removals)
- All data fetching, WebSocket, job management logic
- All 3 navigation cards, their content and interactions
- Mobile layout (all changes gated behind `lg:`)
- BubbleSystem, MobileNewsBadge, MobileNewsModal, AURA
- AssetInfoCard and MarketNewsCollapsible internal behavior

## Expected result

- 13" laptop (1366x768): entire dashboard visible, zero page-level scroll
- Chart fills ~60% height dynamically, AssetInfo + Market News fill ~40%
- Market News scrolls internally (already has ScrollArea)
- Clean, balanced two-row grid with no visual overflow
- Mobile remains fully scrollable with stacked cards
