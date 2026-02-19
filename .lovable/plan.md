
## Suppression de la bulle ephemere "MiniProgressBubble"

La petite carte entouree en vert dans le screenshot est le composant `MiniProgressBubble` qui affiche "AI Trade Setup - Initializing market data collection..." en bas a droite quand le toast principal est minimise. Elle est redondante avec le `PersistentToast` principal et le badge `DiscreetJobStatus`.

### Modifications dans `src/components/PersistentToast.tsx`

1. **Supprimer l'import** de `MiniProgressBubble` (ligne 9)
2. **Supprimer le state** `showMiniBubble` (lignes 25-29)
3. **Supprimer les 3 useEffect** qui declenchent la bulle :
   - Lignes 72-76 : progression des jobs actifs
   - Lignes 78-83 : flash messages
   - Lignes 85-90 : jobs completes
4. **Supprimer le rendu JSX** du `MiniProgressBubble` (lignes 213-221)

### Ce qui ne change pas

- Le toast principal (bulle ronde minimisee + carte expandable) reste intact
- Le badge "AI processing" en haut au centre (`DiscreetJobStatus`) reste
- Les toasts d'erreur/succes shadcn restent
- Les flash messages restent
- Le hover preview sur la bulle minimisee reste fonctionnel

### Analyse de risque

Les 3 `useEffect` supprimes ne font que setter `showMiniBubble` - aucun autre effet de bord. Le state `showMiniBubble` n'est lu que dans le rendu JSX supprime. Suppression sans risque de regression.
