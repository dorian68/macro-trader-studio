

# Plan : Redirection du toaster de notification vers les nouvelles pages

## Résumé

Les notifications de fin de job doivent rediriger vers les nouvelles pages ForecastMacroLab et ForecastTradeGenerator au lieu des anciennes pages MacroAnalysis et AISetup, tout en permettant aux nouvelles pages de traiter les résultats injectés via `sessionStorage`.

## Analyse de l'existant

### Architecture actuelle du routing

**Fichier** : `src/components/PersistentNotificationProvider.tsx`

| Fonction | Responsabilité |
|----------|----------------|
| `mapFeatureToOriginatingFeature()` (L82-87) | Convertit `AI Trade Setup` → `ai-setup`, `Macro Commentary` → `macro-analysis` |
| `mapFeatureToRoute()` (L98-106) | Convertit `ai-setup` → `/ai-setup`, `macro-analysis` → `/macro-analysis` |
| `navigateToResult()` (L489-503) | Stocke le résultat dans `sessionStorage` et navigue vers la route |

### État actuel des pages

| Page | Gère pendingResult | Type vérifié |
|------|-------------------|--------------|
| AISetup | ✅ Oui (L556-607) | `ai_trade_setup` |
| MacroAnalysis | ✅ Oui (L91-107) | `macro`, `commentary` |
| ForecastMacroLab | ✅ Oui (L127-143) | `macro`, `commentary` |
| ForecastTradeGenerator | ❌ Non | N/A |

## Solution

### Stratégie de migration

Les nouvelles pages doivent **coexister** avec les anciennes. La stratégie est d'ajouter de nouveaux types de features (`macro_lab`, `trade_generator`) qui redirigent vers les nouvelles pages, tout en conservant le comportement existant pour les anciennes features.

### Modifications requises

#### 1. PersistentNotificationProvider.tsx - Étendre le mapping

**Types à ajouter** :

```typescript
// Interface ActiveJob (L11-21)
originatingFeature: 'ai-setup' | 'macro-analysis' | 'reports' | 'macro-lab' | 'trade-generator';

// Interface CompletedJob (L23-33)
originatingFeature: 'ai-setup' | 'macro-analysis' | 'reports' | 'macro-lab' | 'trade-generator';
```

**mapFeatureToOriginatingFeature() - Ajouter les mappings** :

```typescript
const mapFeatureToOriginatingFeature = (feature: string): 'ai-setup' | 'macro-analysis' | 'reports' | 'macro-lab' | 'trade-generator' => {
  const f = feature.toLowerCase();
  // Nouvelles pages Lab priorisées
  if (f.includes('macro_lab') || f.includes('macro lab')) return 'macro-lab';
  if (f.includes('trade_generator') || f.includes('trade generator')) return 'trade-generator';
  // Pages existantes
  if (f === 'ai trade setup' || f === 'ai_trade_setup') return 'ai-setup';
  if (f.includes('macro') || f.includes('commentary')) return 'macro-analysis';
  if (f.includes('report')) return 'reports';
  return 'ai-setup'; // fallback
};
```

**mapFeatureToRoute() - Ajouter les routes** :

```typescript
const mapFeatureToRoute = (feature: 'ai-setup' | 'macro-analysis' | 'reports' | 'macro-lab' | 'trade-generator'): string => {
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

**routeMap dans handler error (L288-292)** :

```typescript
const routeMap = {
  'ai-setup': '/ai-setup',
  'macro-analysis': '/macro-analysis',
  'reports': '/reports',
  'macro-lab': '/forecast-playground/macro-commentary',
  'trade-generator': '/forecast-playground/trade-generator'
};
```

#### 2. GlobalLoadingProvider.tsx - Étendre le navigationMap

**handleViewResult() (L55-60)** :

```typescript
const navigationMap = {
  'ai_trade_setup': '/ai-setup',
  'macro_commentary': '/macro-analysis',
  'reports': '/reports',
  'macro_lab': '/forecast-playground/macro-commentary',
  'trade_generator': '/forecast-playground/trade-generator'
};
```

#### 3. ForecastTradeGenerator.tsx - Ajouter la gestion des pendingResult

Ajouter un `useEffect` pour récupérer et traiter les résultats stockés dans `sessionStorage` :

```typescript
// Après les autres useEffect
useEffect(() => {
  const pendingResult = sessionStorage.getItem('pendingResult');
  if (pendingResult) {
    try {
      const result = JSON.parse(pendingResult);
      // Accepter les résultats de type trade_generator OU ai_trade_setup (compatibilité)
      if (result.type === 'trade_generator' || result.type === 'ai_trade_setup') {
        console.log('📍 [TradeGenerator] Processing pending result:', result);
        
        // Injecter les données dans l'état existant
        if (result.resultData) {
          // Réutiliser la logique de normalisation existante
          const normalized = normalizeN8nResponse(result.resultData);
          if (normalized.tradeSetup) {
            setN8nData(normalized.tradeSetup);
          }
          if (normalized.rawPayload) {
            setRawPayload(normalized.rawPayload);
          }
          // Autres états selon la structure de la réponse...
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

#### 4. ForecastTradeGenerator.tsx - Modifier le createJob pour utiliser le nouveau type

Dans `handleSubmit()`, modifier l'appel à `createJob()` pour utiliser le type `trade_generator` :

```typescript
// Avant (ligne ~1560)
const jobId = await createJob(
  'ai_trade_setup',
  symbol,
  { type: 'RAG', mode: 'trade_generation', instrument: symbol },
  'AI Trade Setup'
);

// Après
const jobId = await createJob(
  'trade_generator',              // ← Nouveau type
  symbol,
  { type: 'trade_generator', mode: 'trade_generation', instrument: symbol },
  'Trade Generator'               // ← Nouveau nom affiché
);
```

#### 5. ForecastMacroLab.tsx - Modifier le createJob pour utiliser le nouveau type

Dans `generateAnalysis()`, modifier l'appel à `createJob()` :

```typescript
// Avant (ligne ~489)
const responseJobId = await createJob(
  'macro_commentary',
  assetSymbol,
  { type: 'macro_commentary', query: queryParams.query, instrument: assetSymbol },
  'Macro Commentary'
);

// Après
const responseJobId = await createJob(
  'macro_lab',                    // ← Nouveau type
  assetSymbol,
  { type: 'macro_lab', query: queryParams.query, instrument: assetSymbol },
  'Macro Lab'                     // ← Nouveau nom affiché
);
```

## Résumé des modifications

| Fichier | Modification | Impact |
|---------|--------------|--------|
| `PersistentNotificationProvider.tsx` | Ajouter types `macro-lab`, `trade-generator` aux interfaces et fonctions de mapping | Routing correct |
| `GlobalLoadingProvider.tsx` | Étendre `navigationMap` avec nouvelles routes | Compatibilité LoadingCards |
| `ForecastTradeGenerator.tsx` | Ajouter `useEffect` pour `pendingResult` + modifier `createJob` type | Réception des résultats |
| `ForecastMacroLab.tsx` | Modifier `createJob` type et feature name | Identification correcte |

## Garanties

- Les anciennes pages (AISetup, MacroAnalysis, Reports) continuent de fonctionner normalement
- Les nouvelles pages peuvent recevoir les résultats via le même mécanisme
- Le type de crédit reste inchangé (`ideas` pour Trade Generator, `queries` pour Macro Lab)
- Aucune modification du backend ou des edge functions

## Section technique

### Flux de données après modification

```text
1. User lance une analyse depuis /forecast-playground/trade-generator
2. ForecastTradeGenerator.handleSubmit()
   ├── createJob('trade_generator', symbol, {...}, 'Trade Generator')
   │   └── INSERT jobs (feature: 'Trade Generator')
   │       └── PersistentNotificationProvider reçoit INSERT
   │           └── mapFeatureToOriginatingFeature('Trade Generator') → 'trade-generator'
   │               └── Toaster de chargement apparaît

3. User navigue ailleurs (ex: /dashboard)

4. Backend termine → UPDATE jobs.status = 'completed'
   └── PersistentNotificationProvider reçoit UPDATE
       └── Toast "Analysis Complete" avec bouton View Result

5. User clique "View Result"
   └── navigateToResult(completedJob)
       ├── sessionStorage.setItem('pendingResult', {...})
       └── navigate('/forecast-playground/trade-generator')

6. ForecastTradeGenerator monte
   └── useEffect détecte pendingResult
       ├── Parse et valide le type
       ├── Injecte les données dans l'état
       └── sessionStorage.removeItem('pendingResult')
```

### Compatibilité descendante

Les jobs existants créés avec les anciens types (`ai_trade_setup`, `macro_commentary`) continueront de router vers les anciennes pages. Seuls les nouveaux jobs créés avec les types `trade_generator` et `macro_lab` iront vers les nouvelles pages.

