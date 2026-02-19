

# AURA Backend Routing Fix: Use macro-lab-proxy Instead of Legacy n8n Webhook

## Problem

AURA currently sends ALL feature requests (trade_generator, macro_lab, reports) to the **old n8n webhook** (`dorian68.app.n8n.cloud/webhook/4572387f-...`), which is the same endpoint used by the **legacy MacroAnalysis page**.

Meanwhile, the **new pages** (Macro Lab and Trade Generator) both use the **macro-lab-proxy** Supabase Edge Function (`macro-lab-proxy` at the project's Supabase URL). This means AURA is calling a different backend than the pages it's supposed to represent.

Additionally, the `createJob()` and `enhancedPostRequest()` calls still pass `'macro_commentary'` as `jobType` for both trade_generator and macro_lab features -- a leftover from the old architecture.

## Fix Plan

### 1. Route AURA requests to macro-lab-proxy (src/components/AURA.tsx)

**Current** (line 1008): All features go to the old n8n webhook.

**Fix**: Route `trade_generator` and `macro_lab` requests through the macro-lab-proxy Edge Function (same URL used by ForecastTradeGenerator and ForecastMacroLab pages). Only `reports` keeps the n8n webhook (or its own endpoint if different).

The macro-lab-proxy URL is: `https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/macro-lab-proxy`

### 2. Fix createJob jobType parameter (src/components/AURA.tsx)

**Current** (line 863):
```
featureType === 'trade_generator' ? 'macro_commentary' : featureType === 'macro_lab' ? 'macro_commentary' : featureType
```
Both trade_generator and macro_lab are mapped to `'macro_commentary'` -- this is wrong.

**Fix**: Pass the actual featureType directly:
```
featureType  // 'trade_generator' | 'macro_lab' | 'reports'
```

### 3. Fix enhancedPostRequest jobType parameter (src/components/AURA.tsx)

**Current** (line 1012): Same `'macro_commentary'` mapping as above.

**Fix**: Pass `featureType` directly instead of the hardcoded `'macro_commentary'`.

### 4. Clean up collective-insights call in Edge Function (supabase/functions/aura/index.ts)

**Current** (line 313): Passes `type: 'macro_commentary'` to collective-insights.

**Fix**: This is a read-only data fetch for context enrichment -- it queries the collective-insights function which may still use this type internally. This should be left as-is unless the collective-insights function was also updated. No change needed here (it's reading historical data, not launching a feature).

### 5. Clean up system prompt references (supabase/functions/aura/index.ts)

- Line 824: "Check macro commentary from ABCG Research" -- change to "Check macro analysis from ABCG Research"
- Line 850: `launch_macro_lab` reference is already correct

## Files Modified

1. `src/components/AURA.tsx` -- Backend endpoint routing + jobType fixes
2. `supabase/functions/aura/index.ts` -- Minor prompt text cleanup

## What Does NOT Change

- Tool names in the Edge Function (already correctly named `launch_trade_generator`, `launch_macro_lab`)
- DB feature constraint values (`'AI Trade Setup'`, `'Macro Commentary'`, `'Report'`)
- Request payload structure (type, mode, instrument, question fields stay the same)
- Credit system, realtime subscriptions, UI/UX
- The macro-lab-proxy Edge Function itself (unchanged)
- Reports endpoint (stays on n8n webhook unless a dedicated proxy exists)

