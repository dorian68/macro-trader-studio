
# Plan: Fix Trade Generator - Trade Setup Empty + Add Risk Surface

## Problem Analysis

### Issue 1: "Trade Setup" tab is empty
The backend response does NOT contain `output.final_answer` with AI Setup data. The current response only includes forecast data at `data.payload.horizons`. The backend needs to be updated to return AI Setup data when `mode: "trade_generation"` is used. This is a **backend limitation**, not a frontend bug.

**Recommendation for now**: Display a clear message explaining that AI Setup data is not yet available from the backend.

### Issue 2: "Forecast Data" tab missing Risk Surface and Risk Profiles
The Trade Generator uses a simplified `ForecastDataTable` that lacks:
- Surface API call (`surface-proxy`)
- `RiskSurfaceChart` component
- `RiskProfilesPanel` expandable rows
- ATR-based TP/SL calculations
- Market Frictions display

---

## Solution

### Part A: Add informative message in "Trade Setup" tab
When no AI Setup data is available, show a clear explanation that the backend doesn't yet return combined data.

### Part B: Add Risk Surface and Risk Profiles to "Forecast Data" tab
Port the following from `ForecastPlaygroundTool.tsx`:

1. **Add Surface API state and call**:
   - Add state: `surfaceResult`, `surfaceLoading`, `surfaceError`
   - Call `surface-proxy` API after forecast response
   - Extract `entry_price` from forecast as single source of truth

2. **Replace `ForecastDataTable` with the full `ForecastSummaryTable`**:
   - Expandable rows with Risk Profiles
   - ATR and sigma-based TP/SL calculations
   - Market Frictions display

3. **Add `RiskSurfaceChart` component**:
   - Import and use existing component
   - Add as a tab or section in results

4. **Add required imports and utilities**:
   - Import from `@/lib/forecastUtils` (RISK_PROFILES, pipSizeForSymbol, etc.)
   - Import from `@/lib/marketFrictions` (getSymmetricFriction, etc.)
   - Import from `@/lib/surfaceInterpolation` (interpolateProbability)
   - Import `RiskSurfaceChart` component

---

## Technical Changes

### File: `src/pages/ForecastTradeGenerator.tsx`

#### 1. Add new imports (top of file)
```typescript
import { RiskSurfaceChart, SurfaceApiResponse } from "@/components/labs/RiskSurfaceChart";
import {
  RISK_PROFILES,
  pipSizeForSymbol,
  pipUnitLabel,
  sigmaHProxyFromQuantiles,
  sigmaHFromSigmaRef,
  tpSlFromSigmas,
  tpSlFromATR,
  priceDistanceToPips,
  computeSteps,
} from "@/lib/forecastUtils";
import {
  getSymmetricFriction,
  getAssetClassLabel,
  SYMMETRIC_FRICTION_TOOLTIP,
} from "@/lib/marketFrictions";
import {
  interpolateProbability,
} from "@/lib/surfaceInterpolation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
```

#### 2. Add Surface API state (~line 510)
```typescript
// Surface API state
const [surfaceResult, setSurfaceResult] = useState<SurfaceApiResponse | null>(null);
const [surfaceLoading, setSurfaceLoading] = useState(false);
const [surfaceError, setSurfaceError] = useState<string | null>(null);
```

#### 3. Modify `handleSubmit` to call Surface API after forecast
After the forecast API call succeeds:
- Extract `entry_price` from response
- Call `surface-proxy` with same parameters + entry_price
- Store result in `surfaceResult`

#### 4. Add `RiskProfilesPanel` component
Port the full `RiskProfilesPanel` from `ForecastPlaygroundTool.tsx` (~lines 272-565).

#### 5. Replace `ForecastDataTable` with enhanced table
Create a new `EnhancedForecastTable` component with:
- Expandable rows (using state `expandedRows: Set<string>`)
- RiskProfilesPanel integration
- Pass `surface`, `atr`, `sigmaRef` props

#### 6. Add RiskSurfaceChart in results section
Add a tab or collapsible section showing the 3D Risk Surface visualization.

---

## Data Flow

```text
User clicks "Generate Trade"
        │
        ▼
POST /forecast-proxy with mode: "trade_generation"
        │
        ▼
Response: data.payload.horizons[] (Forecast Data)
        │                                  
        ├──► Display in "Forecast Data" tab
        │    └──► Expandable rows with RiskProfilesPanel
        │
        ▼
POST /surface-proxy with entry_price from forecast
        │
        ▼
Response: surface data (target_probs, sl_sigma, tp_sigma, atr)
        │
        ├──► Display RiskSurfaceChart (3D visualization)
        └──► Pass to RiskProfilesPanel for probability interpolation
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ForecastTradeGenerator.tsx` | Add imports, Surface API call, RiskProfilesPanel, enhanced table, RiskSurfaceChart |

---

## Expected Result

1. **Trade Setup tab**: Shows informative message that backend needs update (or displays data when backend supports it)
2. **Forecast Data tab**: 
   - Full forecast table with expandable Risk Profiles rows
   - Conservative/Moderate/Aggressive TP/SL calculations
   - ATR-based pricing when available
   - Market Frictions display
3. **Risk Surface tab** (new): 3D interactive visualization

---

## Zero Regression Guarantee

- All existing functionality preserved
- ForecastPlaygroundTool.tsx unchanged
- New features are additive only
