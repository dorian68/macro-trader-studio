

# Augmenter les limites d'affichage Market News

## Probleme

Trois goulots limitent le nombre d'articles visibles :

| Niveau | Limite actuelle | Nouvelle limite |
|--------|----------------|-----------------|
| Finnhub ingestion (edge function) | 30 articles/categorie | **50** |
| SQL query "all" (edge function) | LIMIT 150 | **300** |
| SQL query single category | LIMIT 50 | **100** |
| Frontend pagination (list mode) | 14 items/page | **20** |
| Frontend pagination (compact mode) | 10 items/page | **14** |
| Frontend pagination (large mode) | 6 items/page | **8** |

## Fichiers modifies

### 1. `supabase/functions/refresh-news-feed/index.ts`

- Ligne 65 : `slice(0, 30)` devient `slice(0, 50)` (ingestion "all" mode)
- Ligne 92 : `limit(150)` devient `limit(300)` (query "all")
- Ligne 118 : `limit(50)` devient `limit(100)` (query single category)
- Ligne 135 : `slice(0, 30)` devient `slice(0, 50)` (ingestion single category)
- Ligne 169 : `limit(50)` devient `limit(100)` (return single category)

### 2. `src/components/DashboardColumnCarousel.tsx`

- Ligne 19 : `ITEMS_MAP` passe de `{ list: 14, compact: 10, large: 6 }` a `{ list: 20, compact: 14, large: 8 }`

Cela permet d'afficher davantage d'articles par page et de remplir l'espace disponible dans la colonne droite du dashboard.

## Aucune regression

- Filtres (All / General / Forex / Crypto) inchanges
- Pagination Prev/Next inchangee (juste plus d'items par page)
- API Finnhub inchangee (meme endpoint)
- Layout, theme, responsive inchanges

