
# Replace TradingView iframe with Lightweight Charts on Dashboard

## What changes
The `CandlestickChart.tsx` component currently renders a `TradingViewWidget` (iframe). We swap it to render `LightweightChartWidget` (canvas-based, lightweight-charts v5) which already exists and is fully functional with TwelveData data feed, WebSocket real-time updates, caching, and fallback logic.

## File: `src/components/CandlestickChart.tsx`

1. **Import change**: Replace `TradingViewWidget` import with `LightweightChartWidget`
2. **Render change** (line 277-284): Replace the `<TradingViewWidget>` block with:
   ```tsx
   <LightweightChartWidget
     selectedSymbol={asset}
     timeframe={timeframe}
     displayOptions={displayOptions}
     onPriceUpdate={price => setCurrentPrice(price)}
     className="border-0 shadow-none"
   />
   ```
3. Remove the `getSymbolForTradingView` import (no longer needed here) — keep `getSymbolForAsset` and `supportsRealTimeData`

## Visual identity alignment
The `LightweightChartWidget` already uses the correct site colors:
- Background: `#0f1117` (dark card)
- No grid lines (transparent)
- Green candles: `#22c55e`, Red candles: `#ef4444`
- Crosshair: `rgba(255,255,255,0.15)`
- Text: `rgba(255,255,255,0.6)`

No style changes needed — it already matches.

## No other files affected
- `TradingViewWidget` remains available for other pages (Macro Lab, etc.)
- `LightweightChartWidget` handles its own data fetching, WebSocket, and resize
