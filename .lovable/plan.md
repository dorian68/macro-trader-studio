
# Plan : Correction de l'injection des résultats dans Trade Generator

## Diagnostic

L'implémentation actuelle du `useEffect` pour `pendingResult` dans `ForecastTradeGenerator.tsx` (L1526-1574) est **incomplète** par rapport à la logique de `handleSubmit` (L1700-1765).

### Comparaison avec le flow normal (handleSubmit)

| Extraction | handleSubmit | useEffect pendingResult |
|------------|-------------|------------------------|
| `normalizeN8n` → `setAiSetupResult` | ✅ L1706-1709 | ✅ L1538-1542 |
| `extractTradeSetup` → `getHorizonsFromTradeSetup` → `setForecastHorizons` | ✅ L1713-1739 | ✅ L1544-1551 |
| `extractRiskSurface` → `setRiskSurfaceData` | ✅ L1743-1754 | ✅ L1553-1557 |
| `extractFinalAnswer` → `setFinalAnswer` | ✅ L1757-1760 | ❌ Manquant |
| `extractConfidenceNote` → `setConfidenceNote` | ✅ L1763-1764 | ❌ Manquant |
| `setRawResponse` | ✅ L1693 | ✅ L1559 |
| Mise à jour du `symbol` depuis résultat | N/A (déjà défini) | ❌ Manquant |

### Problème secondaire : useRealtimeJobManager

La fonction `mapTypeToFeature` (L34-50) ne gère pas les nouveaux types `trade_generator` et `macro_lab`. Bien que le fallback ne soit pas utilisé actuellement (car `feature` est passé explicitement), cela crée une incohérence et pourrait causer des problèmes futurs.

## Solution

### 1. Compléter le useEffect pendingResult dans ForecastTradeGenerator.tsx

Modifier le `useEffect` (L1527-1574) pour ajouter les extractions manquantes :

```typescript
useEffect(() => {
  const pendingResult = sessionStorage.getItem('pendingResult');
  if (pendingResult) {
    try {
      const result = JSON.parse(pendingResult);
      if (result.type === 'trade_generator' || result.type === 'ai_trade_setup') {
        console.log('📍 [TradeGenerator] Processing pending result:', result);
        
        if (result.resultData) {
          // ✅ Update symbol from result if available
          const ins = result.instrument || result.resultData?.instrument;
          if (ins) {
            setSymbol(ins);
            console.log('✅ [TradeGenerator] Updated symbol from result:', ins);
          }
          
          // Reuse existing extractors to inject data
          const normalized = normalizeN8n(result.resultData);
          if (normalized && normalized.setups && normalized.setups.length > 0) {
            setAiSetupResult(normalized);
            console.log('✅ [TradeGenerator] Injected AI Setup result:', normalized);
          }
          
          const tradeSetup = extractTradeSetup(result.resultData);
          if (tradeSetup) {
            const horizons = getHorizonsFromTradeSetup(tradeSetup);
            if (horizons.length > 0) {
              setForecastHorizons(horizons);
              console.log('✅ [TradeGenerator] Injected forecast horizons:', horizons);
            }
          }
          
          const surface = extractRiskSurface(result.resultData);
          if (surface) {
            setRiskSurfaceData(surface);
            console.log('✅ [TradeGenerator] Injected risk surface data:', surface);
          }
          
          // ✅ AJOUT: Extract final_answer (AI textual analysis)
          const answer = extractFinalAnswer(result.resultData);
          if (answer) {
            setFinalAnswer(answer);
            console.log('✅ [TradeGenerator] Injected final answer');
          }
          
          // ✅ AJOUT: Extract confidence_note
          const note = extractConfidenceNote(result.resultData);
          if (note) {
            setConfidenceNote(note);
            console.log('✅ [TradeGenerator] Injected confidence note');
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
}, [toast]);
```

### 2. Mettre à jour mapTypeToFeature dans useRealtimeJobManager.tsx

Ajouter les nouveaux types pour la cohérence et la robustesse :

```typescript
const mapTypeToFeature = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'macro_commentary':
    case 'macro-commentary':
    case 'macro_analysis':
      return 'macro_commentary';
    case 'macro_lab':             // ✅ AJOUT
    case 'macro-lab':             // ✅ AJOUT
      return 'macro_lab';         // ✅ AJOUT
    case 'trade_setup':
    case 'tradesetup':
    case 'ai_trade_setup':
      return 'ai_trade_setup';
    case 'trade_generator':       // ✅ AJOUT
    case 'trade-generator':       // ✅ AJOUT
      return 'trade_generator';   // ✅ AJOUT
    case 'reports':
    case 'report':
      return 'report';
    default:
      return 'macro_commentary'; // Default fallback
  }
};
```

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/pages/ForecastTradeGenerator.tsx` | Compléter le useEffect pendingResult avec extractFinalAnswer, extractConfidenceNote, et mise à jour du symbol |
| `src/hooks/useRealtimeJobManager.tsx` | Ajouter trade_generator et macro_lab dans mapTypeToFeature |

## Garanties de non-régression

- Aucune modification de la logique de `handleSubmit` existante
- Aucune modification du `PersistentNotificationProvider`
- Les pages existantes (AISetup, MacroAnalysis, Reports) ne sont pas impactées
- Le mécanisme de sessionStorage reste identique
- La logique de routing du toaster reste inchangée
