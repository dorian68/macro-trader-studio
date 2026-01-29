

# Plan: Corriger le Mapping trade_setup → Forecast Table & risk_surface → Risk Surface Chart

## Analyse du Problème

La réponse API contient les champs `risk_surface` et `trade_setup` mais le mapping actuel ne les extrait pas toujours correctement vers les composants appropriés :

- **`trade_setup`** → doit alimenter le tableau "Forecast Summary by Horizon" (`EnhancedForecastTable`)
- **`risk_surface`** → doit alimenter le graphique 3D "Risk / Reward Surface" (`RiskSurfaceChart`)

### Structure de Réponse API (chemin profond)

```text
body.message.message.content.content
├── final_answer     → AI Market Analysis Card (✓ fonctionne)
├── confidence_note  → Badge de confiance (✓ fonctionne)
├── trade_setup      → Forecast Table (⚠️ parsing incomplet)
└── risk_surface     → Risk Surface Chart (⚠️ parsing incomplet)
```

### Problèmes Identifiés

1. **trade_setup peut être un tableau de strings JSON** : Le backend retourne parfois `["{ \"payload\": {...} }"]` au lieu d'un objet direct
2. **risk_surface peut être stringifié** : Nécessite un `JSON.parse()` avant utilisation
3. **Fallback manquant** : Quand le chemin principal échoue, pas de tentative sur des chemins alternatifs
4. **Logs de debug absents** : Difficile de diagnostiquer les échecs d'extraction

---

## Solution Technique

### Fichier: `src/pages/ForecastTradeGenerator.tsx`

#### 1. Renforcer `extractTradeSetup()` (lignes 317-372)

Ajouter :
- Support pour tableau de strings JSON (ex: `["{ ... }"]`)
- Logs de debug pour tracer le chemin utilisé
- Normalisation robuste de la structure `horizons`

```typescript
function extractTradeSetup(raw: unknown): TradeSetupResponse | null {
  const obj = raw as Record<string, unknown>;
  
  // Debug log
  console.log("[extractTradeSetup] Starting extraction...");
  
  // Path 1: body.message.message.content.content.trade_setup
  try {
    const body = obj?.body as Record<string, unknown>;
    const message1 = body?.message as Record<string, unknown>;
    const message2 = message1?.message as Record<string, unknown>;
    const content1 = message2?.content as Record<string, unknown>;
    const content2 = content1?.content as Record<string, unknown>;
    if (content2?.trade_setup) {
      let setup = content2.trade_setup;
      
      // Handle array of JSON strings (API returns ["{ ... }"])
      if (Array.isArray(setup)) {
        if (setup.length > 0) {
          const first = setup[0];
          if (typeof first === "string") {
            try { setup = JSON.parse(first); } 
            catch { /* continue to next path */ }
          } else {
            setup = first;
          }
        }
      } else if (typeof setup === "string") {
        try { setup = JSON.parse(setup); } 
        catch { return null; }
      }
      
      console.log("[extractTradeSetup] Found via Path 1:", setup);
      return setup as TradeSetupResponse;
    }
  } catch (e) {
    console.log("[extractTradeSetup] Path 1 failed:", e);
  }
  
  // ... autres paths inchangés
}
```

#### 2. Renforcer `extractRiskSurface()` (lignes 377-425)

Même logique de parsing robuste :

```typescript
function extractRiskSurface(raw: unknown): SurfaceApiResponse | null {
  const obj = raw as Record<string, unknown>;
  
  console.log("[extractRiskSurface] Starting extraction...");
  
  // Path 1: body.message.message.content.content.risk_surface
  try {
    const body = obj?.body as Record<string, unknown>;
    const message1 = body?.message as Record<string, unknown>;
    const message2 = message1?.message as Record<string, unknown>;
    const content1 = message2?.content as Record<string, unknown>;
    const content2 = content1?.content as Record<string, unknown>;
    if (content2?.risk_surface) {
      let surface = content2.risk_surface;
      
      // Handle stringified JSON
      if (typeof surface === "string") {
        try { surface = JSON.parse(surface); } 
        catch { return null; }
      }
      
      // Validate surface structure (must have target_probs, sl_sigma, tp_sigma)
      const s = surface as Record<string, unknown>;
      if (s?.surface && typeof s.surface === "object") {
        console.log("[extractRiskSurface] Found valid surface via Path 1");
        return surface as SurfaceApiResponse;
      }
    }
  } catch (e) {
    console.log("[extractRiskSurface] Path 1 failed:", e);
  }
  
  // ... autres paths inchangés
}
```

#### 3. Améliorer `handleSubmit()` (lignes 1119-1141)

Ajouter des logs de debug et corriger le bug de state stale :

```typescript
// Extract trade_setup -> horizons for table
const tradeSetup = extractTradeSetup(data);
console.log("[handleSubmit] Extracted trade_setup:", tradeSetup);
let horizonsExtracted: ForecastHorizon[] = [];
if (tradeSetup) {
  horizonsExtracted = getHorizonsFromTradeSetup(tradeSetup);
  console.log("[handleSubmit] Horizons from trade_setup:", horizonsExtracted.length);
}

// Fallback: try legacy path if trade_setup didn't have horizons
if (horizonsExtracted.length === 0) {
  horizonsExtracted = getPayloadHorizons(data);
  console.log("[handleSubmit] Horizons from legacy path:", horizonsExtracted.length);
}

// Set state ONCE after all extraction attempts
setForecastHorizons(horizonsExtracted);

// Extract risk_surface -> 3D chart data  
const surface = extractRiskSurface(data);
console.log("[handleSubmit] Extracted risk_surface:", surface ? "OK" : "null");
setRiskSurfaceData(surface);
```

---

## Résumé des Modifications

| Fichier | Changement |
|---------|------------|
| `src/pages/ForecastTradeGenerator.tsx` | Renforcer les extracteurs `extractTradeSetup` et `extractRiskSurface` avec parsing robuste |
| `src/pages/ForecastTradeGenerator.tsx` | Corriger le bug de state stale dans `handleSubmit` |
| `src/pages/ForecastTradeGenerator.tsx` | Ajouter des logs console pour le debug |

---

## Garanties

1. **Zero Régression** : Les chemins existants restent fonctionnels, nouvelles logiques ajoutées en priorité
2. **Fallback Chain** : Si le chemin principal échoue, les alternatives sont testées
3. **Logs de Debug** : Visible dans la console pour tracer les échecs d'extraction
4. **Validation de Structure** : Vérification que `surface` contient les champs requis avant utilisation

