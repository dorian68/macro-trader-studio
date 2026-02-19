

# Switch TradingView to Light Mode + Full Pip Precision + Global Admin Settings

## Changes

### 1. `src/components/TradingViewWidget.tsx` -- Light theme + pip precision + self-fetch admin settings

**Theme switch**: Change `theme: 'dark'` to `theme: 'light'` and update all background overrides from `#0e1116` to `#ffffff`, text/scale colors to dark tones, loading screen to white.

**Full pip precision**: Add `scalesProperties.precision` via `onChartReady` using `widget.activeChart().getMainSeries()` and dynamically setting `minMove` based on symbol type:
- Forex pairs: 5 decimal places (e.g., 1.08567) -- `minMove: 0.00001`
- JPY pairs: 3 decimal places (e.g., 154.234) -- `minMove: 0.001`
- Crypto: 2 decimal places -- `minMove: 0.01`
- Gold/Silver: 2 decimal places -- `minMove: 0.01`

**Self-fetch admin settings**: Instead of relying on each parent to pass `displayOptions`, the widget itself will fetch from `chart_provider_settings` on mount if no `displayOptions` prop is provided. This ensures every TradingView widget across all pages automatically uses the admin-configured settings without modifying every parent component.

**Color adjustments for light mode**:
- Grid lines (when enabled): `rgba(0,0,0,0.06)` instead of white-based
- Candle colors remain the same (green/red have good contrast on white)
- Price line: keep `#68b4bc` (good on white)
- Scale text: dark (`#333`)
- Loading screen: `#ffffff`

### 2. `src/components/CandlestickChart.tsx` -- Light mode overlay badge adjustments

The overlay badge at top-left (`bg-card/80`) will need slight contrast adjustment since the chart background is now white. Change to a subtle dark overlay style so it remains readable on both the white chart and the dark app frame.

### 3. Pages NOT modified

- AURA (`src/components/AURA.tsx`) -- uses `MarketChartWidget` (lightweight-charts), completely separate, untouched
- No changes to `MacroAnalysis.tsx`, `AISetup.tsx`, `ForecastMacroLab.tsx`, `MacroCommentaryBubble.tsx`, `MacroCommentary.tsx` -- they don't need modification because the widget will self-fetch admin settings

## Technical Details

### TradingViewWidget self-fetch logic (new `useEffect`):

```text
useEffect(() => {
  // Only fetch if no displayOptions were explicitly provided by parent
  if (displayOptions !== DEFAULT_DISPLAY_OPTIONS) return;
  
  supabase.from('chart_provider_settings')
    .select('display_options')
    .single()
    .then(({ data }) => {
      if (data?.display_options) {
        setFetchedOptions({ ...DEFAULT_DISPLAY_OPTIONS, ...data.display_options });
      }
    });
}, []);
```

A new internal state `fetchedOptions` will hold the admin settings. The widget uses `effectiveOptions = props.displayOptions !== DEFAULT_DISPLAY_OPTIONS ? props.displayOptions : fetchedOptions` to determine which settings to apply.

### Pip precision via onChartReady:

```text
onChartReady: () => {
  try {
    widget.activeChart().executeActionById("maximizeChart");
  } catch (e) {}
  
  // Set price scale precision based on symbol
  try {
    const chart = widget.activeChart();
    const priceScale = chart.getPanes()[0].getRightPriceScales()[0];
    priceScale.setMode(0); // Normal mode (not percentage/log)
    
    // TradingView handles pip precision via the data feed;
    // we ensure the price scale shows maximum available decimals
    chart.applyOverrides({
      "scalesProperties.showSeriesLastValue": true,
      "scalesProperties.showStudyLastValue": true,
    });
  } catch (e) {
    console.log('Price scale config not available');
  }
}
```

The TradingView widget automatically determines decimal precision from the exchange feed (FX:EURUSD = 5 decimals, COINBASE:BTCUSD = 2 decimals). The exchange-prefixed symbols we added previously already ensure correct pip resolution. The key addition is making sure the price scale is in Normal mode (not percentage) so all pips are displayed.

### Light mode overrides summary:

| Property | Dark (before) | Light (after) |
|----------|--------------|---------------|
| `theme` | `"dark"` | `"light"` |
| `paneProperties.background` | `#0e1116` | `#ffffff` |
| `scalesProperties.backgroundColor` | `#0e1116` | `#ffffff` |
| `loading_screen.backgroundColor` | `#0e1116` | `#ffffff` |
| `loading_screen.foregroundColor` | `#0e1116` | `#68b4bc` |
| Grid color (when on) | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.06)` |
| `scalesProperties.lineColor` | `transparent` | `transparent` |

### What is NOT touched

- AURA (uses MarketChartWidget, not TradingView)
- LightweightChartWidget
- Routing, data sources, symbol mapping, timeframe logic
- Database schema
- Edge functions

