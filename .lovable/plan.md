

# Fix: Dashboard chart visual regression — restore dark theme

## Problem

The screenshot shows the original look: dark background, green/red candles, clean institutional aesthetic. After the TwelveData expiration and fallback changes, the TradingView widget renders with a **white/light theme** because:

1. `TradingDashboard.tsx` never passes `darkTheme={true}` to `CandlestickChart`
2. `CandlestickChart` defaults `darkTheme` to `undefined` (falsy)
3. `TradingViewWidget` receives `darkTheme={false}` → renders light theme on a dark page

## Fix

### File: `src/components/CandlestickChart.tsx`

Force `darkTheme={true}` on the TradingView fallback widget regardless of the prop value. The app is always in dark mode, so TradingView must always use dark theme:

```tsx
<TradingViewWidget
  selectedSymbol={getSymbolForTradingView(asset)}
  timeframe={timeframe}
  displayOptions={displayOptions}
  darkTheme={true}           // ← always dark, matching the app theme
  onPriceUpdate={price => setCurrentPrice(price)}
  className="border-0 shadow-none"
/>
```

This is the only change needed. The TradingView widget already has all the correct dark overrides (transparent background, green/red candles, matching colors) — it just needs `darkTheme={true}` to activate them.

## Files to modify

| File | Change |
|------|--------|
| `src/components/CandlestickChart.tsx` | Set `darkTheme={true}` on TradingViewWidget (line 314) |

## Result

The TradingView fallback chart will render with the same dark aesthetic as the original TwelveData lightweight chart: dark background, green/red candles, no jarring white flash.

