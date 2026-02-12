

# Ajustements Tablet -- Badge News + Cards sous le chart

## 1. Supprimer le badge News sur tablette

**Fichier** : `src/pages/TradingDashboard.tsx` (ligne 404)
- Changer `hidden md:block` en `hidden lg:block` pour que le badge ne s'affiche qu'a partir du desktop
- Le `MobileNewsBadge` utilise deja `lg:hidden` en interne, donc il ne s'affichera nulle part -- on peut aussi simplement supprimer le bloc entier (lignes 403-409) puisqu'il sera cache partout. Mais pour eviter toute regression future, on garde le wrapper et on passe a `hidden lg:block`.

## 2. Passer les 3 cards sous le chart sur tablette

Le probleme actuel : la grille `md:grid-cols-[3fr_1fr]` force le `DashboardColumnCarousel` en colonne droite sur tablette, mais la hauteur ne suffit pas -- le chart et le carousel sont ecrases verticalement.

**Fichier** : `src/pages/TradingDashboard.tsx`

- Ligne 263 : Retirer `md:grid-cols-[3fr_1fr]` pour que la tablette reste en single-column. Le chart prend toute la largeur.
  - Avant : `grid grid-cols-1 md:grid-cols-[3fr_1fr] lg:grid-cols-[2fr_1fr]`
  - Apres : `grid grid-cols-1 lg:grid-cols-[2fr_1fr]`

- Ligne 296 : Le `DashboardColumnCarousel` redevient `hidden lg:flex` (colonne droite desktop uniquement)
  - Avant : `hidden md:flex`
  - Apres : `hidden lg:flex`

- Ligne 298-352 : Les 3 mobile navigation cards (AI Trade Setup, Macro Commentary, Reports) sont actuellement `md:hidden`. Les rendre visibles sur tablette aussi en changeant en `lg:hidden`, et les afficher en grille horizontale 3 colonnes.
  - Avant : `md:hidden mt-2`
  - Apres : `lg:hidden mt-2`
  - La sous-grille `sm:grid-cols-3` est deja presente, donc sur tablette (768px+) les 3 cards s'afficheront cote a cote sous le chart

## Resume

| Fichier | Ligne | Modification |
|---------|-------|-------------|
| `TradingDashboard.tsx` | 263 | Retirer `md:grid-cols-[3fr_1fr]` -- tablette en single-column |
| `TradingDashboard.tsx` | 296 | Carousel `hidden lg:flex` au lieu de `hidden md:flex` |
| `TradingDashboard.tsx` | 299 | Cards `lg:hidden` au lieu de `md:hidden` |
| `TradingDashboard.tsx` | 404 | Badge news `hidden lg:block` au lieu de `hidden md:block` |

## Ce qui ne change pas
- Desktop (`lg+`) : aucun changement
- Mobile (`< 768px`) : aucun changement
- Logique metier, API, routing : rien
- Le chart garde son `md:min-h-[500px]` et le viewport lock `md`
