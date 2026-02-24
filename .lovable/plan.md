

## Plan: Secure Twelve Data Integration in AURA (No Regression)

### Current State (Already Working)

The AURA pipeline for real-time data is fully wired:
- Edge function `aura/index.ts` defines `get_realtime_price` and `get_technical_indicators` as LLM tools
- The system prompt already injects `Current UTC time` dynamically via `new Date()`
- Client-side (`AURA.tsx`) handles tool calls by invoking `fetch-historical-prices` and `fetch-technical-indicators` edge functions
- Both edge functions call the Twelve Data API and cache results in Supabase

### Fix 1: Use Secret Instead of Hardcoded API Key

Both edge functions hardcode `const TWELVE_API_KEY = 'e40fcead02054731aef55d2dfe01cf47'`. The Supabase secret `TWELVE_DATA_API_KEY` already exists. Replace with `Deno.env.get('TWELVE_DATA_API_KEY')` and add a fallback for safety.

**Files:**
- `supabase/functions/fetch-historical-prices/index.ts` (line 10)
- `supabase/functions/fetch-technical-indicators/index.ts` (line 10)

### Fix 2: MACD and BBands Data Enrichment

The client-side indicator summary handler (`AURA.tsx` ~line 1434) only reads `latest[indicator]`, which for multi-value indicators (MACD, BBands) loses signal/histogram/bands data. Fix to extract all sub-fields.

**File:** `src/components/AURA.tsx` (lines ~1434-1441)

Before:
```
const value = latest[indicator];
indicatorSummary += `**${indicator.toUpperCase()}**: ${value}\n`;
```

After:
```
if (indicator === 'macd') {
  indicatorSummary += `**MACD**: ${latest.macd} | Signal: ${latest.macd_signal} | Histogram: ${latest.macd_hist}\n`;
} else if (indicator === 'bbands') {
  indicatorSummary += `**BBands**: Upper: ${latest.upper_band} | Middle: ${latest.middle_band} | Lower: ${latest.lower_band}\n`;
} else {
  indicatorSummary += `**${indicator.toUpperCase()}**: ${latest[indicator]}\n`;
}
```

### What Does NOT Change

- No changes to the AURA edge function (`aura/index.ts`) — system prompt and tool definitions remain identical
- No changes to routing, credit system, or feature registry
- No changes to `fetch-historical-prices` or `fetch-technical-indicators` logic (only the API key source)
- No changes to MarketChartWidget, plot_price_chart handling, or any UI components
- Date awareness is already correct (uses `new Date()` at runtime in the system prompt)

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/fetch-historical-prices/index.ts` | Replace hardcoded key with `Deno.env.get('TWELVE_DATA_API_KEY')` |
| `supabase/functions/fetch-technical-indicators/index.ts` | Replace hardcoded key with `Deno.env.get('TWELVE_DATA_API_KEY')` |
| `src/components/AURA.tsx` | Enrich MACD/BBands display in indicator summary |

