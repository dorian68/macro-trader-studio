

## Ajustements Hero : Titre sur une ligne (desktop) + Logo agrandi (mobile)

### Changements

**Fichier : `src/pages/Homepage.tsx`**

**1. Desktop -- Reduire la taille du titre pour qu'il tienne sur une ligne**

Le titre "Intelligent Financial Research Powered by AI" est actuellement en `md:text-5xl` (3rem) ce qui le force sur deux lignes. On passe a `md:text-4xl lg:text-5xl` avec un `max-w-5xl` deja en place, et on ajoute `whitespace-nowrap` sur desktop via une classe responsive pour garantir une seule ligne.

```
AVANT (ligne 71):
className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4 leading-tight -mt-6 sm:-mt-10 md:-mt-14"

APRES:
className="text-2xl sm:text-3xl md:text-[2.5rem] lg:text-5xl font-bold text-white mb-4 leading-tight -mt-6 sm:-mt-10 md:-mt-14"
```

On utilise `md:text-[2.5rem]` (entre 4xl et 5xl) pour les ecrans moyens, et on garde `lg:text-5xl` pour les grands ecrans ou ca tient naturellement sur une ligne.

**2. Mobile -- Logo beaucoup plus gros et contenu centre**

Le logo est actuellement `h-36` sur mobile (144px), ce qui laisse beaucoup de vide. On l'agrandit significativement pour remplir l'espace et donner un impact visuel fort.

```
AVANT (ligne 67):
className="h-36 sm:h-52 md:h-64 w-auto object-contain"

APRES:
className="h-56 sm:h-52 md:h-64 w-auto object-contain"
```

Le logo mobile passe de `h-36` (144px) a `h-56` (224px) -- +55% plus grand. Sur `sm` il reste a `h-52` et sur `md+` a `h-64`.

On ajuste aussi le margin-top negatif pour compenser le logo agrandi sur mobile :

```
AVANT (ligne 71):
-mt-6 sm:-mt-10 md:-mt-14

APRES:
-mt-10 sm:-mt-10 md:-mt-14
```

### Ce qui ne change PAS
- Textes, traductions, boutons, overlays, image de fond
- Layout general, footer, navbar
- Comportement des CTA et navigation
