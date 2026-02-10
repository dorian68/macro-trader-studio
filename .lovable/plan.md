
# Dashboard Layout: Market News Below the Fold

## What changes

The user wants:
- **Row 1** (visible on load): Chart + Nav Cards + AssetInfoCard -- fills the viewport
- **Market News** moves below the fold, accessible by scrolling down
- No more viewport-lock (`overflow-hidden`) on the page -- re-enable vertical scroll

## Changes by file

### 1. `src/pages/TradingDashboard.tsx`

**Remove viewport-lock classes from the main wrapper** (line 260):
- Change `lg:flex lg:flex-col lg:h-full lg:overflow-hidden lg:space-y-0 lg:gap-2` to just `space-y-2 lg:space-y-2`
- The page becomes normally scrollable again

**Row 1** (line 262): Keep the chart + nav cards grid as-is, remove `lg:flex-[3] lg:min-h-0` (no longer needed since we're not in a flex viewport)

**Row 2** (lines 417-424): Split into two separate sections:
- **AssetInfoCard** stays directly below Row 1 (visible on load), placed in its own row
- **MarketNewsCollapsible** becomes a separate section below AssetInfoCard, with a fixed max-height (`lg:max-h-[500px]`) and internal scroll (`lg:overflow-y-auto`)

New structure:
```text
Row 1: Chart (2/3) + Nav Cards (1/3)     -- visible on load
Row 2: AssetInfoCard (full width)         -- visible on load  
Row 3: MarketNewsCollapsible (full width) -- below the fold, scroll to see
```

### 2. `src/components/Layout.tsx`

**Remove viewport-lock behavior** (lines 291-294):
- Remove the `fillViewport` conditional that sets `lg:h-[calc(100vh-3.5rem)] lg:min-h-0 lg:overflow-hidden`
- Keep `min-h-[calc(100vh-3.5rem)]` for all cases (normal scrollable page)
- The `fillViewport` prop can still control `max-w-[1920px]` vs `max-w-screen-lg` for width

### 3. `src/components/CandlestickChart.tsx`

No changes needed -- the `h-full flex flex-col` on the wrapper is harmless and works in both layouts.

## What stays identical

- All components rendered (zero removals)
- All data fetching, WebSocket, navigation, job management
- Mobile layout unchanged
- Nav cards, AssetInfoCard, MarketNewsCollapsible -- all preserved
- BubbleSystem, MobileNewsBadge, MobileNewsModal

## Expected result

- On load: Chart + Nav Cards + AssetInfoCard fill the screen
- Scroll down to see Market News with internal scrolling
- Clean, professional layout without forcing everything into a single viewport
