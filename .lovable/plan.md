

# Fix Market News -- Charger tous les articles

## Probleme

Deux bugs dans `DashboardColumnCarousel.tsx` limitent les articles affichés :

1. **Ligne 48** : `useNewsFeed('general')` -- ne charge que la categorie "general" au lieu de tout
2. **Ligne 68** : `setCategory(cat !== 'all' ? cat : 'general')` -- quand "All" est selectionne, envoie "general" a l'edge function au lieu de "all"

En base il y a 278 articles (general: 205, crypto: 50, merger: 20, forex: 3), mais le carousel n'en recoit qu'une partie.

## Corrections

### Fichier : `src/components/DashboardColumnCarousel.tsx`

**1. Ligne 48** : Changer l'initialisation du hook

```
// Avant
const { news, isLoading, setCategory } = useNewsFeed('general');

// Apres
const { news, isLoading, setCategory } = useNewsFeed('all');
```

**2. Ligne 68** : Passer `'all'` directement a l'edge function

```
// Avant
setCategory(cat !== 'all' ? cat : 'general');

// Apres
setCategory(cat);
```

**3. Ligne 50** : Le state local `newsCategory` est deja initialise a `'all'`, c'est correct.

### Fichier : `supabase/functions/refresh-news-feed/index.ts`

Verifier que le mode `all` retourne bien tous les articles sans filtre de categorie. Le code actuel le fait deja -- il fait un `SELECT * ORDER BY datetime DESC LIMIT 80`. On peut augmenter la limite de 80 a 150 pour mieux remplir les pages.

### Augmenter les items par page (optionnel)

Le `ITEMS_MAP` actuel est `{ list: 10, compact: 6, large: 4 }`. On peut l'augmenter pour mieux remplir l'espace disponible, mais c'est contraint par la hauteur du conteneur. On garde tel quel car le vrai probleme etait le fetching, pas le nombre par page.

## Resume des changements

| Fichier | Changement |
|---------|------------|
| `DashboardColumnCarousel.tsx` ligne 48 | `useNewsFeed('general')` -> `useNewsFeed('all')` |
| `DashboardColumnCarousel.tsx` ligne 68 | `setCategory(cat !== 'all' ? cat : 'general')` -> `setCategory(cat)` |
| `refresh-news-feed/index.ts` | Augmenter limite de 80 a 150 pour le mode "all" |

## Ce qui ne change pas

- Layout, styles, pagination UI
- Edge function logic (juste la limite)
- Cache TTL, Realtime subscription
- Autres composants

