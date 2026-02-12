

# Fix Mobile TradingView -- Chart Priority + Fullscreen + Compact Header

## Probleme actuel

Sur mobile, le header du chart CandlestickChart consomme enormement de hauteur verticale avec **3 rangees** :
1. Titre "Trading Dashboard" + controls (instrument badge, connection, timeframe)
2. HybridSearchBar (barre de recherche AI complete)
3. Popular Assets chips (17 boutons horizontaux scrollables)

Le chart n'a aucune hauteur minimale garantie sur mobile et se retrouve ecrase. Le conteneur dans TradingDashboard.tsx n'a pas de protection anti-shrink pour les ecrans < 768px.

## Modifications par fichier

### 1. `src/components/CandlestickChart.tsx` -- Compacter le header mobile

**Row 1 (Titre + Controls)** :
- Sur mobile (`< 768px`), cacher le titre "Trading Dashboard" et l'icone Activity. Garder uniquement la ligne de controls (instrument badge + connection + timeframe) qui est l'info essentielle.
- Classes : wrapper du titre `hidden md:flex` au lieu de `flex`
- Les controls passent en `w-full` sur mobile pour occuper toute la largeur

**Row 2 (HybridSearchBar)** :
- Sur mobile, cacher la searchbar par defaut et la rendre accessible via un bouton Search (icone loupe). Au clic, la searchbar s'affiche/se cache (toggle simple avec un state local).
- Ajouter un bouton `<button>` avec icone `Search` visible uniquement sur mobile (`md:hidden`), et wrapper la searchbar avec `hidden md:block` + un state `showMobileSearch` qui override sur mobile.

**Row 3 (Asset Chips)** :
- Sur mobile, cacher les chips par defaut. Les regrouper avec le toggle search ci-dessus : quand la searchbar est ouverte, les chips apparaissent aussi.
- Wrapper avec `hidden md:block` + state `showMobileSearch`

**Bouton Fullscreen** :
- Ajouter un bouton `Maximize2` (icone lucide) dans la ligne de controls mobile, visible uniquement `md:hidden`
- Au clic, appelle une nouvelle prop `onFullscreenToggle` passee depuis TradingDashboard

**Resultat** : sur mobile, le header ne contient qu'une seule ligne (instrument + live + timeframe + search toggle + fullscreen), liberant ~150px de hauteur pour le chart.

### 2. `src/pages/TradingDashboard.tsx` -- Hauteur chart mobile + Fullscreen modal

**Hauteur du conteneur chart** :
- Ligne 265 : ajouter une hauteur mobile explicite avec clamp
- Classes : `min-h-[320px] h-[clamp(320px,50vh,520px)]` sur mobile (applique par defaut, override par `md:h-full md:min-h-[500px]`)

**State fullscreen** :
- Ajouter un state `isFullscreen` (boolean)
- Passer `onFullscreenToggle={() => setIsFullscreen(true)}` au CandlestickChart

**Modal Fullscreen** :
- Ajouter un composant Dialog (Radix, deja installe) qui s'ouvre quand `isFullscreen === true`
- Contenu : un `CandlestickChart` avec `showHeader` minimal (uniquement controls, pas de searchbar/chips), hauteur `h-[100dvh]`
- Bouton close (X) en haut a droite
- Le dialog utilise `DialogContent` avec `className="max-w-none w-screen h-screen p-0 m-0"` pour etre veritablement plein ecran
- Pas de DialogTitle visible (ajouter un `sr-only` pour l'accessibilite)

### 3. `src/components/CandlestickChart.tsx` -- Props supplementaires

Ajouter les props :
- `onFullscreenToggle?: () => void` -- callback pour le bouton fullscreen
- `compact?: boolean` -- si true, force un header ultra-minimal (controls only, pas de searchbar/chips/titre). Utilise par le mode fullscreen.

### 4. Landscape mobile (bonus)

Dans le conteneur chart de TradingDashboard.tsx, ajouter une media query CSS via Tailwind pour landscape :
- `@media (orientation: landscape) and (max-width: 1023px)` : chart prend `h-[85vh]`
- Implementable via une classe utilitaire custom dans `index.css` :
```css
@media (orientation: landscape) and (max-width: 1023px) {
  .chart-landscape-boost { height: 85vh !important; min-height: 280px; }
}
```
- Appliquer cette classe au conteneur chart

### 5. Scrollbars parasites

- Le conteneur chart a deja `overflow-hidden` -- pas de changement
- Le `CardContent` utilise deja `overflow-hidden` -- OK
- Les asset chips utilisent deja `scrollbar-hide` -- OK

## Resume des fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/components/CandlestickChart.tsx` | Header compact mobile (titre cache, searchbar/chips toggle), bouton fullscreen, prop `compact` et `onFullscreenToggle` |
| `src/pages/TradingDashboard.tsx` | Hauteur chart mobile avec clamp, state fullscreen, modal Dialog plein ecran |
| `src/index.css` | Classe utilitaire `.chart-landscape-boost` pour landscape mobile |

## Ce qui ne change pas

- Logique metier, API, data, routing : zero changement
- Desktop (`lg+`) : aucune modification visible
- Tablet (`md`) : aucune modification (deja optimise precedemment)
- Toutes les fonctionnalites preservees (searchbar, chips, prix, connection badge)
- Les controles sont repositionnes/collapses, jamais supprimes

## Section technique

### Nouveau flux mobile header CandlestickChart

```text
+---------------------------------------------+
| [EUR/USD] [Live] [4H ▾] [🔍] [⤢]          |  <- ligne unique, toujours visible
+---------------------------------------------+
| (SearchBar + Asset Chips)                    |  <- toggle, cache par defaut
+---------------------------------------------+
|                                              |
|            TRADINGVIEW CHART                 |
|         h: clamp(320px, 50vh, 520px)         |
|                                              |
+---------------------------------------------+
```

### Fullscreen modal

```text
+---------------------------------------------+
| [X]  [EUR/USD] [Live] [4H ▾]               |
+---------------------------------------------+
|                                              |
|            TRADINGVIEW CHART                 |
|              height: 100dvh                  |
|                                              |
+---------------------------------------------+
```

