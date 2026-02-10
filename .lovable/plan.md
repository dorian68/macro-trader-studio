

# Dashboard Viewport-Locked Layout

## Problem

The dashboard stacks 3 sections vertically (Chart+NavCards, AssetInfo, MarketNews) requiring multiple scrolls. The Layout component uses `min-h-[calc(100vh-...)]` which allows unlimited expansion, and the Market News card spans full width with no height cap.

## Solution

### 1. `src/components/Layout.tsx` -- Add `fillViewport` prop

Add an optional `fillViewport?: boolean` prop to the Layout component. When `true` and on desktop (`lg:`):

- The outer `<main>` inner div switches from `min-h-[calc(100vh-3.5rem)]` to `lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden`
- The container switches from `max-w-screen-lg` to `max-w-[1920px]` and uses `lg:h-full lg:flex lg:flex-col`
- Mobile remains unchanged (normal scroll)

**Props change:**
```
interface LayoutProps {
  children: React.ReactNode;
  fillViewport?: boolean;  // NEW
  ...
}
```

**Main content area (lines 287-293):**
- When `fillViewport`: the inner wrapper gets `lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden`
- The container div gets `lg:h-full lg:max-w-[1920px]` instead of `max-w-screen-lg`

### 2. `src/pages/TradingDashboard.tsx` -- Two-row viewport layout

**Pass prop (line 250):**
- Add `fillViewport` to the Layout call

**Restructure the content (lines 258-429) into a flex column with two rows on desktop:**

```
Row 1 (flex-[3]): Chart (2/3) + Nav Cards (1/3)     -- already exists as grid
Row 2 (flex-[2]): AssetInfo (2/3) + MarketNews (1/3) -- currently stacked full-width
```

Specific changes:

- Wrap the entire section content in a `lg:flex lg:flex-col lg:h-full` container
- **Row 1** (lines 263-416): Add `lg:flex-[3] lg:min-h-0` so it takes ~60% of viewport and can shrink
- **Row 2** (lines 418-428): Transform from stacked `space-y-2` into a `lg:grid lg:grid-cols-[2fr_1fr] lg:flex-[2] lg:min-h-0` grid:
  - Left column: `AssetInfoCard` with `lg:overflow-y-auto`
  - Right column: `MarketNewsCollapsible` with `lg:overflow-y-auto lg:h-full` (internal scroll only)
  - Remove the current `lg:max-h-[320px]` since flex constraints will handle height naturally
- **Row 2 gap**: `gap-2` consistent with Row 1

### 3. `src/components/CandlestickChart.tsx` -- Flex-friendly card

- Line 169: Ensure the Card has `flex-1 min-h-0` so it can shrink within the flex row
- The chart container inside should also use `flex-1 min-h-0` to allow the TradingView widget to scale

## Files Modified

| File | Changes |
|------|---------|
| `src/components/Layout.tsx` | Add `fillViewport` prop, conditional viewport-lock classes |
| `src/pages/TradingDashboard.tsx` | Pass `fillViewport`, restructure into 2-row flex layout with Market News in right column of Row 2 |
| `src/components/CandlestickChart.tsx` | Add `flex-1 min-h-0` to the Card for flex shrinking |

## What stays identical

- All components rendered (zero removals)
- All data fetching, WebSocket, job management
- All navigation cards, interactions, mobile behavior
- BubbleSystem, MobileNewsBadge, MobileNewsModal, AURA
- Mobile layout remains fully scrollable (changes gated behind `lg:`)

## Expected result

- 13" laptop (1366x768): entire dashboard visible, zero page-level scroll
- Chart ~60% height, AssetInfo + Market News ~35%
- Market News scrolls internally within its allocated space
- Navigation cards visible alongside chart
- Professional, data-dense single-screen layout

