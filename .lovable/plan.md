
## Rendre les 3 boutons toujours visibles sur mobile sans scroll

### Diagnostic

Le probleme vient de la chaine de hauteurs dans `Layout.tsx` :
- Sur desktop (`md:`), `fillViewport` applique `h-[calc(100vh-3.5rem)]` + `overflow-hidden` → le conteneur est verrouille au viewport
- Sur mobile, seul `min-h-[calc(100vh-3.5rem)]` est applique (pas de `h-` fixe) → le conteneur grandit au-dela du viewport
- En consequence, `max-h-[calc(100%-5rem)]` sur le graphique ne fonctionne pas car "100%" d'une hauteur `auto` est indefini

### Solution

Appliquer le meme verrouillage viewport sur mobile dans `Layout.tsx` quand `fillViewport` est actif, pour que toute la page soit contenue dans un ecran.

### Modifications

**`src/components/Layout.tsx` (2 lignes)**

1. Ligne 309 : Ajouter la hauteur fixe sur tous les ecrans (pas seulement `md:`) :
   - Avant : `"md:h-[calc(100vh-3.5rem)] md:overflow-hidden"`
   - Apres : `"h-[calc(100dvh-3.5rem)] overflow-hidden md:h-[calc(100vh-3.5rem)]"`

2. Ligne 317 : Appliquer le flex column sur tous les ecrans :
   - Avant : `"md:max-w-[1920px] md:h-full md:flex md:flex-col"`
   - Apres : `"h-full flex flex-col md:max-w-[1920px]"`

`100dvh` est utilise sur mobile pour gerer correctement la barre d'adresse des navigateurs mobiles. Sur `md:` et au-dela, `100vh` prend le relais.

### Ce qui ne change pas

- Le layout desktop 2 colonnes (chart + carousel) reste identique
- Le graphique TradingView garde son fonctionnement
- Les 3 boutons gardent leur style et comportement
- La navbar et le BubbleSystem ne sont pas touches
- Aucune logique metier modifiee
