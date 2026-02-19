

## Reduire l'espace entre le graphique et les 3 boutons sur mobile

### Diagnostic

Le `gap-2` (0.5rem / 8px) sur le conteneur flex principal (ligne 258) cree un espacement entre la zone du graphique et les 3 cartes. De plus, le graphique dans son conteneur `flex-1` ne remplit pas necessairement tout l'espace disponible, laissant du vide en bas.

### Solution

Reduire le `gap` sur mobile a `gap-1` (4px) tout en gardant `gap-2` sur desktop via `md:gap-2`.

### Modification

**`src/pages/TradingDashboard.tsx` (ligne 258)**

- Avant : `h-full flex flex-col gap-2`
- Apres : `h-full flex flex-col gap-1 md:gap-2`

### Ce qui ne change pas

- Le layout desktop 2 colonnes reste identique (gap-2 preservé via `md:gap-2`)
- Le graphique, les boutons, le carousel, le BubbleSystem ne sont pas touches
- Aucune logique metier modifiee

