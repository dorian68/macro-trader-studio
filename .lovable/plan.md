

# Plan : Adaptation des toasters de fin de job vers les nouvelles pages

## Résumé

Adapter la logique existante de redirection des toasters de fin de job pour cibler les nouvelles pages fonctionnelles (Macro Labs et Trade Generator) tout en conservant la compatibilité descendante avec les anciennes pages.

## Analyse de l'existant

### Architecture actuelle du routing

| Fichier | Fonction | Rôle |
|---------|----------|------|
| `PersistentNotificationProvider.tsx` | `mapFeatureToOriginatingFeature()` L82-87 | Convertit le nom de feature vers une clé interne |
| `PersistentNotificationProvider.tsx` | `mapFeatureToRoute()` L99-106 | Convertit la clé interne vers une route |
| `PersistentNotificationProvider.tsx` | `navigateToResult()` L489-503 | Stocke le résultat dans sessionStorage et navigue |
| `GlobalLoadingProvider.tsx` | `navigationMap` L55-59 | Mapping pour les LoadingCards |

### État actuel des types

```typescript
// Actuellement supportés :
originatingFeature: 'ai-setup' | 'macro-analysis' | 'reports'
```

### État actuel des pages cibles

| Page | Gère pendingResult | Type vérifié |
|------|-------------------|--------------|
| AISetup | ✅ Oui | `ai_trade_setup` |
| MacroAnalysis | ✅ Oui | `macro`, `commentary` |
| ForecastMacroLab | ✅ Oui (L128-143) | `macro`, `commentary` |
| ForecastTradeGenerator | ❌ Non | N/A |

## Solution : Stratégie d'adaptation ciblée

L'approche consiste à **ajouter** de nouveaux types de features (`macro_lab`, `trade_generator`) qui redirigent vers les nouvelles pages, tout en **conservant intégralement** le comportement existant pour les anciennes features.

### Modifications fichier par fichier

---

#### 1. PersistentNotificationProvider.tsx

**A. Étendre les interfaces (L11-21 et L23-33)**

Ajouter `'macro-lab' | 'trade-generator'` aux types `originatingFeature` :

```typescript
interface ActiveJob {
  // ... existing fields ...
  originatingFeature: 'ai-setup' | 'macro-analysis' | 'reports' | 'macro-lab' | 'trade-generator';
}

interface CompletedJob {
  // ... existing fields ...
  originatingFeature: 'ai-setup' | 'macro-analysis' | 'reports' | 'macro-lab' | 'trade-generator';
}
```

**B. Étendre mapFeatureToOriginatingFeature() (L82-87)**

Ajouter les nouveaux mappings en priorité (avant les anciens) :

```typescript
const mapFeatureToOriginatingFeature = (feature: string): OriginatingFeature => {
  const f = feature.toLowerCase();
  // Nouvelles pages Lab (priorité haute)
  if (f.includes('macro_lab') || f.includes('macro lab')) return 'macro-lab';
  if (f.includes('trade_generator') || f.includes('trade generator')) return 'trade-generator';
  // Pages existantes (inchangé)
  if (f === 'ai trade setup' || f === 'ai_trade_setup') return 'ai-setup';
  if (f.includes('macro') || f.includes('commentary')) return 'macro-analysis';
  if (f.includes('report')) return 'reports';
  return 'ai-setup'; // fallback
};
```

**C. Étendre mapFeatureToRoute() (L99-106)**

Ajouter les nouvelles routes :

```typescript
const mapFeatureToRoute = (feature: OriginatingFeature): string => {
  switch (feature) {
    case 'ai-setup': return '/ai-setup';
    case 'macro-analysis': return '/macro-analysis';
    case 'reports': return '/reports';
    case 'macro-lab': return '/forecast-playground/macro-commentary';
    case 'trade-generator': return '/forecast-playground/trade-generator';
    default: return '/ai-setup';
  }
};
```

**D. Étendre routeMap dans handler error (L288-292)**

```typescript
const routeMap = {
  'ai-setup': '/ai-setup',
  'macro-analysis': '/macro-analysis',
  'reports': '/reports',
  'macro-lab': '/forecast-playground/macro-commentary',
  'trade-generator': '/forecast-playground/trade-generator'
};
```

**E. Étendre extractFeature typeMap (L140-147 et L222-228)**

Dans les deux fonctions extractFeature, ajouter :

```typescript
const typeMap: Record<string, string> = {
  'ai_trade_setup': 'AI Trade Setup',
  'macro_commentary': 'Macro Commentary',
  'report': 'Report',
  'reports': 'Report',
  'macro_lab': 'Macro Lab',           // NOUVEAU
  'trade_generator': 'Trade Generator' // NOUVEAU
};
```

---

#### 2. GlobalLoadingProvider.tsx

**Étendre navigationMap (L55-59)**

```typescript
const navigationMap = {
  'ai_trade_setup': '/ai-setup',
  'macro_commentary': '/macro-analysis',
  'reports': '/reports',
  'macro_lab': '/forecast-playground/macro-commentary',
  'trade_generator': '/forecast-playground/trade-generator'
};
```

---

#### 3. ForecastTradeGenerator.tsx

**A. Ajouter useEffect pour pendingResult (après L70)**

```typescript
useEffect(() => {
  const pendingResult = sessionStorage.getItem('pendingResult');
  if (pendingResult) {
    try {
      const result = JSON.parse(pendingResult);
      // Accepter les résultats de type trade_generator OU ai_trade_setup (compatibilité)
      if (result.type === 'trade_generator' || result.type === 'ai_trade_setup') {
        console.log('📍 [TradeGenerator] Processing pending result:', result);
        
        if (result.resultData) {
          // Réutiliser les extractors existants pour injecter les données
          const normalized = normalizeN8n(result.resultData);
          if (normalized && normalized.setups?.length > 0) {
            setAiSetupResult(normalized);
          }
          
          const tradeSetup = extractTradeSetup(result.resultData);
          if (tradeSetup) {
            const horizons = getHorizonsFromTradeSetup(tradeSetup);
            if (horizons.length > 0) {
              setForecastHorizons(horizons);
            }
          }
          
          const surface = extractRiskSurface(result.resultData);
          if (surface) {
            setSurfaceData(surface);
          }
          
          setRawResponse(result.resultData);
        }
        
        sessionStorage.removeItem('pendingResult');
        
        toast({
          title: "Trade Setup Loaded",
          description: "Your trade setup has been loaded from background analysis."
        });
      }
    } catch (error) {
      console.error('❌ [TradeGenerator] Error parsing pending result:', error);
      sessionStorage.removeItem('pendingResult');
    }
  }
}, []);
```

**B. Modifier createJob pour utiliser le nouveau type (L1558-1568)**

```typescript
// AVANT
jobId = await createJob(
  'ai_trade_setup',
  symbol,
  { type: 'RAG', mode: 'trade_generation', instrument: symbol, horizons: parsedHorizons },
  'AI Trade Setup'
);

// APRÈS
jobId = await createJob(
  'trade_generator',              // ← Nouveau type
  symbol,
  { type: 'trade_generator', mode: 'trade_generation', instrument: symbol, horizons: parsedHorizons },
  'Trade Generator'               // ← Nouveau nom affiché
);
```

---

#### 4. ForecastMacroLab.tsx

**Modifier createJob pour utiliser le nouveau type (L491)**

```typescript
// AVANT
responseJobId = await createJob("macro_analysis", selectedAsset.symbol, {}, "Macro Commentary");

// APRÈS
responseJobId = await createJob("macro_lab", selectedAsset.symbol, {}, "Macro Lab");
```

**Étendre le check de pendingResult (L133)**

```typescript
// AVANT
if (result.type.includes("macro") || result.type.includes("commentary")) {

// APRÈS
if (result.type.includes("macro") || result.type.includes("commentary") || result.type === "macro_lab") {
```

---

## Tableau récapitulatif des modifications

| Fichier | Ligne(s) | Action | Impact |
|---------|----------|--------|--------|
| `PersistentNotificationProvider.tsx` | L18, L30 | Étendre types | Typage correct |
| `PersistentNotificationProvider.tsx` | L82-87 | Ajouter mappings feature→clé | Detection nouveaux types |
| `PersistentNotificationProvider.tsx` | L99-106 | Ajouter routes | Navigation correcte |
| `PersistentNotificationProvider.tsx` | L140-147, L222-228 | Ajouter typeMap entries | Extraction feature name |
| `PersistentNotificationProvider.tsx` | L288-292 | Ajouter routeMap entries | Retry button route |
| `GlobalLoadingProvider.tsx` | L55-59 | Étendre navigationMap | LoadingCards compat |
| `ForecastTradeGenerator.tsx` | ~L80 | Ajouter useEffect pendingResult | Réception résultats |
| `ForecastTradeGenerator.tsx` | L1558-1568 | Modifier createJob type/name | Identification job |
| `ForecastMacroLab.tsx` | L491 | Modifier createJob type/name | Identification job |
| `ForecastMacroLab.tsx` | L133 | Étendre check pendingResult | Accept macro_lab type |

## Garanties de non-régression

- Les anciennes pages (AISetup, MacroAnalysis, Reports) continuent de fonctionner normalement
- Les jobs existants créés avec les anciens types (`ai_trade_setup`, `macro_commentary`) continuent de router vers les anciennes pages
- Le type de crédit reste inchangé (`ideas` pour Trade Generator, `queries` pour Macro Lab)
- Aucune modification du backend, des Edge Functions, ou de Supabase Realtime
- Le mécanisme de stockage/récupération via sessionStorage est conservé intégralement

## Section technique

### Flux de données après modification

```text
1. User lance une analyse depuis /forecast-playground/trade-generator
2. ForecastTradeGenerator.handleSubmit()
   ├── createJob('trade_generator', symbol, {...}, 'Trade Generator')
   │   └── INSERT jobs (type: 'trade_generator', feature: 'Trade Generator')
   │       └── PersistentNotificationProvider reçoit INSERT
   │           └── mapFeatureToOriginatingFeature('Trade Generator') → 'trade-generator'
   │               └── Toaster de chargement apparaît

3. User navigue ailleurs (ex: /dashboard)

4. Backend termine → UPDATE jobs.status = 'completed'
   └── PersistentNotificationProvider reçoit UPDATE
       └── Toast "Analysis Complete" avec bouton View Result

5. User clique "View Result"
   └── navigateToResult(completedJob)
       ├── sessionStorage.setItem('pendingResult', {type: 'trade_generator', ...})
       └── navigate('/forecast-playground/trade-generator')

6. ForecastTradeGenerator monte
   └── useEffect détecte pendingResult
       ├── Parse et valide le type (trade_generator OU ai_trade_setup)
       ├── Injecte les données via extractors existants
       └── sessionStorage.removeItem('pendingResult')
```

### Compatibilité descendante

| Type de job | Route cible |
|-------------|-------------|
| `ai_trade_setup` | `/ai-setup` (inchangé) |
| `macro_commentary` | `/macro-analysis` (inchangé) |
| `trade_generator` | `/forecast-playground/trade-generator` (nouveau) |
| `macro_lab` | `/forecast-playground/macro-commentary` (nouveau) |

