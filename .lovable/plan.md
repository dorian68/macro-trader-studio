
# Maximize TradingView Pane + Reduce Bottom Margin

## Changes (2 files)

### 1. `src/components/TradingViewWidget.tsx`

**Add "maximize pane" default behavior** by enabling the `pane_context_menu` feature and calling `activeChart().maximizeChart()` on chart ready:

- In the widget constructor, add `enabled_features: ["maximize_chart_area"]` -- this TradingView feature flag removes unnecessary surrounding chrome and maximizes the chart drawing area within its container.
- In `onChartReady`, call `widget.activeChart().executeActionById("maximizeChart")` to auto-maximize the main pane on load.
- Both approaches are safe fallbacks for each other depending on TradingView widget version.

### 2. `src/components/CandlestickChart.tsx`

**Reduce bottom margin** below the instrument badge chips and chart area:

- Line 337: Change `CardContent` padding from `pb-2 sm:pb-3` to `pb-0 sm:pb-1` to tighten the bottom spacing.
- Line 428: Change the "Powered by" footer from `mt-3` to `mt-1` to reduce the gap below the chart.
- Line 314: Remove `pb-0` on the asset chips scrollbar row (already 0, no change needed -- confirmed).
- Line 187: Change `CardHeader` from `pb-2` to `pb-1` to reduce spacing between header content and chart.

## What is NOT Touched

- No routing, symbol mapping, data source, or timeframe logic changes
- No layout structure changes in TradingDashboard
- No changes to LightweightChartWidget
- No changes to mobile compact cards or fullscreen dialog
