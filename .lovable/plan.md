# Plan : Redirection du toaster de notification vers les nouvelles pages

## Statut : ✅ IMPLÉMENTÉ

Les modifications ont été effectuées avec succès le 2026-02-03.

## Résumé

Les notifications de fin de job redirigent désormais vers les nouvelles pages ForecastMacroLab (`/forecast-playground/macro-commentary`) et ForecastTradeGenerator (`/forecast-playground/trade-generator`) lorsque les jobs sont créés avec les nouveaux types `macro_lab` et `trade_generator`.

## Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `PersistentNotificationProvider.tsx` | Types `macro-lab`, `trade-generator` ajoutés aux interfaces et fonctions de mapping |
| `GlobalLoadingProvider.tsx` | `navigationMap` étendu avec nouvelles routes |
| `ForecastTradeGenerator.tsx` | `useEffect` pour `pendingResult` ajouté + `createJob` utilise `trade_generator` |
| `ForecastMacroLab.tsx` | `createJob` utilise `macro_lab` + `pendingResult` accepte le nouveau type |

## Compatibilité descendante

- Les jobs existants créés avec `ai_trade_setup` continuent de router vers `/ai-setup`
- Les jobs existants créés avec `macro_commentary` continuent de router vers `/macro-analysis`
- Seuls les nouveaux jobs utilisent les nouvelles routes
