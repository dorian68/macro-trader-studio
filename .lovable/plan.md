

# Fix: TradingView Widget Invisible Candles

## Root Cause

The TradingView widget (`src/components/TradingViewWidget.tsx`) passes bare symbols like `"EURUSD"` without an exchange prefix. TradingView's free widget (`tv.js`) auto-resolves the symbol, which can land on an unintended data feed where the `overrides` object is silently ignored or only partially applied. This causes the default dark-theme candle colors (which are near-black) to render against the `#0e1116` background, making candles invisible.

Additionally, the `mainSeriesProperties.priceLineVisible: false` and `mainSeriesProperties.priceLineColor: "transparent"` settings suppress the current price marker, removing another visual cue.

## Fix (1 file: `src/components/TradingViewWidget.tsx`)

### Change 1: Add exchange prefixes for proper symbol resolution

Map bare symbols to exchange-prefixed TradingView symbols so data resolves correctly and overrides are applied:

```typescript
const mapToTradingViewSymbol = (symbol: string): string => {
  const mapping: Record<string, string> = {
    'EURUSD': 'FX:EURUSD',
    'GBPUSD': 'FX:GBPUSD',
    'USDJPY': 'FX:USDJPY',
    'AUDUSD': 'FX:AUDUSD',
    'NZDUSD': 'FX:NZDUSD',
    'USDCAD': 'FX:USDCAD',
    'USDCHF': 'FX:USDCHF',
    'EURGBP': 'FX:EURGBP',
    'EURJPY': 'FX:EURJPY',
    'GBPJPY': 'FX:GBPJPY',
    // ... other FX pairs
    'BTCUSD': 'COINBASE:BTCUSD',
    'ETHUSD': 'COINBASE:ETHUSD',
    // ... other crypto
    'XAUUSD': 'OANDA:XAUUSD',
    'XAGUSD': 'OANDA:XAGUSD',
    // ... other commodities
  };
  return mapping[symbol] || symbol;
};
```

Use this in the widget constructor: `symbol: mapToTradingViewSymbol(currentSymbol)` instead of `symbol: currentSymbol`.

### Change 2: Reinforce candle color overrides with redundant property paths

TradingView has evolved its property schema across versions. Add backup property paths to ensure colors are applied regardless of which internal version the free widget uses:

```typescript
overrides: {
  // ... existing background/grid overrides (unchanged) ...
  
  // Candle colors - primary paths
  "mainSeriesProperties.candleStyle.upColor": "#22c55e",
  "mainSeriesProperties.candleStyle.downColor": "#ef4444",
  "mainSeriesProperties.candleStyle.wickUpColor": "#4ade80",      // slightly brighter wick
  "mainSeriesProperties.candleStyle.wickDownColor": "#f87171",    // slightly brighter wick
  "mainSeriesProperties.candleStyle.borderUpColor": "#16a34a",    // slightly darker border
  "mainSeriesProperties.candleStyle.borderDownColor": "#dc2626",  // slightly darker border
  "mainSeriesProperties.candleStyle.drawBorder": true,
  "mainSeriesProperties.candleStyle.drawWick": true,
  "mainSeriesProperties.candleStyle.barColorsOnPrevClose": false,
  
  // Line/area chart fallback colors (in case TradingView renders as line)
  "mainSeriesProperties.lineStyle.color": "#68b4bc",
  "mainSeriesProperties.lineStyle.linewidth": 2,
  "mainSeriesProperties.areaStyle.color1": "rgba(104,180,188,0.4)",
  "mainSeriesProperties.areaStyle.color2": "rgba(104,180,188,0.02)",
  "mainSeriesProperties.areaStyle.linecolor": "#68b4bc",
  "mainSeriesProperties.areaStyle.linewidth": 2,
  
  // Hollow candles fallback
  "mainSeriesProperties.hollowCandleStyle.upColor": "#22c55e",
  "mainSeriesProperties.hollowCandleStyle.downColor": "#ef4444",
  "mainSeriesProperties.hollowCandleStyle.drawBorder": true,
  "mainSeriesProperties.hollowCandleStyle.borderUpColor": "#22c55e",
  "mainSeriesProperties.hollowCandleStyle.borderDownColor": "#ef4444",
  "mainSeriesProperties.hollowCandleStyle.drawWick": true,
  "mainSeriesProperties.hollowCandleStyle.wickUpColor": "#4ade80",
  "mainSeriesProperties.hollowCandleStyle.wickDownColor": "#f87171",
  
  // Bar chart fallback
  "mainSeriesProperties.barStyle.upColor": "#22c55e",
  "mainSeriesProperties.barStyle.downColor": "#ef4444",
  
  // Restore price line visibility for user orientation
  "mainSeriesProperties.priceLineVisible": true,
  "mainSeriesProperties.priceLineColor": "#68b4bc",
  "mainSeriesProperties.priceLineWidth": 1,
}
```

### Change 3: Ensure `style: "1"` is enforced

The `style` property controls chart type (1 = Candles, 2 = Line, 3 = Area, etc.). Keep `style: "1"` and add `"mainSeriesProperties.style": 1` in overrides as reinforcement.

## Summary of What Changes

| Aspect | Before | After |
|--------|--------|-------|
| Symbol format | `"EURUSD"` (bare) | `"FX:EURUSD"` (exchange-prefixed) |
| Candle wick colors | Same as fill (#22c55e/#ef4444) | Brighter (#4ade80/#f87171) for extra contrast |
| Candle border colors | Same as fill | Darker (#16a34a/#dc2626) for depth |
| drawBorder/drawWick | Not set | Explicitly `true` |
| Line/area fallback | Not set | Brand blue (#68b4bc), opacity 1, width 2 |
| Price line | Hidden | Visible with brand blue |
| Hollow candle/bar colors | Not set | Green/red fallbacks |

## What is NOT Touched

- No changes to data fetching, symbol mapping for Supabase, or WebSocket logic
- No changes to LightweightChartWidget (dashboard primary chart)
- No changes to chart container structure, rounded corners, or DOM isolation
- No changes to grid settings (still hidden when showGrid is false)
- No changes to timeframe logic, resize handling, or React memo
- No changes to any other component or page

