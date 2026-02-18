

# Remplacement du logo sur la page Auth

## Modification

Remplacer le logo actuel (`/logos/Alpha_no_BG.png`, icone Alpha seule) par le logo de la navbar (`/header_logo.png`, logo complet avec texte) dans la card Sign In / Sign Up.

## Detail technique

**Fichier:** `src/pages/Auth.tsx`, lignes 853-858

- Changer `src` de `/logos/Alpha_no_BG.png` vers `/header_logo.png`
- Ajuster la hauteur de `h-28` a `h-14` pour correspondre au style navbar et eviter un logo trop grand
- Retirer le `drop-shadow-lg` qui etait specifique a l'icone ronde (le logo texte n'en a pas besoin)

Avant :
```
src="/logos/Alpha_no_BG.png"
className="h-28 w-auto object-contain drop-shadow-lg"
```

Apres :
```
src="/header_logo.png"
className="h-14 w-auto object-contain"
```

## Impact

- Aucune autre page ou composant n'est modifie
- Le reste de la card (tabs, formulaires, boutons) reste identique

