
## Plan: Fix Stale Data in AURA Price & Indicator Fetching

### Root Cause

Both edge functions (`fetch-historical-prices` and `fetch-technical-indicators`) have a **cache-first strategy with no TTL (time-to-live)**. They return cached data regardless of how old it is:

- **Prices**: If ANY cached rows exist for the date range, they're returned immediately -- even if `fetched_at` was weeks ago and the data is incomplete (e.g., only Monday's candles exist when Friday's should be available).
- **Indicators**: If cached count >= 80% of `outputsize`, they're returned -- even if `cached_at` was months ago.

This is why the user sees Feb 17 data on Feb 24: the cache had partial data from a previous fetch, and the functions never re-queried the API.

### Fix Strategy

Add a **cache freshness check** to both functions. If the most recent cached entry is stale (older than a threshold), bypass the cache and fetch fresh data from Twelve Data. The thresholds:

- **Intraday intervals** (1min, 5min, 15min, 30min, 1h, 2h, 4h): cache valid for **2 hours**
- **Daily interval**: cache valid for **24 hours**
- **Weekly/monthly**: cache valid for **7 days**

### Technical Changes

**File 1: `supabase/functions/fetch-historical-prices/index.ts`**

After the cache query (line 55), before returning cached data, add a freshness check:

```typescript
if (!cacheError && cachedData && cachedData.length > 0) {
  // Check cache freshness based on interval
  const maxAgeMs = ['1min','5min','15min','30min','1h','2h','4h'].includes(interval)
    ? 2 * 60 * 60 * 1000   // 2 hours for intraday
    : interval === '1day' ? 24 * 60 * 60 * 1000  // 24h for daily
    : 7 * 24 * 60 * 60 * 1000; // 7 days for weekly

  const newestFetchedAt = cachedData.reduce((latest, d) =>
    d.fetched_at && new Date(d.fetched_at) > latest ? new Date(d.fetched_at) : latest,
    new Date(0)
  );

  const isFresh = (Date.now() - newestFetchedAt.getTime()) < maxAgeMs;

  if (isFresh) {
    console.log(`Returning ${cachedData.length} fresh cached price points`);
    // ... return cached data ...
  } else {
    console.log(`Cache expired (age: ${Math.round((Date.now() - newestFetchedAt.getTime()) / 60000)}min), fetching fresh data`);
  }
}
```

**File 2: `supabase/functions/fetch-technical-indicators/index.ts`**

Same pattern: after the cache query (line 77), check `cached_at` freshness before returning:

```typescript
if (cachedData && cachedData.length >= outputsize * 0.8) {
  const maxAgeMs = ['1min','5min','15min','30min','1h','2h','4h'].includes(interval)
    ? 2 * 60 * 60 * 1000
    : interval === '1day' ? 24 * 60 * 60 * 1000
    : 7 * 24 * 60 * 60 * 1000;

  const newestCachedAt = cachedData.reduce((latest, d) =>
    d.cached_at && new Date(d.cached_at) > latest ? new Date(d.cached_at) : latest,
    new Date(0)
  );

  const isFresh = (Date.now() - newestCachedAt.getTime()) < maxAgeMs;

  if (isFresh) {
    // return cached
  } else {
    console.log(`Cache stale for ${indicatorLower}, refetching`);
    // fall through to API call
  }
}
```

### What Does NOT Change

- No changes to AURA.tsx (client-side logic remains identical)
- No changes to the AURA edge function (aura/index.ts)
- No database schema changes (both tables already have timestamp columns)
- No changes to instrument mappings
- Cache upsert logic stays the same (fresh data replaces old entries via ON CONFLICT)
- No routing, credit, or UI changes

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/fetch-historical-prices/index.ts` | Add TTL check before returning cached data |
| `supabase/functions/fetch-technical-indicators/index.ts` | Add TTL check before returning cached data |

### After Deployment

Both edge functions will be redeployed. The next AURA request for "show me gold 15min indicators" will bypass stale cache and fetch live data from Twelve Data, then re-cache the fresh results.
