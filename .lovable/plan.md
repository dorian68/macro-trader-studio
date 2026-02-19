

# Optimisation Densite Market News -- Condensed Trading Feed

## Analyse actuelle

Le composant `DashboardColumnCarousel.tsx` a 3 view modes : `list`, `compact`, `large`. Le mode par defaut est `compact`. Les problemes :

- **list** (5 items) : deja assez dense, bon point de depart
- **compact** (3 items) : thumbnails 40x40, padding `p-2.5`, gap `gap-2`, headline `line-clamp-2` -- trop aere
- **large** (2 items) : images pleine largeur h-24, beaucoup d'espace -- mode expansion

Le gap entre items est `gap-2` (8px), les paddings internes sont genereux, et le mode compact par defaut ne montre que 3 articles.

## Plan de densification

### 1. Augmenter le nombre d'items par page

Changer `ITEMS_MAP` pour afficher plus d'articles :

```
list: 8      (was 5)
compact: 5   (was 3)  
large: 3     (was 2)
```

### 2. Reduire gap entre items

Ligne 256 : `gap-2` (8px) remplace par `gap-1` (4px) pour tout le conteneur news.

### 3. Densifier mode "compact" (default)

- Thumbnail : `w-10 h-10` reste (deja petit)
- Padding : `p-2.5` reduit a `px-2.5 py-1.5`
- Headline : `text-sm line-clamp-2 mb-1` change en `text-xs line-clamp-1 mb-0.5` -- une seule ligne, plus petit
- Metadata row : garder inline, reduire gap a `gap-1.5`

### 4. Densifier mode "list"

- Padding : `px-3 py-2` reduit a `px-2.5 py-1.5`
- Deja tres compact, changement mineur

### 5. Densifier mode "large"

- Image height : `h-24` reduit a `h-16`
- Inner padding : `p-2.5` reduit a `p-2`
- Headline : `text-sm line-clamp-2` change en `text-xs line-clamp-2`
- Summary : `line-clamp-2` change en `line-clamp-1`
- Gap interne : `gap-1` reduit a `gap-0.5`

### 6. Pagination plus compacte

- Ligne 271 : `pt-2` reduit a `pt-1`

### 7. Filtre category bar

- Ligne 225 : `mb-2` reduit a `mb-1`

## Fichier modifie

`src/components/DashboardColumnCarousel.tsx` uniquement

## Ce qui ne change PAS

- Couleurs, palette, CATEGORY_COLORS
- Logique pagination, filtres, API
- Quick Access tab
- ToggleGroup view mode switcher
- Responsive behavior
- NewsFeedPanel (panneau lateral droit -- fichier separe)
