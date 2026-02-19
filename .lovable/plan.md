

# Fix TradingView Widget Regressions + Add Chart Title

## Issues to Fix

### 1. Rounded borders missing
The chart container div (line 364) and the TradingView iframe inside it lack `rounded-lg` and `overflow-hidden` to clip the iframe corners. The outer wrapper (line 356) also needs `rounded-lg`.

### 2. Grid lines still visible
The TradingView overrides at lines 235-236 are already set to `transparent` -- this is correct. However the TradingView widget also has its own default grid that the `overrides` object may not fully control depending on the version. We need to add additional overrides for the background grid:
- `"paneProperties.backgroundType"`: `"solid"`
- `"paneProperties.background"`: `"transparent"`

### 3. Spacing between instrument chips and chart top
The `CardHeader` has `pb-2` (8px) and `CardContent` has `p-2 sm:p-3`. Combined that's 16-20px which is still generous. Reduce `CardContent` top padding to `pt-1` specifically while keeping sides/bottom at `p-2 sm:p-3`.

### 4. Add instrument + timeframe title overlay on the chart
Add an overlay label in the top-left of the TradingView chart container showing the instrument name (formatted, e.g. "EUR/USD") and timeframe (e.g. "1H"). This will be a small semi-transparent badge positioned absolutely.

## File Changes

### `src/components/TradingViewWidget.tsx`

**Line 356** -- Add `rounded-lg` to root div:
```
className={`w-full h-full flex flex-col overflow-hidden rounded-lg ${className}`}
```

**Line 364** -- Add `rounded-lg` to chart container:
```
className="relative w-full flex-1 min-h-0 overflow-hidden rounded-lg"
```

**Lines 234-239** -- Add extra grid overrides:
```typescript
overrides: {
  "paneProperties.vertGridProperties.color": "transparent",
  "paneProperties.horzGridProperties.color": "transparent",
  "paneProperties.backgroundType": "solid",
  "paneProperties.background": "#1a1a2e",
  "scalesProperties.showSymbolLabels": false,
  "mainSeriesProperties.priceLineVisible": false,
},
```

**Lines 364-373** -- Add title overlay before the refresh button:
```tsx
<div ref={chartContainerRef} className="relative w-full flex-1 min-h-0 overflow-hidden rounded-lg">
  {/* Chart title overlay */}
  <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-card/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium text-foreground/80">
    <span>{mapToTwelveDataSymbol(currentSymbol)}</span>
    <span className="text-muted-foreground">|</span>
    <span className="text-muted-foreground">{timeframe.toUpperCase()}</span>
  </div>
  <Button ...>
    <RefreshCw ... />
  </Button>
</div>
```

### `src/components/CandlestickChart.tsx`

**Line 332** -- Tighten top padding:
```
className="px-2 sm:px-3 pb-2 sm:pb-3 pt-1 flex-1 min-h-0 overflow-hidden"
```

## No Regressions
- Data fetching, WebSocket, price updates untouched
- LightweightChartWidget already has transparent grids and correct sizing
- Only CSS and a new overlay div added -- no logic changes
- Mobile layout, fullscreen dialog, AURA chart all unaffected

