
# AURA as MCP Router -- Align Requests with Actual Page Implementations

## Problem

AURA sends **different payloads** than the actual pages, causing backend failures or wrong results:

| Field | Trade Generator Page | AURA (current) |
|-------|---------------------|----------------|
| `type` | `"RAG"` | `"trade_generator"` |
| `mode` | `"trade_generation"` | `"run"` |
| `horizons` | `[24]` (computed) | missing |
| `use_montecarlo` | `true` | missing |
| `paths` | `3000` | missing |
| `skew` | `-0.8` | missing |
| `question` | Structured prompt via `buildQuestion()` | Simple string |

| Field | Macro Lab Page | AURA (current) |
|-------|---------------|----------------|
| `type` | `"RAG"` | `"macro_lab"` |
| `filters` | `{region,product,category}` | missing |
| `assetType` | `"currency"` | missing |
| `analysisDepth` | `"detailed"` | missing |
| `period` | `"weekly"` | missing |

The endpoint URL is correct (`macro-lab-proxy`), but the payload structure is wrong, so the backend may not process requests correctly.

## Solution: Feature Registry + Payload Builders

### Step 1 -- Create `src/lib/auraFeatureRegistry.ts`

A central registry that describes each feature with:

- `featureId`: internal key
- `pageRoute`: where "Open in page" navigates
- `endpoint`: API URL (from the page constants)
- `creditType`: which credit pool to use
- `dbFeature`: DB constraint value (`'AI Trade Setup'` | `'Macro Commentary'` | `'Report'`)
- `buildPayload(params)`: builds the EXACT same JSON body as the page
- `parseResponse(raw)`: extracts display-ready data for chat widgets

```typescript
// Registry entries:

tradeGenerator: {
  featureId: 'trade_generator',
  pageRoute: '/trade-generator',
  endpoint: MACRO_LAB_PROXY_URL,
  creditType: 'ideas',
  dbFeature: 'AI Trade Setup',
  buildPayload: ({ instrument, timeframe, riskLevel, strategy, customNotes, jobId }) => ({
    job_id: jobId,
    type: "RAG",
    mode: "trade_generation",
    instrument,
    question: buildQuestion({ instrument, timeframe, riskLevel, strategy, customNotes, horizons }),
    isTradeQuery: true,
    timeframe,
    riskLevel,
    strategy,
    customNotes,
    horizons: [HORIZON_BY_TIMEFRAME[timeframe] || 24],
    use_montecarlo: true,
    paths: 3000,
    skew: -0.8,
  }),
}

macroLab: {
  featureId: 'macro_lab',
  pageRoute: '/macro-lab',
  endpoint: MACRO_LAB_PROXY_URL,
  creditType: 'queries',
  dbFeature: 'Macro Commentary',
  buildPayload: ({ instrument, timeframe, question, jobId, userEmail }) => ({
    job_id: jobId,
    type: "RAG",
    mode: "run",
    instrument,
    question: question || `Provide comprehensive macro commentary for ${instrument}`,
    user_email: userEmail,
    filters: { region: "All", product: "All", category: "All" },
    assetType: "currency",
    analysisDepth: "detailed",
    period: "weekly",
    isTradeQuery: false,
    timeframe: timeframe || "1H",
  }),
}

reports: {
  featureId: 'reports',
  pageRoute: '/reports',
  endpoint: N8N_REPORTS_URL,
  creditType: 'reports',
  dbFeature: 'Report',
  buildPayload: ({ instrument, question, jobId }) => ({
    job_id: jobId,
    mode: "run",
    type: "reports",
    question,
    instrument,
    timeframe: "1D",
    exportFormat: "pdf",
  }),
}
```

The `buildQuestion()` helper will also be extracted from `ForecastTradeGenerator.tsx` into this shared module (or re-exported) so both the page and AURA use the exact same prompt construction.

### Step 2 -- Refactor AURA.tsx to use the registry

Replace the inline payload construction (lines 817-856) with:

```typescript
import { FEATURE_REGISTRY } from '@/lib/auraFeatureRegistry';

const feature = FEATURE_REGISTRY[featureType];
const requestPayload = feature.buildPayload({
  instrument, timeframe, riskLevel, strategy, customNotes, jobId, userEmail: user?.email
});
```

Replace the inline endpoint selection (lines 999-1004) with:

```typescript
const endpointUrl = feature.endpoint;
```

Replace the inline dbFeature mapping (lines 860-861) with:

```typescript
const dbFeature = feature.dbFeature;
```

Replace the inline creditType mapping (lines 781-801) with:

```typescript
const creditType = feature.creditType;
```

### Step 3 -- Enhanced "Open in Page" with result preloading

Currently, the mini-widgets navigate to the page route but don't pass the result. Add sessionStorage-based handoff:

When AURA receives a completed result, store it:
```typescript
sessionStorage.setItem('aura-preloaded-result', JSON.stringify({
  jobId,
  featureType,
  data: parsedPayload,
  timestamp: Date.now()
}));
navigate(feature.pageRoute);
```

The pages already check `sessionStorage.getItem('pendingResult')` on mount (Macro Lab line 131-146). We align the key format so it works seamlessly.

### Step 4 -- Improved chat widgets

Enhance `AuraMiniTradeSetup` to display additional fields when available:
- Timeframe badge
- Strategy badge  
- Horizon info

Enhance `AuraMiniMacro` to show:
- Directional bias badge (Bullish/Bearish)
- Confidence percentage
- Key levels if available

Both widgets already have "Open Full View" buttons -- update them to use the sessionStorage preload from Step 3.

### Step 5 -- Response parsing via registry

Add `parseResponse` functions to the registry that match the page's extraction logic:

For Trade Generator: reuse the same `normalizeN8n()` and `extractDecisionSummary()` patterns from `ForecastTradeGenerator.tsx`

For Macro Lab: reuse the same `parseMacroContentToStructured()` pattern from `ForecastMacroLab.tsx`

This ensures AURA displays results with the same fidelity as the native pages.

## Files Modified

1. **NEW: `src/lib/auraFeatureRegistry.ts`** -- Central registry with payload builders
2. **`src/components/AURA.tsx`** -- Refactor to use registry (removes ~60 lines of hardcoded logic, replaces with ~10 lines of registry calls)
3. **`src/pages/ForecastTradeGenerator.tsx`** -- Extract `buildQuestion()` to shared location (or re-export)

## What Does NOT Change

- Edge functions (aura, macro-lab-proxy) -- unchanged
- Page logic and APIs -- unchanged
- Credit system, job tracking, Realtime subscriptions -- unchanged
- DB schema and constraints -- unchanged
- Mini-widget visual design -- unchanged (just enhanced data)
- Reports feature -- same n8n webhook, same payload

## Risk Mitigation

- The registry is purely additive -- pages keep their own inline payload construction
- AURA's Realtime subscription logic (lines 887-997) stays identical
- Fallback: if registry lookup fails, AURA falls back to current behavior
