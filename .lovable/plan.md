

# Refactorisation UX du Systeme Conversationnel AURA

## Problemes identifies

1. **Scroll**: Le `useEffect` sur `[messages, jobBadges, isLoading]` utilise `behavior: 'smooth'` meme a l'ouverture, ce qui peut laisser la vue au milieu. Pas de scroll instant a l'ouverture.
2. **Restauration de position**: A la reouverture, les messages sont restaures depuis localStorage mais aucun scroll instant n'est declenche apres le render.
3. **Largeur des messages**: Les bulles utilisent `max-w-[75%]` sans contrainte absolue, ce qui etale le texte sur grand ecran. Pas de `max-width` en pixels sur le conteneur conversationnel.
4. **Ordre d'affichage texte/widget**: Deja corrige dans le plan precedent, mais le spacing entre blocs est inconsistant (mix de `mt-2`, `mb-2`).

## Changements (fichier unique: `src/components/AURA.tsx`)

### 1. Scroll instant a l'ouverture

Ajouter un `useEffect` dedie qui se declenche quand `isExpanded` passe a `true`:

```text
useEffect:
  if isExpanded && scrollRef.current:
    scrollContainer.scrollTo({ top: scrollHeight, behavior: 'instant' })
  dependencies: [isExpanded]
```

Cela garantit qu'a chaque ouverture, la vue saute immediatement en bas sans animation.

### 2. Scroll smooth uniquement pour nouveaux messages

Modifier le `useEffect` existant (ligne 312) pour utiliser `behavior: 'smooth'` uniquement quand un nouveau message est ajoute (pas a l'ouverture). Ajouter un garde: ne scroller smooth que si l'utilisateur est deja pres du bas (< 200px), pour ne pas interrompre un scroll manuel vers le haut.

```text
useEffect [messages.length, isLoading]:
  if scrollContainer:
    isNearBottom = scrollHeight - scrollTop - clientHeight < 200
    if isNearBottom:
      scrollTo({ top: scrollHeight, behavior: 'smooth' })
    setShowScrollButton(!isNearBottom)
```

### 3. Largeur controlee des messages

Ajouter un conteneur `max-w-[760px] mx-auto` autour de la zone de messages (pas en fullscreen seulement, toujours). Reduire les bulles de `max-w-[75%]` a `max-w-[680px]`.

Lignes impactees:
- Ligne 1374: le `div` wrapper dans ScrollArea → ajouter `max-w-[760px] mx-auto px-4` (et `max-w-5xl` en fullscreen comme actuellement)
- Ligne 1431-1432: les bulles → remplacer `max-w-[75%]` par `max-w-[680px]`

### 4. Spacing coherent entre blocs dans renderMessageContent

Dans `renderMessageContent` (ligne 600), normaliser les espacements:
- Summary: `mb-3`
- Metadata: `mb-3`
- Chart: `mb-4` (avec `rounded-lg overflow-hidden`)
- Mini-widget: `mt-3`
- Raw JSON: `mt-3`

### 5. Bouton "Scroll to Latest" ameliore

Le bouton existe deja (ligne 1493). Ameliorer sa visibilite: le rendre toujours visible si `showScrollButton` est true, avec une animation d'entree. Ajouter un label textuel en plus de l'icone.

## Ce qui ne change PAS

- Tool routing, FEATURE_REGISTRY, resolveFeatureId
- API endpoints, enhanced-request
- Realtime subscriptions, job badges
- Mini-widget components
- MarketChartWidget
- localStorage persistence (toujours sauvegarde les 7 derniers messages)
- Input bar, teaser, quick actions
- Theme, couleurs, dark mode

## Details techniques

### Nouveau useEffect pour scroll instant

```text
// Scroll to bottom instantly when AURA opens
useEffect(() => {
  if (isExpanded && scrollRef.current) {
    requestAnimationFrame(() => {
      const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' });
      }
    });
  }
}, [isExpanded]);
```

`requestAnimationFrame` assure que le DOM est peint avant le scroll.

### Modification du useEffect existant (ligne 312-327)

```text
useEffect(() => {
  if (!scrollRef.current) return;
  const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
  if (!viewport) return;
  const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 200;
  if (isNearBottom) {
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  }
  setTimeout(() => {
    const stillNear = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
    setShowScrollButton(!stillNear);
  }, 300);
}, [messages.length, isLoading]);
```

Le changement de dependance de `[messages, jobBadges, isLoading]` a `[messages.length, isLoading]` evite les re-renders inutiles.

### Layout des bulles

```text
Ligne 1374 (conteneur messages):
  Avant: <div className={cn(isFullscreen && "max-w-5xl mx-auto")}>
  Apres: <div className={cn("max-w-[760px] mx-auto", isFullscreen && "max-w-5xl")}>

Ligne 1431 (bulle user):
  Avant: max-w-[75%]
  Apres: max-w-[680px]

Ligne 1432 (bulle assistant):
  Avant: max-w-[75%]
  Apres: max-w-[680px]
```

### Spacing renderMessageContent

```text
Ligne 616: rich.summary → className="mb-3" (etait mb-2)
Ligne 620: rich.meta → className="mb-3" (etait mb-2)
Ligne 634: chartAttachments → wrapper avec className="mb-4 rounded-lg overflow-hidden"
Ligne 645-647: mini-widgets → mt-3 au lieu de mt-2 dans chaque composant
```

