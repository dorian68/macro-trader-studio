
# Fix: TradingView Widget Not Rendering on Dashboard

## Root Cause

The `TradingViewWidget` has a critical logic flaw in its data flow:

1. When the component mounts, `fetchData()` runs and queries Supabase `prices_tv` table
2. If data is found (success path), it sets `data` state but **never creates any visual chart** -- the `data` state is not used anywhere in the render
3. The TradingView embed (iframe) is only created inside `loadTradingViewFallback()`, which is only called in the `catch` block (when Supabase query fails)
4. Result: When Supabase returns data, the chart container remains empty -- nothing displays

The dashboard uses `forceMode='tradingview'` (session default), which routes to `TradingViewWidget`. Since the Supabase query likely succeeds, the TradingView widget never initializes.

## Fix

In `src/components/TradingViewWidget.tsx`, change `fetchData()` so that:
- When Supabase data is found successfully, it still calls `loadTradingViewFallback()` to create the TradingView embed (the actual chart rendering)
- The Supabase data fetch was originally meant to display via a custom renderer that was removed; the TradingView embed should always be loaded as the visual component

### Specific Change (lines 156-167)

Replace the success/catch logic:

```typescript
// Current broken logic:
if (result && result.length > 0) {
  setData(result);           // sets state but never used
  setHasFallback(false);     // no chart created
}

// Fixed logic:
// Always load TradingView widget as the visual chart
// Supabase data is supplementary (not rendered directly)
loadTradingViewFallback();
```

The simplest correct fix: after the try/catch in `fetchData`, always call `loadTradingViewFallback()`. The `data` state from Supabase is vestigial (never rendered) and can be kept for future use but should not block the chart render.

### Alternative cleaner approach

Remove the Supabase fetch entirely from `TradingViewWidget` since it serves no purpose (data is never displayed), and just call `loadTradingViewFallback()` directly on mount/symbol change. This is cleaner but a larger change.

## Recommended approach

Modify `fetchData()` in `TradingViewWidget.tsx` to always call `loadTradingViewFallback()` regardless of whether Supabase data was found:

```typescript
const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    // ... existing Supabase fetch (keep for potential future use)
  } catch (err) {
    console.error('Error fetching data:', err);
  } finally {
    setLoading(false);
    // Always render the TradingView widget
    loadTradingViewFallback();
  }
};
```

## Files Modified

1. `src/components/TradingViewWidget.tsx` -- Fix `fetchData()` to always call `loadTradingViewFallback()`

## No Regressions

- `LightweightChartWidget` path unaffected (only runs when provider is `twelvedata`)
- WebSocket price feed logic unchanged
- No backend or Supabase changes
- CandlestickChart wrapper unaffected
