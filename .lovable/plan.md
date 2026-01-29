
# Plan: Corriger l'extraction du champ `risk_surface` pour le Trade Generator

## Problème Identifié

La réponse API du Trade Generator contient un champ `risk_surface` avec une structure **doublement imbriquée** :

```json
{
  "status": "ok",
  "surface": {
    "symbol": "EUR/USD",
    "sigma_ref": 0.00028271,
    "atr": 0.001394,
    "entry_price": 1.19276,
    "methodology": "research",
    "surface": {          // <-- Niveau supplémentaire !
      "target_probs": [...],
      "sl_sigma": [...],
      "tp_sigma": [...]
    }
  }
}
```

Le composant `RiskSurfaceChart` attend `data.surface.target_probs`, `data.surface.sl_sigma`, `data.surface.tp_sigma`.

Or, avec la structure actuelle, les données sont dans `risk_surface.surface.surface.target_probs` au lieu de `risk_surface.surface.target_probs`.

## Solution

Modifier la fonction `extractRiskSurface` dans `ForecastTradeGenerator.tsx` pour :
1. Détecter la structure imbriquée `risk_surface.surface` où `surface` contient les métadonnées (`symbol`, `sigma_ref`, etc.)
2. Extraire les propriétés de premier niveau (`sigma_ref`, `entry_price`, `atr`, `symbol`)
3. Aplatir la structure pour que `surface.target_probs` soit directement accessible

---

## Modifications Techniques

### Fichier: `src/pages/ForecastTradeGenerator.tsx`

#### Modifier la fonction `parseSurface` (lignes 432-465)

La fonction doit gérer 3 formats :

| Format | Structure | Action |
|--------|-----------|--------|
| 1 | `{ surface: { target_probs, sl_sigma, tp_sigma } }` | Déjà supporté |
| 2 | `{ target_probs, sl_sigma, tp_sigma, sigma_ref, ... }` | Déjà supporté |
| 3 (NOUVEAU) | `{ surface: { sigma_ref, entry_price, surface: { target_probs, ... } } }` | À ajouter |

**Nouveau code `parseSurface` :**

```typescript
const parseSurface = (surface: unknown): SurfaceApiResponse | null => {
  if (!surface) return null;
  
  let parsed = surface;
  
  // Handle stringified JSON
  if (typeof surface === "string") {
    try { 
      parsed = JSON.parse(surface);
      console.log("[extractRiskSurface] Parsed string successfully");
    } catch { 
      console.log("[extractRiskSurface] Failed to parse string");
      return null; 
    }
  }
  
  if (typeof parsed !== "object" || parsed === null) {
    console.log("[extractRiskSurface] Not an object");
    return null;
  }
  
  const s = parsed as Record<string, unknown>;
  
  // NEW FORMAT: { status, surface: { sigma_ref, entry_price, surface: { target_probs, sl_sigma, tp_sigma } } }
  // This is the actual API response format from the backend
  if (s?.surface && typeof s.surface === "object") {
    const outerSurface = s.surface as Record<string, unknown>;
    
    // Check if this outer surface has a nested "surface" with the actual arrays
    if (outerSurface?.surface && typeof outerSurface.surface === "object") {
      const innerSurface = outerSurface.surface as Record<string, unknown>;
      
      // Validate the inner surface has the required arrays
      if (innerSurface?.target_probs && innerSurface?.sl_sigma && innerSurface?.tp_sigma) {
        console.log("[extractRiskSurface] Detected nested surface.surface structure - flattening");
        
        // Flatten the structure: merge outer metadata with inner surface
        return {
          sigma_ref: outerSurface.sigma_ref as number,
          entry_price: outerSurface.entry_price as number,
          atr: outerSurface.atr as number | undefined,
          symbol: outerSurface.symbol as string | undefined,
          timeframe: outerSurface.timeframe as string | undefined,
          methodology: outerSurface.methodology as string | undefined,
          surface: {
            target_probs: innerSurface.target_probs as number[],
            sl_sigma: innerSurface.sl_sigma as number[],
            tp_sigma: innerSurface.tp_sigma as number[][],
          },
        } as SurfaceApiResponse;
      }
    }
    
    // Standard format: outer surface has the arrays directly
    if (outerSurface?.target_probs || outerSurface?.sl_sigma || outerSurface?.tp_sigma) {
      console.log("[extractRiskSurface] Valid surface structure detected (nested surface object)");
      return parsed as SurfaceApiResponse;
    }
  }
  
  // Direct properties format
  if (s?.target_probs || s?.sl_sigma || s?.tp_sigma || s?.sigma_ref || s?.atr) {
    console.log("[extractRiskSurface] Valid surface structure detected (direct properties)");
    return s as SurfaceApiResponse;
  }
  
  console.log("[extractRiskSurface] Invalid surface structure");
  return null;
};
```

---

## Résumé des Modifications

| Lignes | Changement |
|--------|------------|
| 432-465 | Réécriture de `parseSurface` pour gérer la structure `surface.surface` imbriquée |

---

## Garanties Zero Régression

1. **Compatibilité arrière** : Les 2 formats précédents restent supportés
2. **Logging détaillé** : Les console.log permettent de tracer le chemin d'extraction
3. **Même composant** : `RiskSurfaceChart` reste inchangé, seul le format de données en entrée est normalisé
4. **Autres pages** : Aucune modification à `ForecastPlaygroundTool.tsx` qui utilise une API différente

---

## Résultat Attendu

Après cette modification :
1. Le champ `risk_surface` sera correctement extrait de la réponse API
2. Les données seront aplaties pour correspondre au format attendu par `RiskSurfaceChart`
3. La surface 3D s'affichera dans l'onglet "Forecast Data" avec :
   - X-axis : Stop-Loss (σ)
   - Y-axis : Target Probability (%)
   - Z-axis : Take-Profit (σ)
4. Le panneau "Selected Trade Scenario" sera interactif pour explorer les scénarios
