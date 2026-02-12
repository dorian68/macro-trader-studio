
# Mobile Dashboard -- Branding Header + Bouton Refresh compact

## 1. Ajouter un en-tete branding mobile au-dessus du chart

**Fichier** : `src/pages/TradingDashboard.tsx`

Ajouter un bloc `shrink-0` visible uniquement sur mobile (`md:hidden`) juste avant le conteneur du chart, a l'interieur du flex verrouille au viewport. Ce bloc contient :
- Le titre "Trading Dashboard" en `text-sm font-bold`
- Le sous-titre "Real-time AI analysis and trade execution" en `text-[10px] text-muted-foreground`
- Compact : une seule ligne de hauteur minimale (~28-32px) pour ne pas empieter sur le chart

Position : entre la ligne 265 (ouverture du conteneur principal) et la ligne 267 (ouverture de la grille chart).

```
<div className="shrink-0 px-2 py-1 md:hidden">
  <h1 className="text-sm font-bold text-foreground leading-tight">Trading Dashboard</h1>
  <p className="text-[10px] text-muted-foreground leading-tight">Real-time AI analysis and trade execution</p>
</div>
```

Les textes utiliseront les cles i18n existantes `t('dashboard:trading.title')` et `t('dashboard:trading.subtitle')`.

## 2. Remplacer le bouton "Refresh" textuel par une icone compacte

**Fichier** : `src/components/TradingViewWidget.tsx`

Le bouton "Refresh" (lignes 360-368) occupe actuellement une rangee entiere sous le chart avec le texte "Refresh" et un `minHeight: 44px`. Il sera transforme en un bouton icone compact :

- Remplacer le conteneur `<div className="mt-3 sm:mt-4 ...">` par un positionnement absolu en haut a droite du chart (overlay)
- Le bouton devient un cercle avec uniquement l'icone `RefreshCw` (import deja present dans LightweightChartWidget, a ajouter dans TradingViewWidget)
- Taille : `h-8 w-8 p-0 rounded-full` avec l'icone en `h-3.5 w-3.5`
- Position : `absolute top-2 right-2 z-10` dans le conteneur relatif du chart
- Supprimer la rangee de footer qui ne contenait que ce bouton

Cela libere ~50px de hauteur verticale sur mobile.

## Resume

| Fichier | Modification |
|---------|-------------|
| `src/pages/TradingDashboard.tsx` | Ajouter branding header mobile-only (titre + sous-titre) avec `shrink-0 md:hidden` |
| `src/components/TradingViewWidget.tsx` | Bouton Refresh transforme en icone `RefreshCw` positionnee en overlay sur le chart, suppression de la rangee footer |

## Ce qui ne change pas

- Desktop / tablet : aucun changement visible (le header branding est `md:hidden`, le refresh est repositionne mais fonctionne pareil)
- Logique metier, API, data : zero changement
- Fonctionnalite refresh : preservee, seule la presentation change
- Layout mobile du chart (flex-1, compact) : inchange
