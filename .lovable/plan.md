

## Plan: Fix Stale Data in AURA -- 3 Root Causes

### Problem Summary

AURA shows Feb 16 data instead of Feb 24. The edge functions ARE calling TwelveData API (TTL works), but the data is processed incorrectly at multiple levels.

### Root Cause 1: Price Data Ordering (CLIENT-SIDE)

TwelveData API returns candles in **descending** order (newest first). The client-side code in `AURA.tsx` assumes ascending order:

```
// Line 1267 - gets OLDEST candle, not latest
const latestPrice = priceData.data[priceData.data.length - 1];

// Line 1270 - gets 5 OLDEST candles, not most recent
priceData.data.slice(-5)
```

**Fix**: Sort `responseData` ascending in the edge function before returning, so the client's assumptions are correct everywhere (including `plot_price_chart`).

**File**: `supabase/functions/fetch-historical-prices/index.ts`

Sort `responseData` ascending by datetime before returning:
```typescript
const responseData = data.values.map((v: any) => ({
  datetime: v.datetime,
  date: v.datetime.split(' ')[0],
  ...
})).sort((a: any, b: any) => a.datetime.localeCompare(b.datetime));
```

### Root Cause 2: MACD/BBands Sub-fields Lost (EDGE FUNCTION)

The `fetch-technical-indicators` edge function only captures `v[indicatorLower]` (e.g., `v['macd']`). But TwelveData returns MACD with 3 fields (`macd`, `macd_signal`, `macd_hist`) and BBands with 3 fields (`upper_band`, `middle_band`, `lower_band`). These are silently dropped.

**Fix**: For multi-value indicators, capture ALL sub-fields in the response.

**File**: `supabase/functions/fetch-technical-indicators/index.ts` (line 156-161)

```typescript
// Before (only captures primary value):
results[indicatorLower] = {
  values: data.values.map((v: any) => ({
    datetime: v.datetime,
    [indicatorLower]: parseFloat(v[indicatorLower])
  })),
  ...
};

// After (captures all sub-fields):
results[indicatorLower] = {
  values: data.values.map((v: any) => {
    const point: any = { datetime: v.datetime };
    for (const key of Object.keys(v)) {
      if (key !== 'datetime') {
        point[key] = parseFloat(v[key]);
      }
    }
    return point;
  }),
  ...
};
```

### Root Cause 3: Intraday Cache Key Collision (EDGE FUNCTIONS)

For 15min candles, `date: v.datetime.split(' ')[0]` strips the time. Multiple candles from the same day collapse to the same unique key `(instrument, interval, date)`. The upsert batch has internal duplicates, causing the Postgres error: "ON CONFLICT DO UPDATE command cannot affect row a second time".

This means cache WRITES always fail for intraday data, so new data never gets cached.

**Fix**: For intraday intervals, skip the cache write entirely (the data is short-lived anyway -- 2h TTL). The API will be called on each request for intraday, which is the correct behavior for near-real-time data.

**Files**: Both `fetch-historical-prices/index.ts` and `fetch-technical-indicators/index.ts`

```typescript
// Only cache daily+ data (intraday has key collisions and short TTL anyway)
const isIntraday = ['1min','5min','15min','30min','1h','2h','4h'].includes(interval);
if (!isIntraday) {
  const { error: insertError } = await supabase
    .from('price_history_cache')
    .upsert(priceData, { onConflict: '...' });
  ...
}
```

### What Does NOT Change

- No changes to AURA.tsx client-side logic (the fixes are server-side)
- No changes to the AURA edge function (`aura/index.ts`)
- No database schema changes
- No changes to instrument mappings or routing
- No changes to credit system or UI components

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/fetch-historical-prices/index.ts` | Sort response ascending + skip intraday cache writes |
| `supabase/functions/fetch-technical-indicators/index.ts` | Capture all indicator sub-fields + skip intraday cache writes |

### After Deployment

- Price data will be correctly sorted (newest last) -- client shows Feb 24 data
- MACD will show signal line and histogram values instead of "undefined"
- BBands will show upper/middle/lower bands
- No more "ON CONFLICT" errors in logs for intraday requests

