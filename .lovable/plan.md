

# Hardcode Horizon and Model Options in Trade Generator

## Summary

Remove the Horizon input and Model Options card from user control. These parameters will be computed/hardcoded internally based on the selected timeframe, simplifying the UI.

## Changes

### File: `src/pages/ForecastTradeGenerator.tsx`

**1. Horizon mapping constant (add near line 158)**

Add a mapping object:
```typescript
const HORIZON_BY_TIMEFRAME: Record<string, number> = {
  "15min": 12,
  "30min": 24,
  "1h": 24,
  "4h": 30,
};
```

**2. Remove user-facing state variables (lines 1736-1749)**

Remove these state declarations:
- `horizons` (line 1736) -- will be computed from timeframe
- `useMonteCarlo` (line 1737) -- always true
- `paths` (line 1738) -- always 3000
- `skew` (line 1739) -- always -0.8
- `advancedOpen` (line 1747) -- no longer needed
- `includePredictions` (line 1748) -- always true
- `includeMetadata` (line 1749) -- always false

**3. Update `handleSubmit` payload construction (lines 1868-1942)**

Replace the horizon parsing logic:
```typescript
const parsedHorizons = [HORIZON_BY_TIMEFRAME[timeframe] || 24];
```

Remove the validation guard (lines 1874-1878) since horizons are now guaranteed valid.

Update the payload to use hardcoded values:
```typescript
const macroPayload = {
  job_id: jobId,
  type: "RAG",
  mode: "trade_generation",
  instrument: symbol,
  question: buildQuestion({ instrument: symbol, timeframe, riskLevel, strategy, customNotes, horizons: parsedHorizons }),
  user_email: null,
  isTradeQuery: true,
  timeframe,
  riskLevel,
  strategy,
  customNotes,
  horizons: parsedHorizons,
  use_montecarlo: true,
  paths: 3000,
  skew: -0.8,
};
```

**4. Remove UI elements from the parameters card (lines 2180-2304)**

- Remove the "Horizons" input field (lines 2180-2184)
- Remove the entire "Model Options" card (lines 2239-2304), including Monte Carlo switch, MC Paths input, Advanced Options collapsible (skew, include predictions, include metadata)
- Change grid from `md:grid-cols-3` to `md:grid-cols-2` (line 2140)

**5. Update collapsed summary badges (line 2118)**

Replace `{horizons}h` with the computed horizon: `{HORIZON_BY_TIMEFRAME[timeframe] || 24}h`

## What does NOT change

- All response parsing, extraction, and display logic
- Risk Profiles, Risk Surface, Decision Layer
- Job tracking, credit management
- Debug panel (super_user only)
- buildQuestion function signature (still receives horizons array)

