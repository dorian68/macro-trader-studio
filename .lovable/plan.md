

# Remplacer le logo sur la card Auth

## Changement

Remplacer le fichier logo actuel (`public/logos/alphalens-ai-text.png`) par la nouvelle image uploadee (`Only_text_no_BG_2-2.png`).

## Etapes

1. **Copier le fichier** : `user-uploads://Only_text_no_BG_2-2.png` vers `public/logos/alphalens-ai-text.png` (ecrase l'ancien)
2. **Aucune modification de code** : le `src/pages/Auth.tsx` pointe deja vers `/logos/alphalens-ai-text.png` avec les bons styles

## Ce qui ne change pas

- Le code Auth.tsx (meme chemin, meme alt, meme classes)
- La logique auth, z-index, focus, traductions
- Tout le reste du projet

