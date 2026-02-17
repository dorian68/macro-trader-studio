

# Fix: TradingView Widget Crushed in Macro Lab

## Root Cause

The `min-h-[500px]` applied in the previous fix sets a minimum height on the `TabsContent`, but it does not provide a **definite height** for the widget's `h-full` to resolve against. The chain is:

```text
TabsContent (min-h-[500px], flex, flex-col)
  -> TradingViewWidget Card (h-full, flex, flex-col)
    -> CardContent (flex-1, min-h-0, flex, flex-col)
      -> chart div (flex-1, min-h-0)  --> resolves to 0px
```

`h-full` on the Card means "100% of parent height", but a `min-h` does not define the parent's height -- it only sets a floor. So `h-full` resolves to 0, and the entire flex chain collapses.

## Solution

Replace the flex-based height delegation with an **explicit minimum height directly on the TradingViewWidget wrapper**, ensuring the chart container has a concrete size to render into.

### File: `src/pages/ForecastMacroLab.tsx`

**Change 1 -- Line 1330**: Give the `TradingViewWidget` a concrete height by adding `h-[500px]` on the `TabsContent` instead of `min-h-[500px]`:

```
Before: <TabsContent value="chart" className="p-4 pt-2 min-h-[500px]">
After:  <TabsContent value="chart" className="p-4 pt-2 h-[500px]">
```

**Change 2 -- Line 1340**: Same for the technical tab:

```
Before: <TabsContent value="technical" className="p-4 pt-2 min-h-[500px]">
After:  <TabsContent value="technical" className="p-4 pt-2 h-[500px]">
```

Using `h-[500px]` provides a **definite height** that `h-full` on the Card can resolve against, making the entire flex chain (`flex-1`) work as intended. The `TabsContent` already has `data-[state=active]:flex data-[state=active]:flex-col` from the global tabs.tsx override, so the child will stretch properly.

## What does not change

- Dashboard layout: unaffected (uses viewport-locked heights)
- Trade Generator, Forecast Playground: no changes
- Mobile/tablet behavior: the 500px fixed height is appropriate for all breakpoints on this page since it scrolls naturally (unlike the dashboard)
- API logic, WebSocket, data fetching: zero impact

## Summary

| File | Change |
|------|--------|
| `src/pages/ForecastMacroLab.tsx` (line 1330) | `min-h-[500px]` replaced by `h-[500px]` on chart tab |
| `src/pages/ForecastMacroLab.tsx` (line 1340) | `min-h-[500px]` replaced by `h-[500px]` on technical tab |

