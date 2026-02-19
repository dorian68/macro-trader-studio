
# Fix TradingView Light Mode + Dashboard Pip Precision

## Issues Identified

1. **Background too white**: The current code forces `paneProperties.background: "#ffffff"` and `scalesProperties.backgroundColor: "#ffffff"`, overriding TradingView's native light theme. Fix: remove these forced background overrides and let TradingView's built-in light theme render naturally (it uses a softer off-white with proper scale styling).

2. **Dashboard resets to LightweightChartWidget**: In `CandlestickChart.tsx`, line 147-149 resets `useFallback = false` every time the asset or timeframe changes. This means even when the admin has set the provider to `tradingview`, the chart switches back to LightweightChartWidget on every asset/timeframe change -- and LightweightChartWidget does NOT have the pip precision logic. Fix: only reset fallback when the admin provider is NOT `tradingview`.

## Changes

### File 1: `src/components/TradingViewWidget.tsx`

- **Remove forced background overrides**: Delete the `"paneProperties.background": "#ffffff"` and `"scalesProperties.backgroundColor": "#ffffff"` lines. TradingView's `theme: 'light'` will apply its own native light colors.
- **Remove forced loading screen white**: Change `loading_screen.backgroundColor` from `"#ffffff"` to `"transparent"` so it blends with the container.
- Keep all candle color overrides, pip precision logic, and `maximize_chart_area` untouched.

### File 2: `src/components/CandlestickChart.tsx`

- **Fix fallback reset bug** (line 146-149): Change the `useEffect` that resets `useFallback` to only run when `globalProvider !== 'tradingview'`. When admin has chosen TradingView, the widget should ALWAYS use TradingView, never reset to LightweightChartWidget on asset/timeframe change. This ensures the pip precision code (which lives in TradingViewWidget's `onChartReady`) is always active on the dashboard.

## What is NOT touched

- No changes to AURA, routing, symbol mapping, timeframe logic, or data sources
- No changes to candle colors, grid settings, or maximize behavior
- No changes to LightweightChartWidget
- No changes to admin settings panel or Supabase schema
- Pip precision code in TradingViewWidget stays as-is (it already works; the issue was the dashboard wasn't consistently rendering TradingViewWidget)
