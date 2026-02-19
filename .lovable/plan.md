
# Audit & Fix: AURA Routing -- Eliminate Legacy Features, Zero Regression

## Audit Report

### A. Tool Registry (Edge Function `supabase/functions/aura/index.ts`)
- **Lines 929-944**: Tool named `launch_ai_trade_setup` -- this is the legacy name exposed to the LLM model. Should be renamed to `launch_trade_generator`.
- **Lines 949-961**: Tool named `launch_macro_commentary` -- legacy name. Should be renamed to `launch_macro_lab`.
- **Lines 964-976**: Tool named `launch_report` -- this one is fine (report is the same feature).
- **Lines 648-651, 678-680**: System prompt references "run AI setup", "Trade Generator", "Macro Labs" -- mixed. The intent detection text is partially correct but tool names referenced are still legacy.
- **Line 850**: Session memory says `macro_commentary` for last feature, biasing the model to call legacy tool names.

### B. Intent to Tool Routing (`src/components/AURA.tsx`)
- **Lines 758-770**: `handleToolLaunch` switch maps `launch_ai_trade_setup` -> `featureType = 'ai_trade_setup'` and `launch_macro_commentary` -> `featureType = 'macro_commentary'`. These internal type strings propagate everywhere.
- **Lines 824-829**: `createJob()` call uses confusing mapping: `featureType === 'ai_trade_setup' ? 'macro_commentary'` -- this is a known workaround for the DB constraint but creates routing confusion.
- **Lines 975-978**: `enhancedPostRequest` options still pass legacy feature labels.

### C. Navigation / UI Injection
- **AURA.tsx lines 1224-1228**: Job badge click routes are CORRECT (`ai_trade_setup -> /trade-generator`, `macro_commentary -> /macro-lab`).
- **GlobalLoadingProvider.tsx lines 56-62**: Navigation map is CORRECT.
- **PersistentNotificationProvider.tsx lines 137-146**: `mapFeatureToRoute` still routes `'ai-setup' -> '/ai-setup'` and `'macro-analysis' -> '/macro-analysis'` -- these are LEGACY ROUTES.
- **PersistentNotificationProvider.tsx lines 332-337**: Error retry routes use LEGACY paths (`'/ai-setup'`, `'/macro-analysis'`, `'/forecast-playground/macro-commentary'`, `'/forecast-playground/trade-generator'`).
- **PersistentNotificationProvider.tsx lines 106-120**: `mapJobToOriginatingFeature` fallback returns `'ai-setup'` for trade setups instead of `'trade-generator'`.

### D. Other Legacy References
- **NavigationBreadcrumb.tsx line 28**: `/ai-setup` route in breadcrumb map.
- **App.tsx line 104**: `/ai-setup` route still exists (the page itself).
- **JobStatusCard.tsx lines 11, 28, 34**: Uses `'ai_setup'` type (note: different from `ai_trade_setup`).
- **Credits.tsx lines 61, 83**: Counts `'ai_setup'` for stats.
- **TradingDashboard.tsx line 362**: Navigates to `/history` for `'ai_setup'` type.

### E. System Prompt (Edge Function)
- Lines 648-680: Uses "Trade Generator" and "Macro Labs" in intent detection text but tool names are still `launch_ai_trade_setup` / `launch_macro_commentary`.

### F. No Caching Issues Found
- No localStorage/DB caching of tool schemas detected.

---

## Fix Plan

### 1. Rename Tools in Edge Function (`supabase/functions/aura/index.ts`)

Rename the 3 feature tools in the API schema sent to the LLM:
- `launch_ai_trade_setup` -> `launch_trade_generator`
- `launch_macro_commentary` -> `launch_macro_lab`
- `launch_report` stays as is

Update system prompt references (lines 648-680, 850) to use new tool names consistently:
- "Use 'launch_trade_generator' when user confirms they want a trade setup"
- "Use 'launch_macro_lab' when user confirms they want macro analysis"
- Session memory reference: replace `macro_commentary` with `macro_lab`

### 2. Update Client-Side Tool Handler (`src/components/AURA.tsx`)

Update `handleToolLaunch` switch (lines 758-770):
- `case 'launch_trade_generator':` (was `launch_ai_trade_setup`)
- `case 'launch_macro_lab':` (was `launch_macro_commentary`)
- `case 'launch_report':` stays

Update payload builders (lines 792-822) to match new function names.

Update `createJob` calls to use `request_payload.type` for routing:
- Trade generator jobs: `request_payload.type = 'trade_generator'`
- Macro lab jobs: `request_payload.type = 'macro_lab'`
- Report jobs: `request_payload.type = 'reports'`

The `feature` field sent to the DB stays as `'AI Trade Setup'` / `'Macro Commentary'` / `'Report'` (DB constraint unchanged).

Update `AuraJobBadge` type (line 88): change to `'trade_generator' | 'macro_lab' | 'reports'`.

Update job badge routes (lines 1224-1228) to use new type keys.

### 3. Fix PersistentNotificationProvider (`src/components/PersistentNotificationProvider.tsx`)

- `mapJobToOriginatingFeature` (lines 106-120): Legacy fallbacks should route `'ai trade setup'` -> `'trade-generator'` (not `'ai-setup'`), and `macro/commentary` -> `'macro-lab'` (not `'macro-analysis'`).
- `mapFeatureToRoute` (lines 137-146): Remove `'ai-setup' -> '/ai-setup'` and `'macro-analysis' -> '/macro-analysis'`. Replace with `'trade-generator' -> '/trade-generator'` and `'macro-lab' -> '/macro-lab'`.
- Error retry routes (lines 332-337): Fix to use `/trade-generator` and `/macro-lab`.
- Update all type unions from `'ai-setup' | 'macro-analysis' | ...` to `'trade-generator' | 'macro-lab' | 'reports'`.

### 4. Add Dev-Only Telemetry (`src/components/AURA.tsx`)

Add a debug log in `handleToolLaunch` that logs:
```
{
  intent_detected: functionName,
  user_phrase: <last user message>,
  resolved_feature_key: 'TRADE_SETUP' | 'MACRO_COMMENTARY' | 'REPORT',
  tool_called: functionName,
  route_targeted: '/trade-generator' | '/macro-lab' | '/reports',
  legacy_alias_used: boolean
}
```

Add a dev-only badge in fullscreen mode (visible only when `import.meta.env.DEV`) showing "Triggered: trade-generator" etc. after a tool launch.

### 5. Update Supporting Files

- **LoadingCard.tsx**: Update type union and labels from `ai_trade_setup`/`macro_commentary` to `trade_generator`/`macro_lab`.
- **useLoadingManager.tsx**: Same type union update.
- **GlobalLoadingProvider.tsx**: Update navigation map keys.
- **feature-mapper.ts**: Add `trade_generator` and `macro_lab` as canonical keys.
- **JobStatusCard.tsx**: Update `ai_setup` references to `trade_generator`.

### 6. Keep Legacy Routes in App.tsx (Backward Compatibility)

The `/ai-setup` and `/macro-analysis` routes in App.tsx can stay for now as they serve existing pages. They are NOT called by AURA anymore after this fix.

---

## What Does NOT Change
- Database `jobs.feature` constraint values (`'AI Trade Setup'`, `'Macro Commentary'`, `'Report'`)
- API payload formats sent to n8n webhook
- Chart widgets, attachments, streaming logic
- The actual `/ai-setup` and `/macro-analysis` page components (they still exist as standalone pages)
- Credit system logic
- Realtime subscription patterns

## Files Modified
1. `supabase/functions/aura/index.ts` -- tool names + system prompt
2. `src/components/AURA.tsx` -- tool handler + job types + telemetry
3. `src/components/PersistentNotificationProvider.tsx` -- routing fixes
4. `src/components/LoadingCard.tsx` -- type labels
5. `src/hooks/useLoadingManager.tsx` -- type union
6. `src/components/GlobalLoadingProvider.tsx` -- navigation map
7. `src/lib/feature-mapper.ts` -- add new canonical keys
8. `src/components/JobStatusCard.tsx` -- type labels
