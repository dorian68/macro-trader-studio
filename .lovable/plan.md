

# Fix: Remove side panel and grid from TradingView chart

## Problem

The TradingView widget currently shows a **left drawing tools sidebar** and potentially **grid lines**, which weren't present in the original design (screenshot reference). The chart should be clean, centered, with no side panel.

**Root cause** in `TradingViewWidget.tsx`:
- Line 136: `hide_side_toolbar: !displayOptions.showPriceScale` — `showPriceScale` defaults to `true`, so `hide_side_toolbar` is `false` → the left drawing tools panel is **visible**. This is a naming confusion: `showPriceScale` (right axis) was incorrectly mapped to `hide_side_toolbar` (left drawing tools).
- Line 148: `disabled_features` conditionally includes `"left_toolbar"` based on `showPriceScale` — same wrong mapping.

## Fix (single file: `src/components/TradingViewWidget.tsx`)

1. **Always hide the left drawing tools sidebar**: `hide_side_toolbar: true` — this panel should never show in the embedded widget.
2. **Always disable `left_toolbar`** in `disabled_features` — remove the conditional tied to `showPriceScale`.
3. **Ensure grid is fully suppressed** — the overrides look correct (`showGrid: false` → `gridColor: 'transparent'`), but add `"go_to_date"` and `"display_market_status"` to disabled features for a cleaner look matching the screenshot.

### Exact change in the widget config (lines 134-151):

```typescript
hide_top_toolbar: !displayOptions.showToolbar,
hide_side_toolbar: true,  // Always hide left drawing tools panel
hide_legend: true,
allow_symbol_change: false,
withdateranges: false,
studies,
toolbar_bg: 'transparent',
container_id: CONTAINER_ID,
enabled_features: ["maximize_chart_area"],
disabled_features: [
  ...(displayOptions.showToolbar ? [] : ["header_widget"]),
  "left_toolbar",           // Always disable drawing tools
  "timeline_marks",
  "control_bar",
  ...(displayOptions.showTimeScale ? [] : ["timeframes_toolbar"]),
  "volume_force_overlay",
  "go_to_date",
  "display_market_status",
],
```

This is the only change needed. The chart will render full-width without the side panel, no grid, centered — matching the screenshot.

