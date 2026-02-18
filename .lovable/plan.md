

# AURA Feature Routing Update: ai-setup/macro-commentary to trade-generator/macro-labs

## Summary

Update AURA's routing so that all trade setup and macro commentary commands route to `/trade-generator` and `/macro-lab` respectively, instead of the legacy `/ai-setup` and `/macro-analysis` pages. All changes are additive -- old aliases continue to work internally.

---

## Changes in `src/components/AURA.tsx`

### 1. Mini-Widget "Open Full View" buttons (2 locations)

**AuraMiniTradeSetup** (around line 364):
- Change `navigate('/ai-setup')` to `navigate('/trade-generator')`

**AuraMiniMacro** (around line 386):
- Change `navigate('/macro-analysis')` to `navigate('/macro-lab')`

### 2. Job badge click routes (around line 1201-1204)

Update the routes map:
```
const routes = {
  ai_trade_setup: '/trade-generator',
  macro_commentary: '/macro-lab',
  reports: '/reports'
};
```

### 3. Toast descriptions (around line 911-912)

Update the display names in the toast message:
- `'trade setup'` becomes `'Trade Generator'`
- `'macro analysis'` becomes `'Macro Labs'`

### 4. Session memory feature label (around line 740-765)

After saving `sessionMemory.current.lastFeature`, the display strings used in messages like "Launching..." should say "Trade Generator" / "Macro Labs" instead of "AI Trade Setup" / "Macro Commentary" -- but only in user-facing text. The internal `featureType` values (`ai_trade_setup`, `macro_commentary`) remain unchanged for DB compatibility.

---

## Changes in `supabase/functions/aura/index.ts`

### 5. System prompt intent mapping (around line 648-651)

Update the STEP 1 section:
```
STEP 1 - DETECT INTENT:
- If user says: "generate a trade", "setup for EUR/USD", "give me a trade idea", "run AI setup" -> Trade Generator
- If user says: "macro analysis", "what's happening with", "market commentary", "macro labs" -> Macro Labs
- If user says: "generate a report", "portfolio report", "weekly report" -> Report
```

### 6. System prompt feature labels (around line 653-675)

Rename display labels:
- "For AI Trade Setup:" becomes "For Trade Generator:"
- "For Macro Commentary:" becomes "For Macro Labs:"

### 7. System prompt confirmation text (around line 673)

Change:
```
"I'll generate a [feature name]..." 
```
To reference "Trade Generator" or "Macro Labs" as the feature name.

### 8. Contextual memory instruction (around line 850)

Change:
```
If user says "now run it on gold" and last feature was "macro_commentary", call launch_macro_commentary...
```
To also mention "Macro Labs" as the display name.

---

## What does NOT change

- Tool function names remain `launch_ai_trade_setup`, `launch_macro_commentary`, `launch_report` (no API change)
- Internal `featureType` values remain `ai_trade_setup`, `macro_commentary`, `reports` (DB constraint compatibility)
- `createJob` calls remain the same (using DB-allowed feature strings)
- Request payloads remain identical
- No edge function endpoint changes
- No schema changes
- Report routing stays `/reports`

---

## Files Modified

| File | Scope |
|------|-------|
| `src/components/AURA.tsx` | 4 locations: mini-widget navigations, badge routes, toast text, message display names |
| `supabase/functions/aura/index.ts` | System prompt text only: intent labels, feature names, confirmation wording |

