

## Suppression de la bulle ephemere (MiniProgressBubble)

### Ce qui sera modifie

**1. `src/components/PersistentToast.tsx`**
- Supprimer le rendu conditionnel du `MiniProgressBubble` (lignes ~213-221)
- Supprimer le state `showMiniBubble` et le `useEffect` associe qui le declenche
- Supprimer l'import de `MiniProgressBubble`

**2. Aucune suppression de fichier** - Le fichier `MiniProgressBubble.tsx` sera conserve au cas ou il serait reutilise ailleurs, mais il ne sera plus appele.

### Ce qui ne change pas
- La carte de suivi des jobs (PersistentToast) reste fonctionnelle
- Le badge "AI processing" en haut (DiscreetJobStatus) reste
- Les toasts d'erreur/succes (shadcn) restent
- Les FlashMessages restent
- Aucune regression sur le tracking des jobs ou la navigation vers les resultats

