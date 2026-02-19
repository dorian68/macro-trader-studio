

# Fix Chart Header Spacing and Remove Double Border

## Problem
Two visual issues on the dashboard chart:
1. A double border line appears between the header controls and the chart widget -- the Card's own border overlaps with the CardHeader's bottom border, creating two visible lines
2. The vertical spacing is unbalanced: the gap between the search bar and the asset chips is smaller than the gap between the asset chips and the top of the chart

## Changes

### 1. Remove the CardHeader bottom border (src/components/CandlestickChart.tsx)

**Line 182**: Remove `border-b border-border/50` from CardHeader. The Card's own border already provides visual separation -- having both creates the "double line" effect.

Change:
```
CardHeader className="pb-3 border-b border-border/50 space-y-2 overflow-hidden shrink-0"
```
To:
```
CardHeader className="pb-2 space-y-2 overflow-hidden shrink-0"
```

Also reduce `pb-3` to `pb-2` to tighten the bottom padding of the header, reducing the gap between asset chips and the chart widget.

### 2. Balance the spacing between rows

The `space-y-2` (8px) between search bar and chips is fine. The gap between chips and chart currently comes from `pb-3` (12px) + `p-2` (8px) on CardContent = 20px total. After the change it will be `pb-2` (8px) + `p-2` (8px) = 16px -- closer to the internal 8px gap, giving a balanced but slightly roomier transition into the chart area.

## Files Modified

1. **src/components/CandlestickChart.tsx** -- Remove `border-b border-border/50` from CardHeader, reduce `pb-3` to `pb-2`

## No Regressions

- Only CSS class changes on a single element
- Chart rendering, data fetching, asset selection, mobile layout all untouched
- The Card's outer border still provides the overall container outline

