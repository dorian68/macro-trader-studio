

# Dashboard Premium Viewport-Fit Layout

## Diagnostic

The current layout has two issues preventing a clean viewport-fit on desktop:

1. **Layout container** uses `lg:h-full` but its parent (`min-h-[calc(100vh-3.5rem)]`) only sets a *minimum* height, not a *fixed* height. The `h-full` resolves to nothing useful.
2. **TradingDashboard** wraps everything in `space-y-2` which allows `AssetInfoCard` and `MarketNewsCollapsible` to push Row 1 beyond the viewport, causing scrollbars.

The goal: On desktop, the dashboard page shows **only** the Trading Chart + the 3 Navigation Cards (AI Trade Setup, Macro Commentary, Reports), perfectly filling the viewport with zero scroll and zero scrollbars. AssetInfoCard, MarketNews, and JobStatus remain accessible below the fold on mobile only.

## Changes

### 1. `src/components/Layout.tsx` (line 291-301)

Fix the `fillViewport` container to use a **fixed height** (not min-height) on desktop, with `overflow-hidden` to kill any page-level scroll:

```
// Before
<div className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
  <div className={cn(
    "px-4 sm:px-6 py-2 sm:py-3",
    fillViewport
      ? "lg:max-w-[1920px] lg:h-full lg:flex lg:flex-col"
      : "max-w-screen-lg",
    "mx-auto"
  )}>

// After
<div className={cn(
  fillViewport
    ? "lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden"
    : "",
  "min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]"
)}>
  <div className={cn(
    "px-4 sm:px-6 py-2 sm:py-3",
    fillViewport
      ? "lg:max-w-[1920px] lg:h-full lg:flex lg:flex-col"
      : "max-w-screen-lg",
    "mx-auto"
  )}>
```

This gives the outer wrapper a **fixed** `h-[calc(100vh-3.5rem)]` on `lg:` breakpoint when `fillViewport` is true, so `h-full` on children actually resolves correctly. `overflow-hidden` prevents any page scroll on desktop.

### 2. `src/pages/TradingDashboard.tsx`

**Main wrapper** (line 260): Make the `space-y-2` div fill the Layout and hide overflow on desktop:

```
// Before
<div className="space-y-2">

// After
<div className="space-y-2 lg:h-full lg:overflow-hidden">
```

**Row 1** (line 262): Switch from a fixed calc height to `flex-1` so it takes all remaining space in the flex parent. Remove the hardcoded `lg:h-[calc(100vh-4.25rem)]`:

```
// Before
<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-2 items-stretch lg:h-[calc(100vh-4.25rem)]">

// After
<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-2 items-stretch lg:flex-1 lg:min-h-0">
```

Using `flex-1 min-h-0` is more robust than a hardcoded calc -- it automatically fills whatever space the Layout provides, regardless of navbar height variations.

**Below-the-fold content** (lines 417-424): Hide AssetInfoCard and MarketNewsCollapsible on desktop (they are only useful on mobile where the viewport-lock doesn't apply):

```
// Before
<AssetInfoCard ... className="w-full" />
<MarketNewsCollapsible className="w-full lg:max-h-[500px] lg:overflow-y-auto" />

// After
<AssetInfoCard ... className="w-full lg:hidden" />
<MarketNewsCollapsible className="w-full lg:hidden" />
```

On desktop, these sections would never be visible anyway (overflow-hidden on parent). Adding `lg:hidden` makes the intent explicit and avoids rendering hidden DOM nodes.

### 3. No changes to `CandlestickChart.tsx`

The `overflow-hidden` already applied in the previous iteration is correct and sufficient.

## What stays identical

- All components, data fetching, WebSocket connections, navigation logic
- Mobile/tablet layout: standard stacked flow with normal scrolling
- All 3 nav cards (AI Trade Setup, Macro Commentary, Reports) fully visible
- BubbleSystem, MobileNewsBadge, MobileNewsModal, JobStatusCard
- No business logic, API, or data changes

## Expected result

- Desktop: Trading Chart (left 2/3) + 3 Nav Cards (right 1/3) fill the entire viewport exactly
- Bottom edges align with the bottom of the screen
- Zero scrollbars anywhere
- Zero vertical scroll on the dashboard page
- Mobile: unchanged, normal scrollable layout with all sections visible

