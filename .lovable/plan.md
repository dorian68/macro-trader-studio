

# Fix: Scrollbar dans le widget TradingView

## Diagnostic

Le composant `TradingViewWidget.tsx` (ligne 348-371) utilise des **hauteurs fixes** pour le conteneur du chart (`h-[380px] sm:h-[460px] lg:h-[560px]`). Quand ce widget est rendu a l'interieur du `CandlestickChart` (qui a `overflow-hidden` et `flex-1 min-h-0`), la hauteur fixe de 560px depasse l'espace disponible, generant une scrollbar interne dans la Card du TradingViewWidget.

De plus, la `Card` du TradingViewWidget n'a pas `overflow-hidden`, et son `CardContent` n'a ni `flex-1`, ni `min-h-0`, ni `overflow-hidden`.

## Changements

### `src/components/TradingViewWidget.tsx`

**Card wrapper** (ligne 348) : Ajouter `overflow-hidden h-full flex flex-col` pour que la carte remplisse son parent et ne deborde jamais :

```
// Before
<Card className={`w-full ${className}`}>

// After
<Card className={`w-full h-full flex flex-col overflow-hidden ${className}`}>
```

**CardContent** (ligne 350) : Ajouter `flex-1 min-h-0 overflow-hidden flex flex-col` pour qu'il prenne l'espace restant sans deborder :

```
// Before
<CardContent className="pb-0">

// After
<CardContent className="pb-0 flex-1 min-h-0 overflow-hidden flex flex-col">
```

**Chart container div** (ligne 358) : Remplacer les hauteurs fixes par `flex-1 min-h-0` pour que le chart s'adapte a l'espace disponible au lieu d'imposer 560px :

```
// Before
<div ref={chartContainerRef} className="relative w-full h-[380px] sm:h-[460px] lg:h-[560px] border border-border rounded-lg overflow-hidden" />

// After
<div ref={chartContainerRef} className="relative w-full flex-1 min-h-0 border border-border rounded-lg overflow-hidden" />
```

**Footer** (ligne 360) : Ajouter `shrink-0` pour que le bouton Refresh ne soit jamais compresse :

```
// Before
<div className="mt-3 sm:mt-4 text-sm text-muted-foreground">

// After
<div className="mt-3 sm:mt-4 text-sm text-muted-foreground shrink-0">
```

## Ce qui ne change pas

- Toute la logique metier, WebSocket, fetch, TradingView widget JS
- Le composant CandlestickChart (deja corrige)
- Layout mobile/tablette (le flex-1 s'adapte naturellement)
- Les 3 nav cards, navigation, donnees

## Resultat attendu

- Le widget TradingView remplit exactement l'espace disponible sans deborder
- Zero scrollbar dans le conteneur chart
- Le bouton Refresh reste visible en bas
- Aucune regression

