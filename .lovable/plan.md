

# AURA Chart Integration + Fullscreen Premium UI Upgrade

## Overview

This upgrade adds three capabilities to AURA without breaking any existing feature:

1. A new `MarketChartWidget` component for inline chart rendering in AURA messages
2. A data parser (`extractMarketAttachments`) that detects chartable data in responses
3. A premium fullscreen UI redesign with rounded pill inputs, softer bubbles, and smooth animations

---

## New File: `src/components/aura/MarketChartWidget.tsx`

A self-contained, memoized chart component using `lightweight-charts` (already installed). Supports 3 modes:

- **Candlestick (OHLC)**: When `ohlc` data array is provided (from `twelve_data_time_series` or similar)
- **Area (Equity/PnL curve)**: When `equity_curve` or `time_series` array is provided
- **Line (Forecast)**: When `predictions` data with `{ds, yhat}` is provided

Features:
- Dark-themed card with rounded corners matching AURA's style
- Header showing instrument + timeframe if available
- Stats footer row (Net Profit, Win Rate, Max Drawdown) when data exists
- Skeleton loader during chart initialization
- Single chart instance per widget (no re-renders), using `React.memo` + `useRef`
- Graceful fallback: renders nothing if data is insufficient
- Responsive: adapts width to container, taller in fullscreen mode

```text
Props:
  - data: { ohlc?, equity_curve?, predictions?, markers?, stats? }
  - instrument?: string
  - timeframe?: string
  - className?: string
  - fullscreen?: boolean (taller chart height)
```

---

## New Utility: `extractMarketAttachments` (inside AURA.tsx)

A pure function that inspects a parsed response payload and returns chart-ready attachments:

```text
Input: any (parsed job response_payload)
Output: { type: 'market_chart', payload: { mode, data, instrument?, timeframe?, stats? } } | null
```

Detection logic:
1. If payload contains `market_data` or `twelve_data_time_series` with OHLC arrays -> candlestick mode
2. If payload contains `predictions` with horizon keys containing `{ds, yhat}` arrays -> forecast line mode
3. If payload contains `equity_curve` or `backtest_results` with PnL data -> area mode
4. If payload contains `trade_setup` with entry/SL/TP -> extract price markers (for overlay on candlestick)
5. If none detected -> return null (no chart rendered, no crash)

All extraction wrapped in try/catch, so malformed data never crashes the UI.

---

## Message Attachment System

Update the `Message` interface to support optional attachments:

```text
interface Message {
  role: 'user' | 'assistant';
  content: string | { type: string; data: any; summary: string };
  attachments?: Array<{ type: 'market_chart'; payload: any }>;
}
```

When a job completes (line 790-834 in current code), after building `richContent`, also run `extractMarketAttachments(parsedPayload)` and attach result to the message if non-null.

In `renderMessageContent`, after rendering the existing content (text/mini-widget), check for `msg.attachments` and render `MarketChartWidget` for each `market_chart` attachment below the message bubble.

---

## Fullscreen Premium UI Redesign

### Container Changes
- Fullscreen background: `bg-[#0f1117]` (deep anthracite) instead of plain `bg-background`
- Content area constrained to `max-w-5xl mx-auto` with generous `px-8` padding
- Smooth entry animation: `animate-in fade-in slide-in-from-bottom-4 duration-300`

### Header
- Slightly larger logo (12x12)
- Subtle border-b with gradient underline
- Title uses larger text in fullscreen (`text-xl`)

### Message Bubbles
- Assistant bubbles: `bg-[#1a1d27] rounded-2xl` (softer than `bg-muted`)
- User bubbles: `bg-gradient-to-r from-primary to-primary/80 rounded-2xl`
- Both with `px-5 py-3` for more breathing room
- Smooth appear animation (`animate-in fade-in-50 duration-200`)

### Input Area
- Pill-shaped container: `rounded-full bg-[#1a1d27] border-0 shadow-lg`
- Search icon on the left inside the input
- Send button: circular (`rounded-full`) with gradient background
- Larger height in fullscreen (`h-14`)

### Chart Widget in Fullscreen
- Taller chart: 400px height vs 250px in panel mode
- Full-width within the `max-w-5xl` container

---

## Performance Considerations

- `MarketChartWidget` uses `React.memo` to prevent re-renders
- Chart instance created once via `useRef`, data set via `.setData()` on the series
- No chart created if data array is empty (guard at top of effect)
- `extractMarketAttachments` is a pure function called once per job completion, not on every render
- Existing lightweight-charts dependency reused (no new install needed)

---

## What Does NOT Change

- No API endpoints modified
- No edge function changes
- No JSON schemas changed
- Existing mini-widgets (AuraMiniTradeSetup, AuraMiniMacro, AuraMiniReport) preserved
- Markdown rendering preserved
- Contextual memory, command chaining, tool schemas all untouched
- Job badge system unchanged
- Quick actions, teaser, collective panel unchanged
- Non-fullscreen panel mode keeps current styling (changes only apply inside fullscreen)

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/aura/MarketChartWidget.tsx` | **NEW** -- Chart widget component |
| `src/components/AURA.tsx` | Add `extractMarketAttachments`, update `Message` interface with `attachments`, update `renderMessageContent` to render charts, premium fullscreen CSS classes |

## Implementation Order

1. Create `MarketChartWidget.tsx` with 3 chart modes + skeleton + stats footer
2. Add `extractMarketAttachments` utility in AURA.tsx
3. Wire attachments into job completion handler
4. Update `renderMessageContent` to render chart attachments
5. Apply premium fullscreen CSS (bubbles, input pill, background, animations)

