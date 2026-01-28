
# Plan : Intégrer l'appel à `macro-lab-proxy` dans le Trade Generator

## Analyse

### Situation actuelle
- L'edge function `macro-lab-proxy` existe et cible `http://3.137.115.96:9000/run`
- Le Trade Generator appelle uniquement :
  1. `forecast-proxy` (prédictions quantitatives)
  2. `surface-proxy` (surface de risque 3D)
- Le paramètre `mode: "trade_generation"` n'est envoyé qu'à `forecast-proxy`, pas à l'API cible

### Solution
Ajouter un 3ème appel API à `macro-lab-proxy` avec `mode: "trade_generation"` pour obtenir les AI Trade Setups.

---

## Architecture des appels API

```text
User clicks "Generate Trade"
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 1: Forecast Proxy (existant)                      │
│  URL: .../functions/v1/forecast-proxy                   │
│  → Retourne: entry_price, horizons, tp, sl, direction  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 2: Surface Proxy (existant)                       │
│  URL: .../functions/v1/surface-proxy                    │
│  → Retourne: surface 3D, ATR, sigma_ref                │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 3: Macro Lab Proxy (À AJOUTER)                    │
│  URL: .../functions/v1/macro-lab-proxy                  │
│  Target: http://3.137.115.96:9000/run                   │
│  Payload: mode: "trade_generation"                      │
│  → Retourne: AI Trade Setups                           │
└─────────────────────────────────────────────────────────┘
```

---

## Modifications techniques

### Fichier : `src/pages/ForecastTradeGenerator.tsx`

#### 1. Ajouter la constante URL (après les imports, ~ligne 62)

```typescript
const MACRO_LAB_PROXY_URL = "https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/macro-lab-proxy";
```

#### 2. Ajouter les états pour l'appel AI Setup (~ligne 816)

```typescript
const [aiSetupLoading, setAiSetupLoading] = useState(false);
const [aiSetupError, setAiSetupError] = useState<string | null>(null);
```

#### 3. Modifier `handleSubmit` pour appeler `macro-lab-proxy`

Après l'appel `surface-proxy` (ligne 941), ajouter :

```typescript
// === STEP 3: Call macro-lab-proxy for AI Trade Setups ===
setAiSetupLoading(true);
setAiSetupError(null);

try {
  const macroPayload = {
    mode: "trade_generation",  // CRITICAL: Mode identifier
    type: "trade_setup",
    instrument: symbol,
    timeframe: timeframe,
    horizons: parsedHorizons,
    riskLevel: riskLevel,
    strategy: strategy,
    customNotes: customNotes,
    forecast_context: {
      entry_price: forecastEntryPrice,
      direction: horizonsData[0]?.direction,
      horizons: horizonsData.map(h => ({
        h: h.h,
        tp: h.tp,
        sl: h.sl,
        direction: h.direction
      }))
    }
  };

  const macroResponse = await fetch(MACRO_LAB_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(macroPayload),
  });

  if (macroResponse.ok) {
    const macroData = await macroResponse.json();
    const normalized = normalizeN8n(macroData);
    if (normalized && normalized.setups && normalized.setups.length > 0) {
      setAiSetupResult(normalized);
    }
  } else {
    setAiSetupError(`AI Setup API error: ${macroResponse.status}`);
  }
} catch (macroErr) {
  setAiSetupError(macroErr instanceof Error ? macroErr.message : "AI Setup API error");
} finally {
  setAiSetupLoading(false);
}
```

#### 4. Mettre à jour l'UI de l'onglet "Trade Setup"

Dans la section `TabsContent value="trade_setup"`, ajouter l'état de chargement :

```typescript
{aiSetupLoading ? (
  <Card>
    <CardContent className="py-8">
      <div className="flex items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-muted-foreground">
          Generating AI Trade Setup...
        </span>
      </div>
    </CardContent>
  </Card>
) : aiSetupError ? (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>AI Setup Error</AlertTitle>
    <AlertDescription>{aiSetupError}</AlertDescription>
  </Alert>
) : aiSetupResult ? (
  <TradeSetupDisplay setup={aiSetupResult} />
) : (
  <Alert>
    <Info className="h-4 w-4" />
    <AlertTitle>No AI Setup Data</AlertTitle>
    <AlertDescription>
      Run a forecast to generate AI Trade Setups.
    </AlertDescription>
  </Alert>
)}
```

#### 5. Ajouter l'import Loader2 (si absent)

```typescript
import { Loader2 } from "lucide-react";
```

---

## Payload envoyé à macro-lab-proxy

```json
{
  "mode": "trade_generation",
  "type": "trade_setup",
  "instrument": "EUR/USD",
  "timeframe": "15min",
  "horizons": [24],
  "riskLevel": "medium",
  "strategy": "breakout",
  "customNotes": "",
  "forecast_context": {
    "entry_price": 1.0845,
    "direction": "long",
    "horizons": [
      { "h": "24h", "tp": 1.0892, "sl": 1.0810, "direction": "long" }
    ]
  }
}
```

---

## Fichiers modifiés

| Fichier | Changements |
|---------|-------------|
| `src/pages/ForecastTradeGenerator.tsx` | Constante URL, nouveaux états, appel macro-lab-proxy, UI conditionnelle |

---

## Garantie de non-regression

- Les appels `forecast-proxy` et `surface-proxy` restent inchangés
- Le nouvel appel `macro-lab-proxy` est additionnel
- La fonction `normalizeN8n` existante est réutilisée
- Aucune modification des autres pages ou edge functions
