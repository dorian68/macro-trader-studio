
# Full Trade Generator Rendering in AURA + Suppress Duplicate Notifications

## What Changes

### 1. Enhanced `parseTradeResponse` — Extract `decision_summary` (auraFeatureRegistry.ts)

Currently `parseTradeResponse` only extracts `final_answer` (instrument, setups, direction). The `decision_summary` (alignment, verdict, confidence_label, trade_card with entryPrice/stopLoss/takeProfits/riskRewardRatio, narrative, key_risks, next_step) is available in the same payload but ignored.

**Fix:** After extracting `final_answer`, also extract `decision_summary` using the same 3-path logic used by `ForecastTradeGenerator.tsx`, and merge it into the returned `data`:
```
data: { ...finalAnswer, decision_summary: extractedDS }
```

### 2. Replace `AuraMiniTradeSetup` with `AuraFullTradeSetup` (AURA.tsx)

Currently shows only: instrument badge, direction badge, 3-column Entry/SL/TP grid, R:R line, and "Open Full View" button.

**New `AuraFullTradeSetup`** will render all available fields in a structured layout:

```text
+-------------------------------------------+
| [Instrument] [Direction Badge] [Timeframe] |
| Alignment: aligned | Verdict: go | Conf: high |
+-------------------------------------------+
| Trade Levels (always visible)              |
| Entry: 1.08500 | SL: 1.08200 | TP: 1.08900 | R:R: 2.33 |
+-------------------------------------------+
| > Strategy Notes (collapsible)             |
|   - Note 1                                 |
|   - Note 2                                 |
+-------------------------------------------+
| > Narrative (collapsible)                  |
|   Full narrative text from decision_summary|
+-------------------------------------------+
| > Key Risks (collapsible)                  |
|   1. Risk item 1                           |
|   2. Risk item 2                           |
+-------------------------------------------+
| > Next Step (collapsible)                  |
|   Actionable recommendation               |
+-------------------------------------------+
| [Open Full View] button                    |
+-------------------------------------------+
```

Uses `Collapsible` from Radix, same pattern as `AuraFullMacro`.

### 3. Tag AURA Jobs + Suppress PersistentToast for AURA-Originated Jobs

**Problem:** When AURA creates a job, the `PersistentNotificationProvider` also picks it up via its own Realtime subscription on the `jobs` table. This causes duplicate cards/toasts at bottom-right, cluttering the AURA experience.

**Fix in AURA.tsx:** Add `source: 'aura'` to the `request_payload` when creating the job:
```typescript
const jobId = await createJob(
  featureType, instrument,
  { type: featureType, source: 'aura' },  // <-- add source
  dbFeature
);
```

**Fix in PersistentNotificationProvider.tsx:** Skip jobs where `request_payload.source === 'aura'` in both INSERT and UPDATE handlers:
```typescript
if (newJob.request_payload?.source === 'aura') {
  console.log('[PersistentNotifications] Skipping AURA-originated job');
  return;
}
```

### 4. Remove Inline `toast()` Calls from AURA Job Handlers

Remove these toast calls from AURA.tsx since results now render in-chat:
- Line 1468: `toast({ title: 'Request Launched', ... })`
- Line 1339-1347: `toast({ title: analysisCompletedTitle, ... })`
- Line 1476: `toast({ title: 'Error', ... })` (keep this one for errors as fallback)

### 5. Remaining French Strings Cleanup

Fix the remaining French strings spotted in the technical indicators handler (lines 1098-1185):
- "Prix actuel" -> "Current price"
- "Prix recents" -> "Recent prices"
- "Ouverture/Cloture" -> "Open/Close"
- "Indicateurs Techniques pour" -> "Technical Indicators for"
- Error messages in French -> English

## Files Modified

1. **`src/lib/auraFeatureRegistry.ts`** — Add `decision_summary` extraction in `parseTradeResponse`
2. **`src/components/AURA.tsx`** — Replace `AuraMiniTradeSetup` with `AuraFullTradeSetup`, remove toast calls, tag jobs with `source: 'aura'`, fix French strings
3. **`src/components/PersistentNotificationProvider.tsx`** — Skip AURA-originated jobs in INSERT/UPDATE handlers

## What Does NOT Change

- Backend endpoints, edge functions, Supabase schema
- DecisionSummaryCard.tsx component (stays for the standalone page)
- AuraFullMacro rendering (already done)
- ForecastTradeGenerator.tsx page
- MarketChartWidget
- Job creation logic in useRealtimeJobManager
- Credit engagement
- jobCompletedRef race condition fix
- Realtime subscription logic
