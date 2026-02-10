

# Dashboard Single-View Viewport Layout

## Problem

The current dashboard stacks content vertically across ~3 screens:
- Row 1: Chart (2/3) + 3 Nav Cards (1/3)
- Row 2: AssetInfoCard (full width)
- Row 3: MarketNewsCollapsible (full width, unconstrained)

This forces excessive scrolling. The Market News section expands to its full content height and spans the entire width, creating visual imbalance.

## Solution: Viewport-Locked Layout

Transform the dashboard into a viewport-filling layout using `h-[calc(100vh-3.5rem)]` (subtracting the navbar) with `overflow-hidden` on desktop, organized in two rows:

```text
+-------------------------------------------------------+
|  Navbar (fixed, ~56px)                                 |
+-------------------------------------------------------+
|                                                        |
|  [  Chart (2/3)              ] [ Nav Card 1 ]          |
|  [                           ] [ Nav Card 2 ]          |  Row 1 (flex-1)
|  [                           ] [ Nav Card 3 ]          |
|                                                        |
+-------------------------------------------------------+
|  [ AssetInfoCard (2/3)       ] [ Market News (1/3)   ] |  Row 2 (~35%)
|  [                           ] [ (internal scroll)   ] |
+-------------------------------------------------------+
```

## Changes by File

### 1. `src/components/Layout.tsx` (line 287-293)

Add a prop `fillViewport` to let the dashboard opt into viewport-locked mode. When true, the main content area uses `h-[calc(100vh-3.5rem)] overflow-hidden` on desktop instead of `min-h-[calc(100vh-3.5rem)]`.

- Add `fillViewport?: boolean` to Layout props
- When `fillViewport=true` on `lg:` screens: replace `min-h-[calc(100vh-3.5rem)]` with `lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden`
- The inner container switches from `max-w-screen-lg` to `max-w-[1920px]` when fillViewport is true
- Mobile remains unchanged (scrollable)

### 2. `src/pages/TradingDashboard.tsx`

**Pass `fillViewport` to Layout** (line 250):
- Add `fillViewport={true}` prop

**Restructure the main section** (lines 258-429) into a flex column that fills the viewport:

- Wrap everything in a `flex flex-col h-full` container on desktop
- **Row 1** (flex-[3]): Chart grid `lg:grid-cols-[2fr_1fr]` -- unchanged content, just flex-grows
- **Row 2** (flex-[2]): New `lg:grid-cols-[2fr_1fr]` grid placing AssetInfoCard (left, 2/3) and MarketNewsCollapsible (right, 1/3 with internal scroll and `overflow-y-auto`)
- Remove the current stacked `space-y-2` section that puts AssetInfo and MarketNews full-width below the chart

**Market News specific changes:**
- Move from full-width stacked position to the right column of Row 2
- Apply `lg:h-full lg:overflow-y-auto` so it fills available height and scrolls internally
- Remove the current `lg:max-h-[320px]` since the flex layout will constrain it naturally

**AssetInfoCard:**
- Move from full-width stacked position to the left column of Row 2
- Apply `lg:overflow-y-auto` in case content is taller than available space

### 3. `src/components/CandlestickChart.tsx` (line 169)

- Ensure no `min-h-[800px]` exists (already removed in prior fix)
- The chart card gets `flex-1 flex flex-col` so it fills Row 1 naturally
- The chart iframe/canvas area gets `flex-1 min-h-0` to shrink properly within flex

## Mobile Behavior (no change)

- All changes are gated behind `lg:` breakpoint
- Mobile keeps the current vertical stacking with normal page scroll
- Mobile News Badge and Modal remain unchanged

## What Stays Identical

- All components rendered (no removal)
- All data fetching, WebSocket connections, job management
- All navigation card destinations and interactions
- All asset selection, timeframe controls
- BubbleSystem, MobileNewsBadge, MobileNewsModal
- JobStatusCard (conditionally rendered, positioned at bottom)

## Expected Result

- On a 13" laptop (1366x768): entire dashboard visible without any page-level scroll
- Chart occupies ~60% of viewport height, AssetInfo + Market News occupy ~35%
- Market News has its own internal scroll for content overflow
- Navigation cards remain visible and clickable alongside the chart
- Professional, data-dense layout suitable for traders/analysts

