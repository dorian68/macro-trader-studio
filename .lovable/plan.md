
# Optimisation Tablet -- TradingView prioritaire

## Probleme identifie

Le layout du dashboard utilise deux breakpoints extremes :
- **Mobile** (`< 1024px`) : grille single-column, pas de verrouillage viewport
- **Desktop** (`>= 1024px`, `lg`) : grille `2fr 1fr`, verrouillage viewport pleine hauteur

Il n'y a **aucun breakpoint intermediaire pour tablette** (`md`, 768-1023px). Resultat : sur iPad/tablette, le dashboard se comporte exactement comme sur mobile -- le chart TradingView n'a pas de hauteur minimale garantie, le header du chart prend trop de place proportionnellement, et le carousel de navigation est completement masque.

## Strategie

Ajouter un **palier tablette** (`md`) qui :
1. Verrouille le viewport comme sur desktop pour que le chart occupe tout l'espace disponible
2. Garantit une hauteur minimale au chart via `min-h-[500px]` sur tablette
3. Garde la grille single-column (pas assez de largeur pour 2 colonnes) mais avec le chart en zone primaire plein ecran
4. Compacte le header du chart pour maximiser l'espace graphique

## Modifications par fichier

### 1. `src/components/Layout.tsx`

**Viewport lock sur tablette** (actuellement `lg` seulement) :
- Ligne ~309 : `lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden` 
  devient `md:h-[calc(100vh-3.5rem)] md:overflow-hidden`
- Ligne ~317 : `lg:max-w-[1920px] lg:h-full lg:flex lg:flex-col`
  devient `md:max-w-[1920px] md:h-full md:flex md:flex-col`

Cela verrouille la page en plein viewport des 768px, comme un vrai terminal de trading.

### 2. `src/pages/TradingDashboard.tsx`

**Etendre le layout flex au breakpoint md** :
- Ligne ~261 : `lg:h-full lg:overflow-hidden lg:flex lg:flex-col`
  devient `md:h-full md:overflow-hidden md:flex md:flex-col`
- Ligne ~263 : `lg:grid-cols-[2fr_1fr]` reste inchange (le carousel ne s'affiche qu'a `lg`)
  mais ajouter `md:flex-1 md:min-h-0` pour que la grille prenne toute la hauteur sur tablette
- Ligne ~265 (conteneur chart) : ajouter `md:min-h-[500px]` pour garantir que TradingView ne soit jamais ecrase sous 500px

**Navigation cards tablette** :
- Ligne ~299 : les cartes mobile sont `lg:hidden` -- les garder visibles sur tablette mais les rendre plus compactes avec `md:grid-cols-3` (deja present via `sm:grid-cols-3`) et ajouter `md:mt-2` pour reduire l'espacement
- Le `MarketNewsCollapsible` et `AssetInfoCard` (lignes ~356-362) : changer `lg:hidden` en gardant tel quel car ils sont below-the-fold et le scroll est desactive sur tablette avec le viewport lock. Les passer en `md:hidden` pour les masquer sur tablette (l'info est dans le carousel ou le badge news)

### 3. `src/components/CandlestickChart.tsx`

**Compacter le header du chart sur tablette** :
- Ligne ~182 : Le titre `text-xl sm:text-2xl md:text-3xl` -- reduire a `text-xl sm:text-2xl md:text-xl lg:text-3xl` pour que le titre soit plus petit sur tablette, laissant plus de place au chart
- Ligne ~186 : Le sous-titre -- le cacher sur tablette avec `hidden md:hidden lg:block sm:block` (visible sur mobile petit et desktop, cache sur tablette pour gagner de la place)

### 4. `src/components/DashboardColumnCarousel.tsx`

**Afficher le carousel sur tablette** :
- Ligne ~296 dans TradingDashboard : `hidden lg:flex` devient `hidden md:flex`
- Sur tablette, le carousel s'affichera dans la colonne droite. Activer aussi la grille 2 colonnes sur `md` : `md:grid-cols-[3fr_1fr] lg:grid-cols-[2fr_1fr]` -- ratio 3:1 sur tablette pour donner plus d'espace au chart

### Resume des changements

| Fichier | Modification | Impact |
|---------|-------------|--------|
| `Layout.tsx` | Viewport lock etendu a `md` | Chart occupe tout l'ecran sur tablette |
| `TradingDashboard.tsx` | Flex layout `md`, grille 2 colonnes `md`, min-height chart, masquer AssetInfo/News sur tablette | TradingView jamais ecrase, layout terminal |
| `CandlestickChart.tsx` | Titre compact sur `md`, sous-titre cache sur tablette | Plus d'espace vertical pour le chart |
| `DashboardColumnCarousel.tsx` | Visible a partir de `md` au lieu de `lg` | Navigation accessible sur tablette |

## Ce qui ne change pas

- Aucune logique metier / API / data / routing
- Desktop (`lg+`) : aucun changement
- Mobile (`< 768px`) : aucun changement
- Toutes les fonctionnalites preservees
- Les pages publiques (Homepage, Pricing, Features, About, Auth) ne sont pas touchees

## Breakpoints cibles

- `md` : 768px-1023px (iPad portrait, tablettes Android standard)
- `lg` : 1024px+ (iPad landscape, desktop) -- inchange
