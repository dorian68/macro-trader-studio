

# Unify Macro Lab chart with Dashboard chart

## Current State
Both pages **already use the same `CandlestickChart` component**, which internally renders `LightweightChartWidget` (canvas-based, TwelveData feed, dark theme, no grid). The setup is identical.

The only issue: `ForecastMacroLab.tsx` still has an **unused `TradingViewWidget` import** (line 31) left over from the migration. This is dead code.

## Changes

### File: `src/pages/ForecastMacroLab.tsx`
- **Remove unused import** of `TradingViewWidget` (line 31) — it's not used anywhere in the file.

### Runtime error fix: `src/components/LightweightChartWidget.tsx`
The "Value is null" error comes from lightweight-charts receiving candle data with null/undefined OHLC values. The current filter (line 443-446) checks `!isNaN()` but `parseFloat(null)` → `NaN` should be caught. Adding an explicit null guard before `parseFloat` to be safe:
- In the data formatting block (~line 430-447), add explicit null/undefined checks on `item.open`, `item.high`, `item.low`, `item.close` before parsing.

## Summary
No visual or behavioral changes needed — the chart is already the same component. Just cleanup of a dead import and a defensive fix for the runtime error.

