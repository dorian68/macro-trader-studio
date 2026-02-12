

# Mobile Dashboard -- Titre en avant + Suppression texte tronque

## Problemes identifies

1. **Texte tronque sous le chart** : Dans `CandlestickChart.tsx` (ligne 421-423), un footer "Powered by TwelveData" / "Real-time data from TradingView" s'affiche sous le widget. Sur mobile, il est tronque et prend de la place inutilement.

2. **Titre peu visible** : Le branding header dans `TradingDashboard.tsx` (lignes 267-270) utilise `text-sm` ce qui est trop discret -- pas assez de presence visuelle pour une page d'accueil dashboard.

3. **Bouton Refresh** : Il existe deja en overlay (icone ronde `RefreshCw` en haut a droite du chart dans TradingViewWidget.tsx). Il est fonctionnel mais discret par design. Aucun changement necessaire.

## Modifications

### 1. `src/components/CandlestickChart.tsx` -- Masquer le footer sur mobile

Ligne 421 : le `<div>` "Powered by..." recoit la classe `hidden md:block` pour etre invisible sur mobile.

```
Avant : <div className="mt-3 text-xs text-muted-foreground text-center">
Apres : <div className="mt-3 text-xs text-muted-foreground text-center hidden md:block">
```

### 2. `src/pages/TradingDashboard.tsx` -- Titre plus impactant

Le bloc branding (lignes 267-270) est transforme pour avoir plus de presence visuelle :

- Le titre passe de `text-sm font-bold` a `text-base font-bold` avec une couleur accentuee via un gradient ou la couleur primaire
- Le sous-titre passe de `text-[10px]` a `text-xs` avec un espacement ameliore
- Ajout d'un trait de separation subtil en dessous (`border-b border-border/30 pb-1.5`)
- Le padding vertical augmente legerement de `py-1` a `py-1.5`

```
<div className="shrink-0 px-3 py-1.5 md:hidden border-b border-border/30">
  <h1 className="text-base font-bold text-primary leading-tight tracking-tight">
    {t('dashboard:trading.title')}
  </h1>
  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
    {t('dashboard:trading.subtitle')}
  </p>
</div>
```

## Resume

| Fichier | Modification |
|---------|-------------|
| `src/components/CandlestickChart.tsx` | Footer "Powered by..." masque sur mobile (`hidden md:block`) |
| `src/pages/TradingDashboard.tsx` | Titre agrandi (`text-base`, couleur `text-primary`), sous-titre `text-xs`, separateur visuel |

## Ce qui ne change pas

- Desktop / tablet : aucun impact (le footer reste visible, le titre mobile est `md:hidden`)
- Bouton Refresh : deja en overlay icone, inchange
- Logique metier, API, routing : zero changement
- Layout flex / viewport-lock mobile : inchange

