

# Fix: Dashboard chart stuck when TwelveData API is expired

## Root Cause

Two issues compounding:

1. **TwelveData subscription expired** — The API key `e40fcead02054731aef55d2dfe01cf47` returns HTTP 401: "Your subscription has expired". This affects both the Edge Function and the client-side direct API call.

2. **`forceMode="light"` blocks TradingView fallback** — In `CandlestickChart.tsx` (line 153-157), when `forceMode="light"`, `effectiveUseFallback` is hardcoded to `false`. This means even when `onFallback()` fires after TwelveData fails, the chart never switches to TradingView. The user sees "Failed to load chart data" permanently.

## Fix

### Change 1 — Allow fallback even in `forceMode="light"` (`CandlestickChart.tsx`)

Update the logic so `forceMode="light"` **prefers** TwelveData but still allows TradingView fallback when data loading fails:

```tsx
// Current (broken):
const effectiveUseFallback = forceMode === 'tradingview'
  ? true
  : forceMode === 'light'
    ? false        // ← blocks fallback forever
    : useFallback;

// Fixed:
const effectiveUseFallback = forceMode === 'tradingview'
  ? true
  : useFallback;  // allows fallback regardless of forceMode
```

### Change 2 — Update `TWELVE_DATA_API_KEY` in `.env` and Supabase secret

The user needs to either:
- Renew the TwelveData subscription and get a new/reactivated API key
- Or accept that charts will fall back to TradingView until renewed

If a new key is obtained, update both:
- `.env` → `VITE_TWELVE_DATA_API_KEY`
- Supabase secret → `TWELVE_DATA_API_KEY`

## Files to modify

| File | Change |
|------|--------|
| `src/components/CandlestickChart.tsx` | Remove `forceMode === 'light' ? false` branch so fallback can trigger |

## Immediate effect

After Fix 1, when TwelveData fails (expired key), the chart will automatically fall back to the free TradingView widget instead of showing an error. Once the TwelveData subscription is renewed, charts will use TwelveData again without any code changes.

