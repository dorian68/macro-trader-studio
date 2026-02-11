

# Ajustement Row 1 viewport-fit + suppression des scrollbars

## Problemes identifies

1. **Hauteur incorrecte** : `lg:h-[calc(100vh-3.5rem-1rem)]` ne prend pas en compte le padding reel du Layout (`sm:py-3` = 0.75rem top). La formule correcte est `100vh - 3.5rem (navbar) - 0.75rem (top padding)` = `100vh - 4.25rem`
2. **Scrollbars visibles** : Le composant CandlestickChart (Card) n'a pas `overflow-hidden`, donc quand le header du chart (titre + controles + selecteur d'assets) depasse la hauteur disponible, des scrollbars apparaissent

## Changements

### 1. `src/pages/TradingDashboard.tsx`

**Row 1** (ligne 262) : Ajuster la hauteur calculee

```
- lg:h-[calc(100vh-3.5rem-1rem)]
+ lg:h-[calc(100vh-4.25rem)]
```

4.25rem = 3.5rem (navbar) + 0.75rem (padding top du conteneur Layout `sm:py-3`)

**Chart wrapper** (ligne 264) : Ajouter `overflow-hidden` pour empecher tout debordement

```
- <div ref={chartRef} className="min-w-0 min-h-0 order-1 my-0 h-full">
+ <div ref={chartRef} className="min-w-0 min-h-0 order-1 my-0 h-full overflow-hidden">
```

### 2. `src/components/CandlestickChart.tsx`

**Card** (ligne 169) : Ajouter `overflow-hidden` pour que la carte ne genere jamais de scrollbar

```
- <Card className="gradient-card border border-border/50 shadow-medium rounded-lg flex flex-col flex-1 min-h-0">
+ <Card className="gradient-card border border-border/50 shadow-medium rounded-lg flex flex-col flex-1 min-h-0 overflow-hidden">
```

### 3. `src/components/Layout.tsx`

Aucun changement.

## Ce qui ne change pas

- Tous les composants, donnees, WebSocket, navigation
- Mobile/tablette : layout empile standard (aucune classe `lg:` n'affecte mobile)
- AssetInfoCard et MarketNews restent accessibles par scroll
- BubbleSystem, MobileNewsBadge, MobileNewsModal

## Resultat attendu

- Le bas du chart et des 3 nav cards coincide exactement avec le bas de l'ecran
- Zero scrollbar dans le composant Trading Dashboard
- Le contenu (header, selecteur d'assets, chart) est contraint dans la hauteur disponible sans debordement

