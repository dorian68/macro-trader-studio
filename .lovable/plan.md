
# Mobile Dashboard -- TradingView "Full Screen" par defaut + Cards compactes

## Objectif

Sur mobile uniquement (< 768px), transformer le dashboard pour que :
1. Le chart TradingView occupe tout l'espace vertical disponible (comme le mode fullscreen actuel mais inline, pas dans un Dialog)
2. Les 3 cards features (AI Trade Setup, Macro Commentary, Reports) s'affichent en ligne compacte juste sous le chart
3. Tout tient dans le viewport sans scroll (above the fold)
4. Market News est place en dessous, accessible via scroll

## Strategie technique

Le mode fullscreen actuel utilise `compact={true}` sur CandlestickChart (pas de searchbar/chips, pas de titre) et prend `100dvh`. On veut reproduire ce comportement inline sur mobile en utilisant un layout flex qui remplit le viewport.

### Changements dans `src/pages/TradingDashboard.tsx`

**1. Verrouiller le viewport sur mobile aussi**

Le conteneur principal (ligne 263) passe de `md:h-full md:overflow-hidden md:flex md:flex-col` a inclure le mobile egalement, mais avec une approche specifique :
- Sur mobile : `h-[calc(100dvh-3.5rem)] overflow-hidden flex flex-col`
- Cela verrouille la page au viewport exactement comme le fullscreen Dialog, mais inline avec la navbar

**2. Chart = flex-1 (prend tout l'espace restant)**

Le conteneur du chart (ligne 267) remplace les hauteurs fixes mobile (`min-h-[320px] h-[clamp(320px,50vh,520px)]`) par `flex-1 min-h-0` sur mobile. Cela force le chart a remplir tout l'espace entre la navbar et les cards.
- Mobile : `flex-1 min-h-0 overflow-hidden`
- Les hauteurs desktop/tablet restent inchangees via `md:h-full md:min-h-[500px]`

**3. CandlestickChart en mode compact sur mobile**

Passer `compact={true}` au CandlestickChart principal sur mobile pour supprimer le titre, la searchbar et les chips (exactement comme le fullscreen actuel). On va conditionner cela via le hook `useIsMobile` deja present dans le projet.

**4. Cards features ultra-compactes en ligne**

Les 3 cards (lignes 301-355) sont actuellement des cards avec padding `p-4`, descriptions, et `ArrowRight`. Sur mobile, les reduire a des boutons compacts :
- Grille forcee en 3 colonnes : `grid-cols-3`
- Padding reduit a `p-2`
- Masquer la description (`<p>`) sur mobile
- Masquer le `ArrowRight` sur mobile
- Icone + titre uniquement, empiles verticalement, texte `text-[11px]`
- Le conteneur utilise `shrink-0` pour ne pas etre compresse par le flex

**5. Masquer AssetInfoCard et MarketNewsCollapsible du viewport mobile**

- `AssetInfoCard` (ligne 359-362) : deja `md:hidden`, on le sort du conteneur flex verrouille pour qu'il soit apres, accessible via scroll
- `MarketNewsCollapsible` (ligne 365) : idem, place apres le conteneur verrouille

### Structure mobile resultante

```text
+------------------------------------------+
| NAVBAR (3.5rem fixe)                     |
+------------------------------------------+
|                                          |
|         TRADINGVIEW CHART                |
|      (flex-1, compact header)            |
|    [EUR/USD] [Live] [4H] [🔍] [⤢]      |
|                                          |
|                                          |
+------------------------------------------+
| [⚡Setup] [🌐Macro] [📄Reports]         |  <- shrink-0, ~48px
+------------------------------------------+
--- fin du viewport, scroll pour voir : ---
| Market News                              |
| Asset Info                               |
+------------------------------------------+
```

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/TradingDashboard.tsx` | Layout flex viewport-locked sur mobile, chart flex-1, compact prop conditionnel, cards reduites, news hors viewport |

## Ce qui ne change pas

- Desktop (`lg+`) : aucun changement
- Tablet (`md`) : aucun changement
- Logique metier, API, data, routing : zero changement
- Le mode fullscreen Dialog reste disponible via le bouton
- CandlestickChart.tsx : aucun changement (la prop `compact` existe deja)
