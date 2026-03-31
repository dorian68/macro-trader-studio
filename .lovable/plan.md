

# Fix: Chart shows "failed to load" because TwelveData is expired and fallback is blocked

## Root Cause
Two issues combine:
1. **Your TwelveData API subscription has expired** — every API call returns a 401 error: *"Your subscription has expired, please pay last invoice"*
2. **The fallback to TradingView is permanently blocked** — the `forceMode="light"` logic we added always suppresses the fallback because `useFallback` never gets set to `true` (the first call suppresses it, but the second call also sees `useFallback === false` and suppresses again — infinite loop of suppression)

Result: no TwelveData data, no TradingView fallback, empty chart with error.

## Fix (1 file)

### `src/components/CandlestickChart.tsx`
Fix the `onFallback` logic: track fallback attempts with a counter ref instead of relying on the `useFallback` state. On the first failure with `forceMode="light"`, log a warning and retry. On the second failure, allow the fallback to TradingView so the user always gets a chart.

```
// Pseudocode for the fix:
const fallbackAttemptsRef = useRef(0);

onFallback={() => {
  fallbackAttemptsRef.current++;
  if (forceMode === 'light' && fallbackAttemptsRef.current <= 1) {
    console.warn('forceMode=light: retrying once before fallback');
    return; // suppress first attempt only
  }
  setUseFallback(true); // allow TradingView on 2nd failure
}}
```

Also reset `fallbackAttemptsRef.current = 0` in the existing `useEffect` that resets `useFallback` when asset/timeframe changes.

## Separate Issue: TwelveData Subscription
Your TwelveData API key (`e40fcead02054731aef55d2dfe01cf47`) is returning 401 expired errors. You need to renew your subscription at [twelvedata.com/account/billing](https://twelvedata.com/account/billing) to restore the lightweight chart. Until then, TradingView will be the automatic fallback — which is fine, it works without grids thanks to our previous fixes.

## Result
- Chart always renders (TwelveData when active, TradingView when not)
- No more "failed to load" dead state
- Grid-free, dark theme preserved on both engines

