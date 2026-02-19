
# Streamline Dashboard Charts + Admin Display Settings

## Overview

Make both chart widgets (LightweightChartWidget and TradingView fallback) display in a clean, minimalist style on the dashboard -- matching the aesthetic applied to the AURA MarketChartWidget. Add a new "Chart Display Settings" section in the existing Admin > Chart Settings tab to let admins toggle visual elements on/off.

## What Changes

### 1. LightweightChartWidget -- Clean Design (src/components/LightweightChartWidget.tsx)

Apply the same minimalist treatment as the AURA chart:
- **Grid lines**: reduce opacity to near-invisible (`hsl(var(--border) / 0.03)` instead of `0.1`)
- **Right price scale**: hide border (`borderVisible: false`), keep scale visible for usability
- **Time scale**: hide border (`borderVisible: false`)
- **Crosshair**: reduce label visibility, use subtle styling
- **Remove test markers**: delete the hard-coded "Test Point 1/2/3" markers (lines ~403-428) -- they are debug artifacts
- **Candle colors**: keep current green/red scheme (already clean)

### 2. TradingView Fallback Widget -- Clean Design (src/components/TradingViewWidget.tsx)

Update the `new window.TradingView.widget({...})` configuration (line 218):
- `hide_top_toolbar: true` (already false, change to true)
- `hide_side_toolbar: true` (hide drawing tools)
- `hide_legend: true`
- `withdateranges: false` (remove date range buttons)
- `studies: []` (remove RSI and ADX overlays by default)
- `toolbar_bg: 'transparent'`
- Add `overrides` for grid lines visibility and price line visibility:
  ```
  overrides: {
    "paneProperties.vertGridProperties.color": "rgba(255,255,255,0.03)",
    "paneProperties.horzGridProperties.color": "rgba(255,255,255,0.03)",
    "scalesProperties.showSymbolLabels": false,
    "mainSeriesProperties.priceLineVisible": false,
  }
  ```

### 3. New Admin "Chart Display Settings" Component (src/components/admin/ChartDisplaySettings.tsx)

Create a new admin component with toggleable options stored in the existing `chart_provider_settings` table (add a JSONB column `display_options`). Settings include:

| Setting | Default | Description |
|---------|---------|-------------|
| Show grid lines | OFF | Vertical and horizontal grid |
| Show price scale | ON | Right-side price axis |
| Show time scale | ON | Bottom time axis |
| Show volume | OFF | Volume bars |
| Show studies (RSI/ADX) | OFF | Technical overlays |
| Show toolbar | OFF | TradingView top toolbar |

The component renders as a card with toggle switches, saving to `chart_provider_settings.display_options` as JSON.

### 4. Database Schema Update

Add a `display_options` JSONB column to `chart_provider_settings`:
```sql
ALTER TABLE chart_provider_settings
ADD COLUMN IF NOT EXISTS display_options jsonb DEFAULT '{
  "showGrid": false,
  "showPriceScale": true,
  "showTimeScale": true,
  "showVolume": false,
  "showStudies": false,
  "showToolbar": false
}'::jsonb;
```

### 5. Wire Settings to Charts

In `CandlestickChart.tsx`, fetch `display_options` alongside the existing `provider` query (line 131). Pass relevant options down to both `LightweightChartWidget` and `TradingViewWidget` as props.

- `LightweightChartWidget`: new prop `displayOptions` applied to chart config
- `TradingViewWidget`: new prop `displayOptions` applied to widget init config

### 6. Integrate in Admin Page (src/pages/Admin.tsx)

Add the new `ChartDisplaySettings` component inside the existing "chart-provider" tab content, right after `ChartProviderSettings`:

```
<TabsContent value="chart-provider">
  <ChartProviderSettings />
  <ChartDisplaySettings />    {/* NEW */}
  {/* existing Dashboard Chart Mode Toggle card */}
</TabsContent>
```

### 7. Clean Up Emojis in ChartProviderSettings

Remove emojis from the existing `ChartProviderSettings` badge text:
- `"TwelveData Active"` instead of `"✅ TwelveData Active"`
- `"TradingView Fallback"` instead of `"⚠️ TradingView Fallback"`

Also remove the emoji from Admin.tsx line 912 (`🔍` in the Realtime Diagnostic tab trigger).

## Files Modified

1. **`src/components/LightweightChartWidget.tsx`** -- Minimalist grid/scale/crosshair, remove test markers
2. **`src/components/TradingViewWidget.tsx`** -- Clean widget config, accept displayOptions prop
3. **`src/components/CandlestickChart.tsx`** -- Fetch and pass display_options to both chart widgets
4. **`src/components/admin/ChartDisplaySettings.tsx`** -- NEW: Admin toggle panel for chart display options
5. **`src/components/admin/ChartProviderSettings.tsx`** -- Remove emojis from badge text
6. **`src/pages/Admin.tsx`** -- Import and render ChartDisplaySettings, remove emoji from diagnostic tab
7. **SQL migration** -- Add `display_options` JSONB column to `chart_provider_settings`

## What Does NOT Change

- AURA MarketChartWidget (already clean)
- Chart data fetching logic (REST/WebSocket)
- Binance price feed
- Asset mapping
- Dashboard layout and one-screen philosophy
- Credit system
