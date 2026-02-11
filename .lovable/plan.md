

# Fix : PersistentToast reste ouvert apres fermeture de tous les jobs

## Cause racine

Quand un job se termine, le `PersistentNotificationProvider` appelle `addFlashMessage({ duration: 3000 })`. Mais cette duration n'est jamais utilisee car :

1. Le composant `FlashMessage` (qui a un timer auto-remove) n'est **pas utilise** dans le PersistentToast -- les flash messages sont rendus en inline dans le JSX du toast
2. Il n'y a **aucun timer** dans le Provider qui nettoie les flash messages automatiquement
3. Le guard du PersistentToast (`if (allJobs.length === 0 && flashMessages.length === 0) return null`) ne se declenche jamais car `flashMessages` n'est jamais vide apres une completion

Resultat : l'utilisateur ferme tous les jobs via le bouton X (`markJobAsViewed`), les jobs disparaissent, mais les flash messages restent dans le state. Le toast reste affiche avec un spinner ou un contenu vide.

## Correctif (1 fichier, patch minimal)

### `src/components/PersistentNotificationProvider.tsx`

Ajouter un `useEffect` qui auto-supprime les flash messages apres leur `duration` (ou 4 secondes par defaut). Cela reproduit exactement le comportement du composant `FlashMessage` standalone mais au niveau du state centralisé.

```typescript
// Auto-remove flash messages after their duration
useEffect(() => {
  if (flashMessages.length === 0) return;
  
  const timers = flashMessages.map(msg => {
    const duration = msg.duration || 4000;
    return setTimeout(() => {
      removeFlashMessage(msg.id);
    }, duration);
  });
  
  return () => timers.forEach(clearTimeout);
}, [flashMessages]);
```

Ce useEffect sera place juste apres la definition de `removeFlashMessage` (ligne 79).

### Ce qui ne change pas

- `markJobAsViewed` : inchange
- Logique de completion/error des jobs : inchangee
- Rendu du PersistentToast : inchange
- Le composant FlashMessage standalone : inchange
- Toute autre fonctionnalite

### Resultat attendu

- Les flash messages disparaissent automatiquement apres 3-4 secondes
- Une fois tous les jobs fermes ET les flash messages expires, le toast disparait completement
- Zero spinner residuel, zero toast zombie

