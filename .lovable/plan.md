

# Augmenter la vitesse du typewriter

## Changement

Reduire le delai par caractere de **20ms** a **5ms** dans `src/components/TypewriterRenderer.tsx` (ligne 31).

Cela rendra l'animation environ 4x plus rapide tout en gardant l'effet visuel de "remplissage progressif".

```
speed: 20  -->  speed: 5
```

Un seul fichier modifie : `src/components/TypewriterRenderer.tsx`.

