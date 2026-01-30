
# Plan : Correction du parsing de risk_surface dans le Trade Generator

## Problème identifié

L'audit du payload backend révèle que le champ `risk_surface` est retourné sous forme de **tableau contenant une chaîne JSON stringifiée** :

```json
"risk_surface": [
  "{\"status\": \"ok\", \"elapsed_sec\": 0.4, \"surface\": {...}}"
]
```

Le code actuel de `extractRiskSurface()` (lignes 570-578) vérifie uniquement si `riskSurfaceObj` est de type `string`, mais **ne gère pas le cas où c'est un tableau**.

## Cause racine

```text
Ligne 570-578 dans ForecastTradeGenerator.tsx :

let riskSurfaceObj = content2.risk_surface;
if (typeof riskSurfaceObj === "string") {   // ← Ne détecte pas les tableaux
  riskSurfaceObj = JSON.parse(riskSurfaceObj);
}
```

Quand `risk_surface` est un tableau `["..."]`, le type est `object` (pas `string`), donc le parsing JSON n'est jamais exécuté.

## Solution

Ajouter une gestion explicite du cas **tableau** avant le parsing de la chaîne JSON :

```text
1. Si risk_surface est un tableau :
   - Prendre le premier élément
   - Parser la chaîne JSON si c'est une string
2. Si risk_surface est une string :
   - Parser la chaîne JSON
3. Si risk_surface est déjà un objet :
   - L'utiliser directement
```

## Modifications proposées

### Fichier : `src/pages/ForecastTradeGenerator.tsx`

**Localisation** : Lignes 569-578

**Avant** :
```typescript
// CRITICAL: risk_surface itself might be a JSON string (double-encoded)
let riskSurfaceObj = content2.risk_surface;
if (typeof riskSurfaceObj === "string") {
  try {
    riskSurfaceObj = JSON.parse(riskSurfaceObj);
    console.log("[extractRiskSurface] Parsed risk_surface from string to object");
  } catch (e) {
    console.log("[extractRiskSurface] Failed to parse risk_surface string:", e);
  }
}
```

**Après** :
```typescript
// CRITICAL: risk_surface can be:
// 1. An array containing a JSON string: ["{ ... }"]
// 2. A JSON string directly: "{ ... }"
// 3. An object directly: { ... }
let riskSurfaceObj = content2.risk_surface;

// Handle ARRAY case first (backend returns risk_surface as array)
if (Array.isArray(riskSurfaceObj)) {
  console.log("[extractRiskSurface] risk_surface is an array, extracting first element");
  const firstElement = riskSurfaceObj[0];
  if (typeof firstElement === "string") {
    try {
      riskSurfaceObj = JSON.parse(firstElement);
      console.log("[extractRiskSurface] Parsed array[0] JSON string successfully");
    } catch (e) {
      console.log("[extractRiskSurface] Failed to parse array[0] string:", e);
    }
  } else if (typeof firstElement === "object" && firstElement !== null) {
    riskSurfaceObj = firstElement;
    console.log("[extractRiskSurface] Using array[0] object directly");
  }
}
// Handle STRING case (double-encoded JSON)
else if (typeof riskSurfaceObj === "string") {
  try {
    riskSurfaceObj = JSON.parse(riskSurfaceObj);
    console.log("[extractRiskSurface] Parsed risk_surface from string to object");
  } catch (e) {
    console.log("[extractRiskSurface] Failed to parse risk_surface string:", e);
  }
}
```

### Modifications similaires pour Path 2 et Path 3

Les mêmes modifications doivent être appliquées aux chemins d'extraction alternatifs (lignes 601-635) pour garantir la cohérence.

## Résumé technique

| Aspect | Détail |
|--------|--------|
| **Fichier modifié** | `src/pages/ForecastTradeGenerator.tsx` |
| **Fonction affectée** | `extractRiskSurface()` |
| **Lignes impactées** | 569-578, 607-608, 624-625 |
| **Type de correction** | Gestion du type de données (array vs string vs object) |

## Garanties

- Aucune régression sur les autres chemins de parsing
- Logs de debug structurés pour traçabilité
- Logique cohérente avec le parsing de `trade_setup` qui gère déjà les tableaux
- Préservation du comportement existant pour les formats non-tableau
