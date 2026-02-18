
# Suppression des boutons Copy et Toggle du TypewriterRenderer

## Changement

Retirer les boutons **Copy** et **Toggle Typewriter** (icones Copy et Type) des deux branches de rendu du composant `TypewriterRenderer.tsx`. Le bouton **Skip** (FastForward) reste en place car il a une utilite directe pendant l'animation.

## Fichier modifie : `src/components/TypewriterRenderer.tsx`

### Branche objet (lignes 55-63)
- Supprimer entierement le bloc `<div className="flex justify-end ...">` avec le bouton Copy
- Le `<MacroCommentaryDisplay>` se retrouve directement sans espace au-dessus

### Branche string (lignes 70-95)
- Retirer le bouton Copy (lignes 77-79)
- Retirer le bouton Toggle Type (lignes 80-87)
- Garder uniquement le bouton Skip qui n'apparait que pendant l'animation
- Quand il n'y a pas d'animation en cours, le conteneur de boutons sera vide donc on le conditionne a `isAnimating` pour eviter tout espace residuel

### Code mort a nettoyer
- Supprimer la fonction `copyText` (plus utilisee)
- Supprimer la fonction `toggleTypewriter` (plus utilisee)
- Supprimer le state `typewriterEnabled` et la constante `STORAGE_KEY`
- Retirer les imports `Copy`, `Type`, `useToast` devenus inutiles

### Comportement apres modification
- Le typewriter est **toujours actif** (plus de toggle, valeur par defaut = ON)
- Le bouton Skip reste visible pendant l'animation
- Plus aucun espace inutile au-dessus du texte
- Aucune regression : le hook `useTypewriter` et `MacroCommentaryDisplay` restent inchanges
