

# Mobile Dashboard -- Fond branding + Refresh visible + News sans scrollbar horizontale

## 1. Bouton Refresh : ou est-il ?

Le bouton Refresh existe deja dans `TradingViewWidget.tsx` (lignes 359-366) en tant qu'icone `RefreshCw` positionnee en overlay (`absolute top-2 right-2`) sur le chart. Il est semi-transparent (`opacity-70`) et ne mesure que `h-8 w-8`, ce qui le rend discret.

**Probleme** : Ce bouton n'apparait que lorsque le mode TradingView est actif. Quand le chart utilise LightweightChartWidget (TwelveData), il n'y a pas de bouton refresh equivalent. De plus, son opacite reduite le rend peu visible.

**Action** : Aucun changement necessaire -- le bouton est present et fonctionnel en mode TradingView. Si le chart affiche le mode TwelveData/Lightweight, il n'a pas de refresh car les donnees sont en temps reel.

## 2. Fond du branding header mobile

**Fichier** : `src/pages/TradingDashboard.tsx`

Le header branding mobile (lignes 267-270) a actuellement un fond transparent avec juste un `border-b`. Pour l'equilibrer visuellement :

- Ajouter un fond subtil : `bg-card/80 backdrop-blur-sm` (coherent avec l'identite visuelle sombre de AlphaLens)
- Ajuster le titre pour qu'il soit plus en phase avec le header du widget TradingView (qui utilise `text-xl font-bold text-foreground` sur desktop). Sur mobile, garder `text-base` mais passer en `text-foreground` au lieu de `text-primary` pour harmoniser avec le header du chart
- Sous-titre en `text-xs text-muted-foreground` -- deja coherent

```
Avant :
<div className="shrink-0 px-3 py-1.5 md:hidden border-b border-border/30">
  <h1 className="text-base font-bold text-primary leading-tight tracking-tight">

Apres :
<div className="shrink-0 px-3 py-2 md:hidden border-b border-border/30 bg-card/80 backdrop-blur-sm">
  <h1 className="text-base font-bold text-foreground leading-tight tracking-tight">
```

Le `text-foreground` harmonise avec le titre dans le header du chart (`text-foreground` ligne 192 de CandlestickChart.tsx). Le fond `bg-card/80` reprend la couleur de la Card du chart, creant une continuite visuelle.

## 3. Scrollbar horizontale dans Market News

**Fichier** : `src/components/MarketNewsCollapsible.tsx`

Le probleme vient de la `TabsList` (ligne 80) qui utilise `overflow-x-auto` -- cela cree une scrollbar horizontale visible quand les 5 onglets ne tiennent pas en largeur.

**Solution** : Remplacer `overflow-x-auto` par `overflow-x-hidden` et reduire les `min-w` des tabs pour qu'ils tiennent toujours. Egalement, ajouter `overflow-hidden` sur le conteneur Card principal pour empecher tout debordement.

```
Ligne 52 :
Avant : <Card className={cn("h-full flex flex-col", className)}>
Apres : <Card className={cn("h-full flex flex-col overflow-hidden", className)}>

Ligne 80 :
Avant : <TabsList className="flex w-full bg-muted/30 overflow-x-auto gap-1 p-1">
Apres : <TabsList className="flex w-full bg-muted/30 gap-0.5 p-1">

Lignes 81-85 (chaque TabsTrigger) :
Avant : className="flex-1 min-w-[60px] text-xs sm:text-sm min-h-[44px]"
Apres : className="flex-1 min-w-0 text-[11px] sm:text-sm min-h-[44px] px-1.5 sm:px-3"
```

En supprimant `min-w-[60px]` (remplace par `min-w-0`) et en reduisant le padding horizontal a `px-1.5` sur mobile, les 5 onglets tiennent dans la largeur sans scrollbar. Le `text-[11px]` sur mobile assure la lisibilite dans l'espace reduit.

## Resume

| Fichier | Modification |
|---------|-------------|
| `src/pages/TradingDashboard.tsx` | Fond `bg-card/80 backdrop-blur-sm` sur le header branding mobile, titre en `text-foreground` pour equilibre avec le header du chart |
| `src/components/MarketNewsCollapsible.tsx` | Suppression `overflow-x-auto`, tabs compactes sans `min-w` fixe, `overflow-hidden` sur la Card |

## Ce qui ne change pas

- Desktop / tablet : aucun impact (le branding est `md:hidden`, les tabs news ont `sm:text-sm sm:px-3`)
- Bouton Refresh : deja en place dans TradingViewWidget, inchange
- Logique metier, API, data : zero changement
- Layout flex / viewport-lock mobile : inchange
