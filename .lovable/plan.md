

# Remplacer le logo de la page Auth

## Changement

Remplacer le logo actuel (`/logos/alphalens-ai-text.png` -- logo texte complet) par le nouveau logo icone Alpha (cercle + alpha orange) fourni en piece jointe, sans toucher a aucune autre fonctionnalite.

## Modifications

### 1. Copier l'image uploadee dans le projet
- Copier `user-uploads://Alpha_no_BG.png` vers `public/logos/Alpha_no_BG.png`

### 2. `src/pages/Auth.tsx` (ligne ~855)
- Changer le `src` de l'image de `/logos/alphalens-ai-text.png` a `/logos/Alpha_no_BG.png`
- Ajuster la hauteur de `h-36` a `h-28` car le logo icone seul est plus compact visuellement qu'un logo texte
- Conserver `drop-shadow-lg`, `w-auto`, `object-contain`

```
Avant :
  <img src="/logos/alphalens-ai-text.png" alt="Alphalens AI"
       className="h-36 w-auto object-contain drop-shadow-lg" />

Apres :
  <img src="/logos/Alpha_no_BG.png" alt="Alphalens AI"
       className="h-28 w-auto object-contain drop-shadow-lg" />
```

## Ce qui ne change pas

- Aucune logique auth (login, signup, Google OAuth, broker selection)
- Les traductions, les z-index, le layout de la Card
- Les autres logos du site (navbar, footer, etc.)
- L'ancien fichier logo reste dans le projet (pas de suppression)

