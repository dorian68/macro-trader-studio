

# Suppression des scrollbars dans le Trading Dashboard

## Diagnostic

Le composant `CandlestickChart` contient plusieurs zones qui generent des scrollbars visibles :

1. **Asset selector horizontal** (ligne 268) : `overflow-x-auto` sur la rangee de boutons d'assets populaires affiche une scrollbar horizontale visible
2. **CardContent** : le composant `CardContent` de `card.tsx` a `overflow-x-hidden` mais pas `overflow-y-hidden`, ce qui peut laisser passer une scrollbar verticale
3. **CardHeader** : le header (titre + search bar + asset buttons) occupe beaucoup de hauteur, comprimant la zone chart

## Changements

### 1. `src/components/CandlestickChart.tsx`

**Asset selector** (ligne 268) : Masquer la scrollbar horizontale avec les classes CSS appropriees. La classe `scrollbar-hide` est deja presente mais pourrait ne pas etre definie. Ajouter aussi un style CSS inline en fallback :

```
// Before (ligne 268)
<div className="flex gap-2 overflow-x-auto pb-2 px-2 sm:px-0 snap-x snap-mandatory scrollbar-hide">

// After
<div className="flex gap-2 overflow-x-auto pb-0 px-2 sm:px-0 snap-x snap-mandatory scrollbar-hide"
     style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
```

Retirer `pb-2` (remplacer par `pb-0`) car ce padding etait la pour compenser la scrollbar visible.

**CardHeader** (ligne 172) : Ajouter `overflow-hidden shrink-0` pour que le header ne deborde jamais et conserve sa taille naturelle sans comprimer le chart :

```
// Before
<CardHeader className="pb-3 border-b border-border/50 space-y-2">

// After
<CardHeader className="pb-3 border-b border-border/50 space-y-2 overflow-hidden shrink-0">
```

**CardContent** (ligne 291) : Ajouter `overflow-hidden` pour empecher toute scrollbar dans la zone chart :

```
// Before
<CardContent className="pb-4 sm:pb-6 pt-4 sm:pt-6 flex-1 min-h-0">

// After
<CardContent className="pb-4 sm:pb-6 pt-4 sm:pt-6 flex-1 min-h-0 overflow-hidden">
```

### 2. `src/index.css`

Ajouter la classe utilitaire `scrollbar-hide` si elle n'existe pas deja :

```css
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

## Ce qui ne change pas

- Toute la logique metier, les donnees, WebSocket, navigation
- Le layout mobile (aucune classe `lg:` modifiee)
- Les 3 nav cards (AI Trade Setup, Macro Commentary, Reports)
- BubbleSystem, MobileNewsBadge, MobileNewsModal
- Le fonctionnement du scroll horizontal sur les assets (il fonctionne toujours, juste sans scrollbar visible)

## Resultat attendu

- Zero scrollbar visible dans le composant Trading Dashboard
- Le header du chart reste compact et ne deborde pas
- La zone chart remplit l'espace restant proprement
- Experience utilisateur propre et professionnelle

