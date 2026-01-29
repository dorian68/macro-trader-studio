

# Plan : Corriger l'extraction de trade_setup et risk_surface dans le Trade Generator

## Analyse du Problème

### Problème 1 : trade_setup - Navigation de structure incorrecte

La réponse API retourne `trade_setup` comme un tableau de strings JSON :
```json
"trade_setup": ["{ \"status\": \"success\", \"data\": { \"data\": { \"payload\": { \"horizons\": [...] } } } }"]
```

Après parsing, la structure est :
```text
{
  status: "success",
  data: {              ← 1er niveau
    data: {            ← 2ème niveau  
      payload: {       ← Le payload est ici !
        horizons: [...]
      }
    }
  }
}
```

Mais le code actuel dans `getHorizonsFromTradeSetup()` cherche directement `setup?.payload?.horizons`, ce qui retourne `undefined`.

### Problème 2 : risk_surface - Absent de la réponse API

L'inspection de la réponse réseau montre que le backend ne retourne **pas** de champ `risk_surface` dans `body.message.message.content.content`. Seuls `final_answer` et `trade_setup` sont présents.

**Solution** : Extraire les données nécessaires pour le RiskSurfaceChart depuis les métadonnées contenues dans `trade_setup.data.data.metadata` (qui contient `sigma_last`, `vol_model`, etc.).

---

## Solution Technique

### Fichier : `src/pages/ForecastTradeGenerator.tsx`

#### 1. Corriger `getHorizonsFromTradeSetup()` (lignes 607-616)

Ajouter la navigation vers `data.data.payload.horizons` :

```typescript
function getHorizonsFromTradeSetup(setup: TradeSetupResponse): ForecastHorizon[] {
  // Path 1: Direct payload (expected structure)
  let horizons = setup?.payload?.horizons;
  
  // Path 2: Nested data.data.payload (actual API response)
  if (!horizons) {
    const innerData = (setup as any)?.data?.data?.payload;
    horizons = innerData?.horizons;
  }
  
  // Path 3: Double-nested via data.data (alternative structure)
  if (!horizons) {
    const altData = (setup as any)?.data?.payload;
    horizons = altData?.horizons;
  }
  
  if (!horizons) return [];
  if (Array.isArray(horizons)) return horizons;
  
  // Object format
  return Object.entries(horizons).map(([key, val]) => ({
    ...val,
    h: (val as any).h || key,
  }));
}
```

#### 2. Corriger `extractRiskSurface()` pour construire depuis trade_setup metadata

Puisque `risk_surface` n'est pas retourné par le backend, construire les données minimales depuis les métadonnées de forecast :

```typescript
function extractRiskSurface(raw: unknown): SurfaceApiResponse | null {
  console.log("[extractRiskSurface] Starting extraction...");
  
  // ... code existant pour chercher risk_surface directement ...
  
  // Path FALLBACK: Build surface data from trade_setup metadata
  try {
    const tradeSetup = extractTradeSetup(raw);
    if (tradeSetup) {
      const innerData = (tradeSetup as any)?.data?.data;
      const metadata = innerData?.metadata;
      const payload = innerData?.payload;
      
      if (metadata && payload) {
        console.log("[extractRiskSurface] Building from trade_setup metadata");
        
        // Extract required fields for RiskSurfaceChart
        const sigmaRef = metadata.sigma_last || metadata.residual_std;
        const entryPrice = payload.entry_price;
        const horizonData = payload.horizons?.[0];
        
        if (sigmaRef && entryPrice) {
          // Construct minimal surface response
          return {
            sigma_ref: sigmaRef,
            entry_price: entryPrice,
            symbol: metadata.symbol,
            timeframe: metadata.timeframe,
            // Indicate surface data not available
            surface: null,
            atr: null,
            metadata: {
              vol_model: metadata.vol_model,
              sigma_path_min: metadata.sigma_path_min,
              sigma_path_max: metadata.sigma_path_max
            }
          } as SurfaceApiResponse;
        }
      }
    }
  } catch (e) {
    console.log("[extractRiskSurface] Fallback from trade_setup failed:", e);
  }
  
  console.log("[extractRiskSurface] No valid risk_surface found in any path");
  return null;
}
```

#### 3. Ajouter des logs de debug détaillés dans handleSubmit

```typescript
// Après extractTradeSetup
console.log("[handleSubmit] trade_setup structure:", {
  hasPayload: !!tradeSetup?.payload,
  hasDataData: !!(tradeSetup as any)?.data?.data,
  keys: tradeSetup ? Object.keys(tradeSetup) : []
});
```

---

## Résumé des Modifications

| Fichier | Fonction | Changement |
|---------|----------|------------|
| `ForecastTradeGenerator.tsx` | `getHorizonsFromTradeSetup` | Ajouter navigation `data.data.payload.horizons` |
| `ForecastTradeGenerator.tsx` | `extractRiskSurface` | Fallback: construire depuis `trade_setup.metadata` |
| `ForecastTradeGenerator.tsx` | `handleSubmit` | Logs de debug enrichis |

---

## Garanties

1. **Zero Régression** : Les chemins existants (`setup?.payload?.horizons`) restent en priorité
2. **Fallback Chain** : Si le chemin direct échoue, les alternatives sont testées
3. **Logs Détaillés** : Permettent de diagnostiquer quel chemin a réussi
4. **Risk Surface Partielle** : Si le backend ne retourne pas `risk_surface`, les métadonnées de forecast fournissent les données de base (sigma_ref, entry_price)

---

## Notes pour le Backend (Optionnel)

Pour une solution complète du Risk Surface Chart, le backend devrait inclure `risk_surface` dans la réponse avec :
- `surface.target_probs[]`
- `surface.sl_sigma[]` 
- `surface.tp_sigma[]`
- `atr`
- `sigma_ref`

