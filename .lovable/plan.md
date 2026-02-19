

# AURA: Inline Price Chart Widget ("Plot last 12h of Gold")

## Overview

Enable AURA to render inline candlestick/line charts directly in chat when users ask to "plot", "chart", or "graph" price data. Uses the existing `fetch-historical-prices` edge function for data and the existing `MarketChartWidget` for rendering.

## What Changes

### 1. New Tool Definition in AURA Edge Function (`supabase/functions/aura/index.ts`)

Add a new tool `plot_price_chart` alongside the existing tools (line ~1058):

```
{
  name: "plot_price_chart",
  description: "Plot/chart/graph price data for an instrument over a time window. Use when user asks to visualize, plot, chart, or graph price movements.",
  parameters: {
    instrument: string (required),
    interval: "5min" | "15min" | "30min" | "1h" | "4h" | "1day",
    lookback_hours: number (how many hours of data to show)
  }
}
```

Update the system prompt (around line 648) to add intent detection rules:
- If user says: "plot", "chart", "graph", "show price", "draw", "visualize", "courbe", "graphe", "affiche", "tracer" combined with a time window ("last 12h", "past 24h", etc.) -- call `plot_price_chart`
- Instrument mapping: "gold" -> "XAU/USD", "btc" -> "BTC/USD", etc. (already handled by existing `detectInstruments`)
- Lookback heuristic: parse "last 12h" -> 12 hours, "last 7d" -> 168 hours, etc.
- Default interval heuristic: <=12h -> "15min", <=48h -> "30min", <=7d -> "1h", >7d -> "4h"

### 2. Handle `plot_price_chart` Tool Call in Client (`src/components/AURA.tsx`)

Add a new handler block in `handleToolLaunch` (after the `get_realtime_price` handler, ~line 1234):

```
if (functionName === 'plot_price_chart') {
  // 1. Show loading message
  // 2. Calculate startDate/endDate from lookback_hours
  // 3. Call fetch-historical-prices edge function (same as get_realtime_price handler)
  // 4. Transform response data to MarketChartWidget format:
  //    { time: d.datetime || d.date, open: d.open, high: d.high, low: d.low, close: d.close }
  // 5. Build summary text: "Here is [instrument] over the last [X hours] on [interval] candles."
  //    Include: current price, period high/low, % change
  // 6. Set message with attachments (chart) + text summary
  //    Attachments use the same format as extractMarketAttachments
}
```

The message will be rendered as:
- Text summary (e.g., "Here is XAU/USD last 12 hours on 15-minute candles. Current: 2687.45, High: 2695.20, Low: 2680.10, Change: +0.12%")
- `MarketChartWidget` candlestick chart (already styled, responsive, max-width respects chat container)
- Two action buttons below: "Open in Trading Dashboard" and timeframe chips (5m / 15m / 1h)

### 3. Action Buttons Under Chart

After the chart, render a small action bar:
- "Open in Trading Dashboard" button -- navigates to `/dashboard` with the instrument pre-selected
- 3 timeframe chips (5m, 15m, 1h) -- clicking re-runs the plot with the new interval by sending a new message to AURA

### 4. Edge Function Tool Routing Fix

In the edge function (line ~1108-1129), add `plot_price_chart` to the single-tool passthrough (it's not a batch tool like technical analysis):

```
// plot_price_chart is a single tool, pass it through
if (toolCalls[0].function.name === 'plot_price_chart') {
  return { toolCalls: [toolCalls[0]], message: "..." };
}
```

### 5. Fix Remaining French String

Line 1117: `"Preparation de l'analyse technique..."` -> `"Preparing technical analysis..."`
Line 1051: The `synthesisPrompt` is still in French -- translate to English.

## Files Modified

1. **`supabase/functions/aura/index.ts`** -- Add `plot_price_chart` tool definition, update system prompt with plot intent detection, fix French strings
2. **`src/components/AURA.tsx`** -- Add `plot_price_chart` handler in `handleToolLaunch`, render chart attachment + action buttons, fix French `synthesisPrompt`

## What Does NOT Change

- `MarketChartWidget` component (already works perfectly)
- `fetch-historical-prices` edge function (data source, no changes)
- Trade generator / Macro labs flows
- Message alignment, styling, scroll behavior
- Job system (plot_price_chart does NOT create a job -- it's a direct data fetch like `get_realtime_price`)
- `extractMarketAttachments` function (plot handler builds attachments directly)
- Credit system (no credit cost for plotting price data)

## Technical Details

### Data Flow

```text
User: "plot last 12h of gold"
  -> AURA edge function detects plot intent
  -> Returns toolCall: plot_price_chart({ instrument: "XAU/USD", interval: "15min", lookback_hours: 12 })
  -> Client handleToolLaunch:
     1. Calls fetch-historical-prices({ instrument: "XAU/USD", interval: "15min", startDate, endDate })
     2. Transforms response.data[] to OHLC format for MarketChartWidget
     3. Calculates summary stats (current price, high, low, % change)
     4. Sets message with text + chart attachment
```

### Interval Heuristic (in edge function tool description)

| Lookback     | Default Interval |
|-------------|-----------------|
| <= 6 hours  | 5min            |
| <= 12 hours | 15min           |
| <= 48 hours | 30min           |
| <= 7 days   | 1h              |
| > 7 days    | 4h              |

### Chart Message Structure

```typescript
// The message set in handleToolLaunch:
setMessages(prev => [...prev.slice(0, -1), {
  role: 'assistant',
  content: summaryText,  // "Here is XAU/USD last 12 hours..."
  attachments: [{
    type: 'market_chart',
    payload: {
      mode: 'candlestick',
      data: { ohlc: transformedData },
      instrument: 'XAU/USD',
      timeframe: '15min'
    }
  }]
}]);
```

The existing `renderMessageContent` already handles string content + `attachments` with `MarketChartWidget`. The chart will render inline, respecting the max-width constraint of the chat container (680px in normal mode, wider in fullscreen).

