

# Fix: TradingView Chart Has Zero Height (Invisible)

## Root Cause

The TradingView chart renders inside a container chain that uses `flex-1 min-h-0` at every level. When there is no intrinsic content (the chart is injected via raw DOM, not React children), `flex-1` with `min-h-0` collapses to **0px height**. The `absolute inset-0` chart div inherits this zero height. TradingView's `autosize: true` then reads 0x0 dimensions and renders nothing.

The sizing chain:
```text
CardContent (flex-1 min-h-0)
  -> div (h-full flex flex-col min-h-0)
    -> TradingViewWidget root (h-full flex flex-col)
      -> chart wrapper (flex-1 min-h-0)     <-- collapses to 0!
        -> chartContainerRef (absolute inset-0) <-- 0x0
```

## Fix (2 changes in 1 file)

### File: `src/components/TradingViewWidget.tsx`

**Change 1 (line 406):** Add a minimum height to the chart wrapper so it never collapses to zero:

```tsx
// Before:
<div className="relative w-full flex-1 min-h-0 overflow-hidden rounded-2xl">

// After:
<div className="relative w-full flex-1 min-h-[300px] overflow-hidden rounded-2xl">
```

Replacing `min-h-0` with `min-h-[300px]` ensures the chart area always has at least 300px of height for TradingView to render into, while `flex-1` still allows it to grow larger when space is available.

**Change 2 (lines 399-402):** Remove the conditional loading spinner that competes for flex space and shows nothing useful (TradingView has its own loading screen configured at line 251). This prevents the layout from shifting during initialization:

```tsx
// Remove this block entirely:
{loading && <div className="flex items-center justify-center h-64 sm:h-80 lg:h-96">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2">Loading market data...</span>
  </div>}
```

## Why This Works

- `min-h-[300px]` gives the flex item a minimum intrinsic size, preventing the 0-height collapse
- TradingView's own `loading_screen` config (already set at line 251) handles the visual loading state
- The `flex-1` still lets the container expand to fill available space on larger screens
- No other files need changes

## No Regressions

- LightweightChartWidget path is unaffected (it has its own sizing)
- The fullscreen dialog chart will also benefit (same component)
- Mobile and desktop layouts both work because `min-h-[300px]` is a floor, not a fixed size

