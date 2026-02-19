

# Remove Grid Lines and Fix Dashboard Chart Spacing

## Problem
1. Grid lines still subtly visible in both chart widgets (opacity 0.03)
2. Triple-nested Card wrappers create excessive whitespace around the chart area
3. The chart doesn't fill its container properly -- too much padding between header and chart, and chart and container edges

## Changes

### 1. Remove Grid Lines Completely

**TradingViewWidget.tsx** (line 236-237): Change grid overrides from `rgba(255,255,255,0.03)` to `transparent`

**LightweightChartWidget.tsx** (lines 182-183): Change grid colors from `hsl(var(--border) / 0.03)` to `transparent`

### 2. Remove Redundant Card Wrappers in Chart Widgets

**TradingViewWidget.tsx**: The component wraps everything in a `Card > CardContent` -- but when embedded inside CandlestickChart, this creates double Card nesting. Remove the Card wrapper entirely, return just the chart container div directly. The `className` prop (`border-0 shadow-none`) already tries to hide this Card but padding remains.

Before:
```
Card > CardContent > div.chartContainer
```
After:
```
div.flex-col > div.chartContainer (no Card, no CardContent)
```

**LightweightChartWidget.tsx**: Same issue -- remove the Card/CardContent wrapper. Return the chart container directly.

### 3. Reduce Padding in CandlestickChart Container

**CandlestickChart.tsx** (line 332): Reduce the `CardContent` padding wrapping the chart area:
- From: `pb-4 sm:pb-6 pt-4 sm:pt-6`
- To: `p-2 sm:p-3` (minimal, uniform padding)

This is where the actual "too much white space" comes from -- 24px top + 24px bottom padding on desktop.

### 4. Remove Fixed `minHeight: 500px` on LightweightChart Container

**LightweightChartWidget.tsx** (line 706): The chart container has `style={{ minHeight: '500px' }}` which prevents it from flexing to fill the parent. Change to use flex-1 instead, and set chart height dynamically via ResizeObserver (already exists in the code).

### 5. Remove Inner Border on TradingView Container

**TradingViewWidget.tsx** (line 367): Remove `border border-border rounded-lg` from the chart container div -- it adds visual clutter inside the already-bordered parent Card.

## Files Modified

1. `src/components/TradingViewWidget.tsx` -- transparent grid, remove Card wrapper, remove inner border
2. `src/components/LightweightChartWidget.tsx` -- transparent grid, remove Card wrapper, flex-1 sizing
3. `src/components/CandlestickChart.tsx` -- reduce CardContent padding to p-2/p-3

## No Regressions

- Chart data fetching, WebSocket connections, and price updates are untouched
- Trade levels overlay, header controls, asset selector all remain unchanged
- AURA MarketChartWidget is not modified
- Mobile layout and fullscreen dialog unaffected (they use the same CandlestickChart with compact mode)

