

# Plan : Correction de l'erreur bloquante sur Macro Labs et Trade Generator

## Diagnostic

L'erreur est une violation de contrainte de base de données :
```
"new row for relation \"jobs\" violates check constraint \"jobs_feature_check\""
```

### Contrainte actuelle de la base de données
```sql
CHECK ((feature = ANY (ARRAY['AI Trade Setup', 'Macro Commentary', 'Report'])))
```

### Valeurs utilisées dans le code récent
| Page | Valeur utilisée | Statut |
|------|-----------------|--------|
| ForecastMacroLab | `'Macro Lab'` | ❌ Rejetée par DB |
| ForecastTradeGenerator | `'Trade Generator'` | ❌ Rejetée par DB |

## Solution : Réutiliser les valeurs feature existantes

La stratégie consiste à utiliser les valeurs `feature` acceptées par la DB (`'Macro Commentary'`, `'AI Trade Setup'`) tout en stockant le **type réel** dans `request_payload.type` pour permettre au routing de différencier les nouvelles pages des anciennes.

### Logique de routing adaptée

Le `PersistentNotificationProvider` utilisera `request_payload.type` (quand disponible) plutôt que `feature` pour déterminer la destination :

| request_payload.type | Route cible |
|----------------------|-------------|
| `macro_lab` | `/forecast-playground/macro-commentary` |
| `trade_generator` | `/forecast-playground/trade-generator` |
| (absent ou autre) | Comportement existant basé sur `feature` |

---

## Modifications fichier par fichier

### 1. ForecastMacroLab.tsx (L491)

Revenir à `'Macro Commentary'` pour la valeur `feature` tout en gardant `macro_lab` dans le type :

```typescript
// AVANT (bloqué par DB)
responseJobId = await createJob("macro_lab", selectedAsset.symbol, {}, "Macro Lab");

// APRÈS (compatible DB)
responseJobId = await createJob(
  "macro_lab",                    // type interne (stocké dans request_payload.type)
  selectedAsset.symbol,
  { type: "macro_lab" },          // ✅ Type explicite pour routing
  "Macro Commentary"              // ✅ feature acceptée par DB
);
```

### 2. ForecastTradeGenerator.tsx (L1629-1639)

Revenir à `'AI Trade Setup'` pour la valeur `feature` tout en gardant `trade_generator` dans le type :

```typescript
// AVANT (bloqué par DB)
jobId = await createJob(
  'trade_generator',
  symbol,
  { type: 'trade_generator', mode: 'trade_generation', instrument: symbol, horizons: parsedHorizons },
  'Trade Generator'
);

// APRÈS (compatible DB)
jobId = await createJob(
  'trade_generator',              // type interne
  symbol,
  { 
    type: 'trade_generator',      // ✅ Type explicite pour routing
    mode: 'trade_generation', 
    instrument: symbol, 
    horizons: parsedHorizons 
  },
  'AI Trade Setup'                // ✅ feature acceptée par DB
);
```

### 3. PersistentNotificationProvider.tsx - Améliorer mapFeatureToOriginatingFeature

Modifier la fonction pour **d'abord vérifier `request_payload.type`** si disponible, puis fallback sur `feature` :

```typescript
// Nouvelle fonction helper (à ajouter avant mapFeatureToOriginatingFeature)
const getEffectiveType = (job: any): string => {
  // Priority 1: Explicit type in request_payload
  if (job.request_payload?.type) {
    return job.request_payload.type;
  }
  // Priority 2: Feature field
  return job.feature || '';
};

// Modifier mapFeatureToOriginatingFeature pour accepter le job complet
const mapJobToOriginatingFeature = (job: any): OriginatingFeature => {
  const effectiveType = getEffectiveType(job).toLowerCase();
  
  // New Lab pages (check request_payload.type first)
  if (effectiveType === 'macro_lab') return 'macro-lab';
  if (effectiveType === 'trade_generator') return 'trade-generator';
  
  // Legacy pages (fallback to feature-based routing)
  const f = (job.feature || '').toLowerCase();
  if (f === 'ai trade setup' || f === 'ai_trade_setup') return 'ai-setup';
  if (f.includes('macro') || f.includes('commentary')) return 'macro-analysis';
  if (f.includes('report')) return 'reports';
  
  return 'ai-setup'; // fallback
};
```

### 4. Mettre à jour les appels à mapFeatureToOriginatingFeature

Dans le `useEffect` qui écoute les événements Realtime (INSERT et UPDATE handlers), passer l'objet job complet au lieu de juste `feature` :

```typescript
// Dans le handler INSERT (L158-175)
originatingFeature: mapJobToOriginatingFeature(newJob),

// Dans le handler UPDATE (L239-275)
originatingFeature: mapJobToOriginatingFeature(updatedJob),
```

### 5. ForecastMacroLab.tsx - Corriger le pendingResult check (L133)

S'assurer que le check accepte le type `macro_lab` :

```typescript
// AVANT
if (result.type.includes("macro") || result.type.includes("commentary") || result.type === "macro_lab") {

// APRÈS (déjà correct, vérifier seulement)
if (result.type === "macro_lab" || result.type.includes("macro") || result.type.includes("commentary")) {
```

### 6. ForecastTradeGenerator.tsx - Vérifier le pendingResult check (L1531)

S'assurer que le check accepte le type `trade_generator` :

```typescript
// AVANT (déjà correct)
if (result.type === 'trade_generator' || result.type === 'ai_trade_setup') {
```

---

## Tableau récapitulatif

| Fichier | Ligne(s) | Modification | Impact |
|---------|----------|--------------|--------|
| `ForecastMacroLab.tsx` | L491 | Changer feature `'Macro Lab'` → `'Macro Commentary'` + garder type | Fix DB constraint |
| `ForecastTradeGenerator.tsx` | L1638 | Changer feature `'Trade Generator'` → `'AI Trade Setup'` + garder type | Fix DB constraint |
| `PersistentNotificationProvider.tsx` | L82-95 | Créer `mapJobToOriginatingFeature` qui vérifie `request_payload.type` d'abord | Routing vers nouvelles pages |
| `PersistentNotificationProvider.tsx` | L158, L239 | Utiliser `mapJobToOriginatingFeature(job)` au lieu de `mapFeatureToOriginatingFeature(feature)` | Routing correct |

---

## Garanties de non-régression

- Les valeurs `feature` en DB restent identiques (`'AI Trade Setup'`, `'Macro Commentary'`, `'Report'`)
- Les anciennes pages (AISetup, MacroAnalysis) continuent de fonctionner normalement
- Le monitoring admin affiche les bonnes statistiques (basé sur `feature`)
- Le type réel est préservé dans `request_payload.type` pour le routing
- Aucune modification de schéma de base de données nécessaire

---

## Flux de données après correction

```text
1. User lance une analyse depuis /forecast-playground/trade-generator
   
2. ForecastTradeGenerator.handleSubmit()
   └── createJob('trade_generator', symbol, {type: 'trade_generator', ...}, 'AI Trade Setup')
       └── INSERT jobs (feature: 'AI Trade Setup', request_payload: {type: 'trade_generator', ...})
           ✅ DB constraint satisfied!
       
3. PersistentNotificationProvider reçoit INSERT
   └── mapJobToOriginatingFeature(job)
       └── job.request_payload.type === 'trade_generator'
           └── return 'trade-generator'
   └── Toaster de chargement apparaît

4. Backend termine → UPDATE jobs.status = 'completed'
   
5. User clique "View Result"
   └── navigateToResult(completedJob)
       ├── sessionStorage.setItem('pendingResult', {type: 'trade_generator', ...})
       └── navigate('/forecast-playground/trade-generator')  ✅ Correct route!
```

