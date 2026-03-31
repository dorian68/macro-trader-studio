

# Investigation: Dashboard Chart Not Displaying

## Root Cause Analysis

The chart code itself has not been modified recently. The regression likely stems from one of these causes:

### Most Likely: Edge Function `fetch-historical-prices` failure

The `LightweightChartWidget` calls `supabase.functions.invoke('fetch-historical-prices')` to get OHLC data. If this fails AND the client-side TwelveData fallback also fails, the chart shows a loading spinner indefinitely or an error state.

Possible sub-causes:
- **`TWELVE_DATA_API_KEY` not set as a Supabase secret** (the edge function reads `Deno.env.get('TWELVE_DATA_API_KEY')`)
- **TwelveData API rate limit exhausted** (Basic plan has 800 requests/day)
- **Edge function deployment stale** after recent shared code changes

### Secondary: Chart container height collapse

The `chartContainerRef` div uses `className="w-full flex-1 min-h-0 relative"` without an explicit height. The chart library creates a canvas with `height: 500px`, but if the flex container collapses (e.g., parent doesn't propagate height correctly), the chart may render at 0 height.

## Plan

### Step 1 — Redeploy `fetch-historical-prices`
Ensure the edge function is running the latest code after recent shared module changes.

### Step 2 — Add explicit minimum height to chart container
In `LightweightChartWidget.tsx`, change the `chartContainerRef` div to have a minimum height so the chart is always visible even if the flex chain breaks:

```tsx
// Line 747-749: Change from
<div ref={chartContainerRef} className="w-full flex-1 min-h-0 relative" />
// To
<div ref={chartContainerRef} className="w-full flex-1 min-h-[300px] relative" />
```

### Step 3 — Add dynamic height from container instead of hardcoded 500px
In the chart initialization (line 210), use the container's actual height instead of a fixed value:

```tsx
height: chartContainerRef.current.clientHeight || 500,
```

### Step 4 — Add a ResizeObserver for robust height sync
Replace the `window.addEventListener('resize')` with a `ResizeObserver` on the container, which handles layout changes more reliably (e.g., sidebar open/close, AURA panel).

### Step 5 — Verify `TWELVE_DATA_API_KEY` in Supabase secrets
Check that this secret exists in the Supabase project settings. If missing, the edge function silently falls back to an empty API key, causing TwelveData to return errors.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/LightweightChartWidget.tsx` | Add min-height, dynamic height init, ResizeObserver |
| Edge function `fetch-historical-prices` | Redeploy |

## Technical Details

The `LightweightChartWidget` rendering chain is:
```text
Layout (fillViewport → h-[calc(100dvh-3.5rem)])
  → TradingDashboard grid (flex-1 min-h-0)
    → CandlestickChart Card (flex-col flex-1)
      → CardContent (flex-1 min-h-0)
        → LightweightChartWidget (h-full flex-col)
          → chartContainerRef (flex-1 min-h-0) ← potential 0-height
```

The fix ensures the chart container always has a usable height regardless of flex chain behavior.

