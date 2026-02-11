

# Remplacer le logo Auth par le logo complet (icone + texte)

## Changement

Remplacer le logo texte actuel par le logo complet "alphaLens AI" (avec l'icone loupe/alpha) sur la card Login / Sign Up.

## Etapes

1. **Copier le fichier** : `user-uploads://Full_logo_no_BG_2-2.png` vers `public/logos/alphalens-ai-text.png` (ecrase l'ancien)
2. **Ajuster la taille dans `src/pages/Auth.tsx`** (ligne 857) : passer de `h-20` a `h-24` pour mieux afficher le logo complet avec l'icone

## Ce qui ne change pas

- Le chemin du fichier (`/logos/alphalens-ai-text.png`) reste le meme
- La structure de la Card, la logique auth, les z-index, les traductions
- Aucune autre page ou composant impacte

