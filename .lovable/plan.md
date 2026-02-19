

# AURA MCP Rendering Enforcement

## Problem

When a tool completes, the chat message shows a generic "Analysis completed for EUR/USD" followed by a mini-widget and collapsible JSON. There is no natural language explanation of what the data means -- no interpretation of metrics, no contextual narrative, no strategy bullets.

## Solution

Add a **natural language summary generator** that reads the parsed response data and produces a structured, human-readable explanation. This sits between the existing `parseResponse()` call and the message injection -- no changes to routing, API calls, or backend logic.

## Changes (single file: `src/components/AURA.tsx`)

### 1. Add `generateNaturalSummary()` helper function

A pure function that takes `featureType` and `parsedData` and returns a multi-paragraph markdown string:

**For Trade Generator:**
- Paragraph 1: Instrument, direction, confidence, timeframe
- Paragraph 2: Entry, SL, TP levels with context
- Paragraph 3: Risk/reward ratio interpretation
- Bullet points: strategy notes, risk factors if present

Example output:
```
**Trade Setup: EUR/USD -- Long**

AURA has identified a long opportunity on EUR/USD with 78% confidence on the 4h timeframe. The setup is based on a breakout strategy aligned with current macro conditions.

**Levels:**
- Entry: 1.0856
- Stop Loss: 1.0820 (-36 pips)
- Take Profit: 1.0940 (+84 pips)
- Risk/Reward: 2.33

**Strategy Notes:**
- Momentum divergence detected on RSI
- Price above 200 EMA on higher timeframe
```

**For Macro Lab:**
- Paragraph 1: Executive summary (first 2-3 sentences)
- Paragraph 2: Directional bias + confidence if available
- Bullet points: Key drivers, fundamental factors

**For Errors:**
- Clear explanation of what went wrong
- Actionable next steps

### 2. Update display order in `renderMessageContent`

Current order: summary -> metadata -> widget -> raw JSON

New order (matching the spec):
1. Natural language explanation (the new generated summary via `renderMarkdown`)
2. MarketChartWidget (already rendered via `chartAttachments` -- move it BEFORE the mini-widget)
3. Mini-widget (Trade Card / Macro Card) with stats
4. Action buttons (Open Full View -- already in mini-widgets)
5. Collapsible raw JSON (already present)

The key change is rendering `chartAttachments` between the summary and the mini-widget, rather than after everything.

### 3. Enhance `extractMarketAttachments` detection

Add deeper scanning for data structures commonly returned:
- Check for `time_series` key at any nesting level
- Check for arrays of objects with `date`/`close` fields (generic time series)
- Check for `backtest` objects containing `trades` arrays with entry/exit prices
- Check for `entry`/`sl`/`tp` fields alongside OHLC data to add markers

### 4. Update the completion handler (line 952)

Replace the generic `summaryText` with the output of `generateNaturalSummary()`:

```typescript
// Before
const summaryText = `Analysis completed for ${instrument}`;

// After  
const summaryText = generateNaturalSummary(featureType, widgetData, instrument);
```

## What does NOT change

- Tool routing, `FEATURE_REGISTRY`, `resolveFeatureId()` -- untouched
- API endpoints, `enhancedPostRequest`, `macro-lab-proxy` -- untouched
- Realtime subscription logic -- untouched
- Job badge system -- untouched
- Mini-widget components (`AuraMiniTradeSetup`, `AuraMiniMacro`, `AuraMiniReport`) -- untouched
- `MarketChartWidget` component -- untouched
- Raw JSON collapsible -- untouched
- localStorage persistence -- untouched
- Input bar, message layout, fullscreen mode -- untouched

## Technical Details

### `generateNaturalSummary(featureType, data, instrument)` logic

```text
function generateNaturalSummary(featureType, data, instrument):
  if featureType === 'trade_generator':
    extract: instrument, direction, confidence, entry, sl, tp, rr, timeframe, strategy notes
    build markdown with:
      - H3: "Trade Setup: {instrument} -- {direction}"
      - P1: confidence + timeframe context
      - P2: levels table
      - P3: risk/reward interpretation
      - bullets: strategy notes, risk factors
      
  if featureType === 'macro_lab':
    extract: executive_summary, directional_bias, confidence, key_drivers, fundamental_analysis
    build markdown with:
      - H3: "Macro Analysis: {instrument}"
      - P1-P2: executive summary
      - P3: bias + confidence
      - bullets: key drivers
      
  if featureType === 'reports':
    extract: title, executive_summary, sections
    build markdown with summary paragraphs
    
  fallback: generic "Analysis completed" message
```

### Rendering order change in `renderMessageContent`

```text
Current:
  renderContent() -> summary, metadata, mini-widget, raw JSON
  chartAttachments (AFTER renderContent)

New:
  renderContent() -> natural language summary (via renderMarkdown), metadata
  chartAttachments (MarketChartWidget) 
  mini-widget (Trade Card / Macro Card)
  raw JSON collapsible
```

This requires moving `chartAttachments` rendering inside `renderContent()` for rich messages, placing it after the summary but before the mini-widget.

