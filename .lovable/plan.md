

# Row 1 (Chart + Nav Cards) remplit le viewport sur laptop

## Objectif

Le bas du chart et le bas des 3 nav cards doivent coincider avec le bas de l'ecran sur laptop. Les contenus suivants (AssetInfo, Market News) restent accessibles par scroll.

## Approche

Utiliser `lg:h-[calc(100vh-3.5rem-1rem)]` sur la Row 1 pour qu'elle occupe exactement la hauteur du viewport moins la navbar et le padding. Le chart et les nav cards s'etirent pour remplir cet espace.

## Changements

### 1. `src/pages/TradingDashboard.tsx`

**Row 1** (ligne 262) : ajouter une hauteur fixe viewport sur desktop

```
- <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-2 items-stretch">
+ <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-2 items-stretch lg:h-[calc(100vh-3.5rem-1rem)]">
```

Le `3.5rem` correspond a la navbar, le `1rem` au padding vertical (`py-2` = 0.5rem * 2). Les deux colonnes (chart + nav cards) s'etirent automatiquement grace a `items-stretch`.

**Chart height prop** (ligne 269) : le `height={350}` est un fallback pour mobile. Sur desktop, le chart est deja dans un conteneur `h-full flex flex-col` donc il s'adaptera a la hauteur du parent.

### 2. `src/components/Layout.tsx`

Aucun changement -- la structure actuelle (`min-h-[calc(100vh-3.5rem)]` + scroll normal) est correcte pour ce comportement.

### 3. `src/components/CandlestickChart.tsx`

Aucun changement -- le wrapper utilise deja `h-full flex flex-col` ce qui lui permet de remplir la hauteur du parent.

## Ce qui ne change pas

- Tous les composants, donnees, WebSocket, navigation
- Mobile/tablette : layout empile standard
- AssetInfo et Market News restent en dessous, accessibles par scroll
- BubbleSystem, MobileNewsBadge, MobileNewsModal

## Resultat attendu

- Sur laptop : le chart et les 3 cards remplissent exactement la hauteur de l'ecran
- Scroll vers le bas pour voir AssetInfo puis Market News
- Layout propre et professionnel

