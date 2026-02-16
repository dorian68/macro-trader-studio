
# Macro Lab -- Correction de l'ecrasement du widget TradingView

## Probleme

Le `TradingViewWidget` dans Macro Lab s'ecrase (hauteur quasi nulle) car :
- Le widget utilise `h-full` et `flex-1 min-h-0` pour s'adapter a son parent
- Le parent (`TabsContent`) n'a aucune hauteur definie -- il utilise juste `p-4 pt-2`
- Sans contrainte de hauteur, le conteneur flexbox se reduit a zero

Dans le dashboard, ce probleme n'existe pas car le layout est verrouille au viewport.

## Solution

Donner une hauteur minimale explicite au `TabsContent` du chart pour que le widget TradingView ait de l'espace. Cela reproduit le pattern utilise ailleurs dans le projet.

### Fichier : `src/pages/ForecastMacroLab.tsx`

**Ligne 1330** -- Ajouter une hauteur minimale au TabsContent du chart :

```
Avant : <TabsContent value="chart" className="p-4 pt-2">
Apres : <TabsContent value="chart" className="p-4 pt-2 min-h-[500px]">
```

Cela garantit que le widget dispose d'au moins 500px de hauteur (coherent avec la `min-h` utilisee pour le chart sur tablette dans le dashboard). Le widget remplira cet espace grace a son `h-full`.

### Meme correction pour l'onglet Technical Analysis (ligne 1340) :

```
Avant : <TabsContent value="technical" className="p-4 pt-2">
Apres : <TabsContent value="technical" className="p-4 pt-2 min-h-[500px]">
```

## Resume

| Fichier | Modification |
|---------|-------------|
| `src/pages/ForecastMacroLab.tsx` | `min-h-[500px]` sur les deux `TabsContent` (chart + technical) |

## Ce qui ne change pas

- Dashboard, Trade Generator, autres pages : aucun impact
- Logique API, donnees, WebSocket : zero changement
- Layout mobile du dashboard : inchange
