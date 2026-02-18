

# Compacter les lignes du Market News

## Probleme
Les items de news ont trop d'espacement : `p-4` sur chaque ligne, `space-y-3` entre les lignes, `mb-2` sur plusieurs sous-elements, et des images de `w-20 h-20`. Cela cree beaucoup de vide.

## Modifications

**Fichier unique : `src/components/MarketNewsCollapsible.tsx`**

1. **Reduire l'espacement entre les lignes** : `space-y-3` devient `space-y-1.5`
2. **Reduire le padding interne de chaque item** : `p-4` devient `px-3 py-2`
3. **Reduire la taille des images** : `w-20 h-20` devient `w-14 h-14`
4. **Reduire les marges internes du contenu** :
   - `mb-1` sur le titre devient `mb-0.5`
   - `mb-2` sur la meta-ligne devient `mb-1`
   - `mb-2` sur le summary devient `mb-0.5`
   - `gap-3` entre image et contenu devient `gap-2`
5. **Limiter le summary a 1 ligne** au lieu de 2 : `line-clamp-2` devient `line-clamp-1`
6. **Reduire le border-radius** : `rounded-lg` devient `rounded-md`

## Ce qui ne change pas
- La logique de filtrage, categories, recherche
- Le hook `useNewsFeed`
- Le header avec tabs et search bar
- Le `NewsFeedPanel` (side drawer, composant separe)
- Toutes les autres pages

