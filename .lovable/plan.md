

# Fix: Probleme d'affichage du DashboardColumnCarousel

## Diagnostic

Le probleme vient du composant Radix `TabsContent` : quand un onglet est actif, Radix le rend en `display: block`. Or, le carousel applique des classes flexbox (`flex-1 min-h-0 flex flex-col`) sur le `TabsContent`, qui ne fonctionnent que si l'element parent a `display: flex`.

Resultat : le `TabsContent` ne s'etire pas pour remplir la hauteur disponible dans la colonne. Les 3 cards sont compressees ou le contenu deborde au lieu de remplir proprement l'espace.

## Solution

Modifier le composant `TabsContent` dans `tabs.tsx` pour ajouter `data-[state=active]:flex` dans les classes de base. Quand l'onglet est actif, il passera automatiquement en `display: flex` au lieu de `display: block`, ce qui permettra aux classes `flex-1`, `flex-col`, `min-h-0` de fonctionner correctement.

## Changements

### 1. `src/components/ui/tabs.tsx`

Ajouter `data-[state=active]:flex` a la className de base du `TabsContent` :

```
// Before
"mt-2 ring-offset-background focus-visible:outline-none ..."

// After
"mt-2 ring-offset-background focus-visible:outline-none ... data-[state=active]:flex data-[state=active]:flex-col"
```

Cela garantit que tout `TabsContent` avec des classes flex enfants (comme `flex-1`, `flex-col`) fonctionnera correctement quand il est actif.

### 2. `src/components/DashboardColumnCarousel.tsx`

Nettoyer les classes redondantes sur les deux `TabsContent` puisque `flex` et `flex-col` seront desormais geres par le composant de base :

- Retirer `flex flex-col` des classNames des `TabsContent` (garder `flex-1 min-h-0 gap-2 mt-2 overflow-hidden animate-fade-in`)

## Ce qui ne change pas

- Toute la logique metier, navigation, API, donnees
- Le layout mobile
- Le contenu des cards et des news
- Les autres usages de `TabsContent` dans le projet (le `data-[state=active]:flex` est inoffensif car il ne s'applique que quand d'autres classes flex sont presentes)

## Resultat attendu

- Les 3 cards Quick Access remplissent proprement toute la hauteur de la colonne
- Les news paginees remplissent aussi l'espace disponible
- Zero debordement, zero compression anormale
- Aucune regression sur les autres composants utilisant des Tabs

