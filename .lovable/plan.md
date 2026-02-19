

## Unifier l'affichage mobile et tablette du Dashboard

L'objectif est de supprimer les overrides specifiques au mobile pour que les ecrans < 768px affichent exactement le meme rendu que la tablette (>= 768px), comme dans le screenshot fourni.

### Modifications dans `src/pages/TradingDashboard.tsx`

1. **Ne plus passer `compact={isMobile}`** (ligne 267) : remplacer par `compact={false}` pour que le header complet (titre, search bar, chips) s'affiche sur mobile comme sur tablette.

2. **Adapter le conteneur principal** (ligne 258) : remplacer `h-[calc(100dvh-3.5rem)] overflow-hidden flex flex-col gap-0.5 md:h-full md:gap-2` par un style uniforme sans distinction mobile/desktop (utiliser `gap-2` et `h-full` partout).

3. **Agrandir les cartes de features mobile** (lignes 298-340) : actuellement les 3 cartes (AI Trade Setup, Macro Commentary, Reports) utilisent du texte ultra-compact (`text-[10px]`, padding `p-1.5`). Les mettre au format tablette : padding `p-3`, icones `h-5 w-5`, texte `text-xs font-semibold`, hauteur ~60px pour correspondre au screenshot.

4. **Supprimer les sections "below the fold" mobile-only** (lignes 343-348) : `AssetInfoCard` et `MarketNewsCollapsible` avec `md:hidden` sont redondantes dans le nouveau layout unifie car le carousel desktop/tablette les integre deja.

### Modifications dans `src/components/CandlestickChart.tsx`

1. **Afficher le titre sur mobile** (ligne 197) : remplacer `hidden md:flex` par `flex` pour que "Trading Dashboard" soit visible sur tous les ecrans.

2. **Supprimer les boutons mobile-only** (lignes 240-263) : les boutons Search toggle et Fullscreen marques `md:hidden` ne sont plus necessaires puisque la barre de recherche et les chips sont toujours visibles.

3. **Unifier la visibilite de la search bar** (lignes 298-301) : remplacer `showMobileSearch ? "block" : "hidden md:block"` par `block` (toujours visible).

4. **Unifier la visibilite des chips** (lignes 315-317) : meme changement — supprimer la logique conditionnelle `showMobileSearch` et afficher toujours.

5. **Afficher le footer "Powered by"** (ligne 434) : remplacer `hidden md:block` par `block` pour l'afficher partout.

### Ce qui ne change pas

- Le layout desktop 2 colonnes (chart + DashboardColumnCarousel) reste identique
- Le breakpoint `lg:` pour le carousel reste inchange
- Le BubbleSystem, JobStatusCard, et le fullscreen dialog ne sont pas affectes
- Le WebSocket et la logique de prix restent inchanges
- La navbar et le Layout wrapper ne sont pas modifies

### Section technique

Fichiers modifies :
- `src/pages/TradingDashboard.tsx` : ~15 lignes modifiees (compact prop, conteneur principal, cartes features, suppression sections mobile-only)
- `src/components/CandlestickChart.tsx` : ~10 lignes modifiees (visibilite titre, search, chips, suppression boutons mobile-only)

Risque de regression : faible. Les changements ne touchent que des classes CSS conditionnelles et un prop boolean. Aucune logique metier n'est modifiee.

