

# Audit: Système "Credit Limit Reached"

## Résumé des findings

Le système de crédits a **2 problèmes** qui causent des faux positifs "Credit limit reached" :

### Problème 1 (MAJEUR) — Double credit-check dans `useAIInteractionLogger` bloque le logging APRÈS le travail déjà fait

**Flow actuel problématique :**
1. `tryEngageCredit()` → vérifie et réserve le crédit ✅
2. Le job s'exécute, le backend répond ✅
3. Le trigger `auto_manage_credits` débite le crédit et supprime l'engagement ✅
4. `logInteraction()` est appelé pour logger l'historique...
5. **`checkAndLogInteraction()` L52 re-vérifie les crédits** via `checkCredits()`
6. À ce stade, le crédit a DÉJÀ été consommé par le trigger → `checkCredits()` retourne `false` si c'était le dernier crédit
7. **L'utilisateur voit "Credit limit reached"** alors que l'opération a réussi

C'est un **faux positif UX** : le toast d'erreur s'affiche après une opération réussie, et l'interaction n'est pas loggée dans l'historique.

### Problème 2 (MODÉRÉ) — `checkCredits` utilise un state potentiellement stale

`checkCredits` (L145-182 de `useCreditManager`) lit `credits` depuis le state React local, qui peut être désynchronisé de la base. Le `totalCredits` vient du state, tandis que `engagedCount` est fetché fresh. Si le state n'a pas été rafraîchi (ex: après un `tryEngageCredit` qui a modifié la base), le calcul est faux.

### Problème 3 (MINEUR) — `decrementCredit` jamais appelé mais toujours importé

`useAIInteractionLogger` importe `decrementCredit` dans ses deps de `useCallback` (L87) mais ne l'appelle jamais. C'est un vestige du système pré-atomique. Ça ne cause pas de bug mais c'est du dead code qui crée des re-renders inutiles.

## Correction proposée

### Fix 1 : Supprimer le credit check de `useAIInteractionLogger`

Le `checkAndLogInteraction` ne devrait **PAS** vérifier les crédits. Son rôle est uniquement de logger l'interaction dans `ai_interactions`. La vérification et le débit sont déjà gérés de manière atomique par `tryEngageCredit` + le trigger `auto_manage_credits`.

Supprimer :
- Le `checkCredits` call (L52-59)
- L'import de `decrementCredit` et `checkCredits` depuis `useCreditManager`
- La dépendance dans le `useCallback`

### Fix 2 : Nettoyer le hook

- Supprimer l'import de `useCreditManager`
- Simplifier `checkAndLogInteraction` pour ne faire que le logging
- Garder l'export `checkCredits` sur le return pour backward compat mais le sourcer directement

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/hooks/useAIInteractionLogger.tsx` | EDIT — supprimer credit check, garder uniquement le logging |

## Ce qui ne change PAS

- `tryEngageCredit` — reste la source de vérité pour les crédits (atomique, avant le job)
- `auto_manage_credits` trigger — continue de débiter après completion
- `useCreditManager` — inchangé
- Tous les composants appelant `tryEngageCredit` — inchangés
- Toast "Insufficient Credits" dans chaque composant après `tryEngageCredit.success === false` — inchangé et correct

## Impact

- Suppression des faux positifs "Credit limit reached" qui apparaissent après une opération réussie
- Les interactions seront correctement loggées dans `ai_interactions` même quand c'est le dernier crédit
- Aucune régression : la vraie vérification de crédits reste dans `tryEngageCredit` (avant le job)

