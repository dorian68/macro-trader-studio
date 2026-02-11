

# Agrandir le logo Auth pour un rendu professionnel

## Changement

Augmenter significativement la taille du logo sur la card Auth et ajouter un espacement adapte pour un rendu premium/institutionnel.

## Modifications dans `src/pages/Auth.tsx`

**Ligne 853-858** : Ajuster le conteneur et la taille du logo :
- Passer le logo de `h-24` a `h-36` (144px) pour une presence visuelle forte
- Ajouter un padding vertical (`py-4`) au conteneur pour aerer
- Augmenter le `mb-1` a `mb-4` pour separer proprement le logo du titre

```
Avant :
  <div className="flex justify-center mb-1">
    <img ... className="h-24 w-auto object-contain" />
  </div>

Apres :
  <div className="flex justify-center mb-4 py-4">
    <img ... className="h-36 w-auto object-contain drop-shadow-lg" />
  </div>
```

Le `drop-shadow-lg` ajoute une ombre subtile pour un effet premium sur fond sombre.

## Ce qui ne change pas

- Le fichier image reste le meme
- La structure Card, la logique auth, les z-index, les traductions
- Aucune autre page impactee

