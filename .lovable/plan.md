

# Plan: Make Admin Chart Display Settings Apply Globally to All Users

## Problem

The admin panel has a "Chart Display Settings" section that saves options (showGrid, showPriceScale, showTimeScale, showVolume, showStudies, showToolbar) to the `chart_provider_settings.display_options` column in Supabase. However, **neither chart widget actually reads these settings**. Both `TradingViewWidget` and `LightweightChartWidget` have hardcoded values (grid transparent, no volume, etc.). The settings are saved but never consumed.

## Solution

Fetch `display_options` from Supabase at the chart orchestrator level (`CandlestickChart`), pass them as props to both chart widgets, and apply them dynamically instead of using hardcoded values.

## Changes (3 files, front-end only)

### 1. `src/components/CandlestickChart.tsx`

- Fetch `display_options` alongside the existing `provider` query from `chart_provider_settings`
- Parse the options with defaults and store in state as a `DisplayOptions` object
- Pass this object as a new `displayOptions` prop to both `<TradingViewWidget>` and `<LightweightChartWidget>`

### 2. `src/components/TradingViewWidget.tsx`

- Add `displayOptions` to the props interface
- In the TradingView widget initialization config, conditionally apply:
  - `showGrid`: toggle grid line colors between `transparent` and a subtle gray
  - `showPriceScale`: toggle `hide_side_toolbar` / scale visibility
  - `showTimeScale`: toggle bottom timeline visibility
  - `showVolume`: add/remove `Volume` from the `studies` array
  - `showStudies`: add/remove RSI/ADX from `studies` array
  - `showToolbar`: toggle `hide_top_toolbar`
- Add `displayOptions` to the dependency array of the chart initialization effect so the widget re-creates when settings change

### 3. `src/components/LightweightChartWidget.tsx`

- Add `displayOptions` to the props interface
- In the `createChart()` config, conditionally apply:
  - `showGrid`: set grid line colors to subtle gray or transparent
  - `showPriceScale`: toggle `rightPriceScale.visible`
  - `showTimeScale`: toggle `timeScale.visible`
  - `showVolume`: after series creation, conditionally add a volume histogram series
- Apply the options at chart creation time and via `chart.applyOptions()` when they change

## Data Flow

```text
Supabase (chart_provider_settings.display_options)
  --> CandlestickChart fetches on mount
  --> passes displayOptions prop to TradingViewWidget / LightweightChartWidget
  --> widgets apply settings dynamically
```

Since the data lives in Supabase (not localStorage), it persists across all sessions and browsers. Since there is only one row in `chart_provider_settings` and any authenticated user can read it (RLS policy: `true` for SELECT), the admin's settings automatically apply to every user on every instance.

## What is NOT touched

- No database schema changes needed (the `display_options` JSONB column already exists)
- No edge functions modified
- No admin panel changes (it already saves correctly)
- No RLS policy changes needed
- No backend or API changes

## Type Safety

A shared `DisplayOptions` interface will be defined and reused across the three files to ensure consistency:

```typescript
interface DisplayOptions {
  showGrid: boolean;
  showPriceScale: boolean;
  showTimeScale: boolean;
  showVolume: boolean;
  showStudies: boolean;
  showToolbar: boolean;
}
```

Default values match what is currently hardcoded (grid off, price scale on, time scale on, volume off, studies off, toolbar off), ensuring zero visual change until an admin modifies the settings.

