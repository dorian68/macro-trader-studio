

# Fix : Bouton "View" du PersistentToast toujours visible

## Diagnostic

Deux boutons "View" existent dans le PersistentToast :

1. **Single view** (ligne 447) : `bg-primary text-primary-foreground` = fond blanc + texte noir. Le probleme : dans certains cas de rendu (transitions, re-render rapide), le fond `bg-primary` ne s'applique pas immediatement, laissant le texte noir (`text-primary-foreground = 0 0% 0%`) sur fond sombre = invisible. Le hover restore le fond blanc.

2. **List view** (ligne 177) : `variant="ghost"` + `text-primary`. Le ghost n'a aucune couleur de fond par defaut, et `text-primary` est blanc (visible). Celui-ci est moins problematique.

3. **Boutons X de dismiss** (lignes 186, 434, 469) : utilisent `opacity-50 hover:opacity-100`, ce qui les rend tres discrets sur fond sombre.

## Correctifs (patch minimal, zero regression)

### `src/components/PersistentToast.tsx`

**Bouton "View Result" en single view (ligne 447)** :
- Remplacer `bg-primary hover:bg-primary/90 text-primary-foreground` par un style explicite haute visibilite qui ne depend pas de la cascade CSS
- Utiliser des couleurs inline-safe : `bg-white text-black hover:bg-white/90` (equivalent semantique mais plus deterministe que les tokens)

**Boutons X de dismiss (lignes 186, 434, 469)** :
- Remplacer `opacity-50 hover:opacity-100` par `opacity-70 hover:opacity-100` pour une meilleure visibilite par defaut tout en gardant l'effet hover

**Bouton "View" en list view (ligne 177)** :
- Ajouter un fond subtil permanent : `bg-white/[0.08]` pour le differencier du fond et garantir sa visibilite meme sans hover

### Ce qui ne change pas

- Structure JSX, logique de navigation, dismiss, state management
- Tous les autres composants
- Comportement UX identique, juste meilleure visibilite

### Resultat

- Le bouton "View Result" est toujours clairement visible (fond blanc, texte noir, garanti)
- Les boutons X sont plus visibles par defaut (opacity 70% au lieu de 50%)
- Le bouton "View" en liste a un fond subtil permanent
