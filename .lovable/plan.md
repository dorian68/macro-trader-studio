

# Fix: TradingView Widget Not Rendering (DOM Conflict)

## Root Cause

In `TradingViewWidget.tsx`, the `chartContainerRef` div serves a dual purpose:
1. React renders overlay children (title badge, refresh button) inside it (lines 397-410)
2. `loadTradingViewFallback()` calls `chartContainerRef.current.innerHTML = ''` (line 177), destroying those React-managed elements, then injects a TradingView div via direct DOM manipulation

When `setLoading(false)` triggers a React re-render, React reconciles the `chartContainerRef` children -- recreating the overlays it thinks should be there -- and in doing so corrupts or displaces the TradingView-injected iframe. The result: a blank chart area.

## Fix

Separate the TradingView injection target from the React-managed overlays using two sibling elements inside a common parent:

```text
<div className="relative ...">           <-- wrapper (no ref)
  <div ref={chartContainerRef} />         <-- TradingView target (no React children)
  <div className="absolute overlay" />    <-- React-managed overlays
  <Button className="absolute" />         <-- React-managed refresh button
</div>
```

This way, `innerHTML = ''` only clears the dedicated chart div, and React's overlay elements live in a separate DOM subtree that is never destroyed.

## Changes in `src/components/TradingViewWidget.tsx`

### Render (lines 396-411)

Replace the current structure where overlays are children of `chartContainerRef`:

```tsx
{/* Wrapper div - NOT the ref target */}
<div className="relative w-full flex-1 min-h-0 overflow-hidden rounded-2xl">
  {/* TradingView injection target - no React children */}
  <div
    ref={chartContainerRef}
    className="absolute inset-0 [&_iframe]:!m-0 [&_iframe]:!p-0 [&_iframe]:!border-0 [&>div]:!m-0 [&>div]:!p-0"
  />
  {/* React-managed overlays - safe from innerHTML wipe */}
  <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-card/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium text-foreground/80">
    <span>{mapToTwelveDataSymbol(currentSymbol)}</span>
    <span className="text-muted-foreground">|</span>
    <span className="text-muted-foreground">{timeframe.toUpperCase()}</span>
  </div>
  <Button
    variant="secondary"
    size="icon"
    onClick={fetchData}
    className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full shadow-md opacity-70 hover:opacity-100 transition-opacity"
  >
    <RefreshCw className="h-3.5 w-3.5" />
  </Button>
</div>
```

The `chartContainerRef` becomes an `absolute inset-0` div with NO React children, so `innerHTML = ''` is safe and React never interferes with TradingView's DOM.

## No Other Files Modified

This is a single-file fix in `TradingViewWidget.tsx`. No backend, no Supabase, no other component changes.

## Why Previous Fixes Did Not Work

The previous fix (moving `loadTradingViewFallback()` to `finally`) was correct in ensuring the widget always initializes. But it exposed this DOM conflict bug -- previously, when Supabase data was found, `loadTradingViewFallback()` was never called, so the `innerHTML` wipe never happened and the overlays were preserved (but the chart was blank for a different reason). Now that `loadTradingViewFallback()` always runs, the DOM conflict occurs every time.

