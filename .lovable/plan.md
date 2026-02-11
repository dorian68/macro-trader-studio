

# Market Intelligence : Images + Modes d'affichage (style Explorateur Windows)

## Objectif

Enrichir le panel "Market Intelligence" du carousel avec :
1. Les **images des articles** (deja disponibles via `item.image` dans le hook `useNewsFeed`)
2. Un **selecteur de mode d'affichage** permettant a l'utilisateur de choisir entre 3 vues, comme l'explorateur de fichiers Windows

## Les 3 modes d'affichage

| Mode | Icone | Description | Items/page |
|------|-------|-------------|------------|
| **Liste** | `List` | Compact : headline + badge + time sur une ligne, pas d'image | 5 |
| **Petites icones** | `LayoutGrid` | Thumbnail 40x40 a gauche + headline + meta a droite | 3 |
| **Grandes icones** | `Image` | Image large en haut (h-24) + headline + summary en dessous | 2 |

## Changements

### `src/components/DashboardColumnCarousel.tsx`

**Nouvel etat** : `viewMode` avec 3 valeurs (`'list' | 'compact' | 'large'`), default = `'compact'` (petites icones, similaire a l'ancien affichage avec images).

**Selecteur de vue** : 3 boutons icones places a droite des filtres de categorie, dans la meme barre. Utilisation de `ToggleGroup` (deja installe via Radix) pour un look propre :

```text
[All] [General] [Forex] [Crypto]     [≡] [⊞] [▣]
                                     list compact large
```

Le bouton actif est mis en surbrillance (`bg-primary text-primary-foreground`).

**Items par page dynamique** : `ITEMS_PER_PAGE` devient une variable derivee de `viewMode` :
- `list` = 5 items
- `compact` = 3 items
- `large` = 2 items

**Rendu conditionnel par mode** :

- **Liste** : `<div>` horizontal simple, headline tronque a 1 ligne, badge + time a droite. Pas d'image. Dense et rapide a scanner.

- **Petites icones (compact)** : Le rendu actuel enrichi d'un thumbnail `item.image` (40x40, `object-cover rounded`) a gauche du texte. Si pas d'image, affichage sans. Headline 2 lignes max + meta.

- **Grandes icones (large)** : Image en banniere (`w-full h-24 object-cover rounded-t-lg`), puis headline + summary (2 lignes) + meta en dessous. Format "carte magazine".

**Gestion des images manquantes** : Si `item.image` est `null`, les modes compact/large affichent un placeholder gris avec une icone `Newspaper` au centre.

**Pagination** : Le calcul `totalPages` et `pageItems` reste identique, seul `ITEMS_PER_PAGE` change selon le mode. Le changement de mode remet `page` a 0.

### Imports supplementaires

- `List`, `LayoutGrid`, `Image`, `Newspaper` de `lucide-react`
- `ToggleGroup`, `ToggleGroupItem` de `@/components/ui/toggle-group` (deja existant)

### Ce qui ne change pas

- Hook `useNewsFeed` : inchange
- Quick Access (Slide 1) : inchange
- `MarketNewsCollapsible` (mobile) : inchange
- Logique de pagination, filtres categorie, navigation : inchanges
- Layout global du dashboard : inchange
- Aucune nouvelle dependance

## Structure visuelle du panel Market Intelligence

```text
+------------------------------------------+
| [Quick Access]  [Market Intelligence]    |
+------------------------------------------+
| [All] [General] [Forex] [Crypto]  [≡][⊞][▣] |
+------------------------------------------+
|                                          |
|  Mode "compact" (default):               |
|  +------------------------------------+  |
|  | [img] Headline text...    forex 3h |  |
|  +------------------------------------+  |
|  | [img] Headline text...    crypto 1d|  |
|  +------------------------------------+  |
|  | [img] Headline text...    general 5h| |
|  +------------------------------------+  |
|                                          |
|           < Prev  1/4  Next >            |
+------------------------------------------+
```

## Resultat attendu

- Les images des articles sont de nouveau visibles (comme avant)
- L'utilisateur peut choisir son mode d'affichage prefere
- Zero scrollbar, pagination adaptee au mode choisi
- UI premium et coherente avec le reste du dashboard
- Aucune regression sur Quick Access, mobile, ou logique metier

