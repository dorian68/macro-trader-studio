

# Patch UI TradingView Widget — Restore Rounded Corners, Remove Grid, Tighten Spacing

## Problem

Three visual regressions on the Dashboard TradingView chart widget:
1. **Rounded corners** -- the container has `rounded-lg` but needs `rounded-2xl` for consistency with the card design, and the inner iframe must be properly clipped
2. **Grid lines** -- overrides are present but TradingView may still show grid; need to reinforce with additional override keys
3. **Spacing** -- `pt-1` on `CardContent` still leaves a gap; reduce further to `pt-0` for a tighter look

## Changes

### 1. `src/components/TradingViewWidget.tsx`

**Line 358** -- Upgrade radius on root wrapper:
```
rounded-lg  -->  rounded-2xl
```

**Line 366** -- Upgrade radius on chart container:
```
rounded-lg  -->  rounded-2xl
```

**Lines 234-241** -- Add redundant grid overrides to cover all TradingView versions:
```typescript
overrides: {
  "paneProperties.vertGridProperties.color": "transparent",
  "paneProperties.horzGridProperties.color": "transparent",
  "paneProperties.vertGridProperties.style": 0,
  "paneProperties.horzGridProperties.style": 0,
  "paneProperties.backgroundType": "solid",
  "paneProperties.background": "#1a1a2e",
  "scalesProperties.showSymbolLabels": false,
  "mainSeriesProperties.priceLineVisible": false,
},
```

### 2. `src/components/CandlestickChart.tsx`

**Line 332** -- Remove top padding entirely:
```
className="px-2 sm:px-3 pb-2 sm:pb-3 pt-0 flex-1 min-h-0 overflow-hidden"
```

## Files Modified

1. `src/components/TradingViewWidget.tsx` -- border radius upgrade + extra grid overrides
2. `src/components/CandlestickChart.tsx` -- `pt-1` to `pt-0`

## No Regressions

- Only CSS class tweaks and TradingView override additions
- No logic, data flow, WebSocket, symbol mapping, or layout changes
- LightweightChartWidget, mobile layout, fullscreen dialog all unaffected

