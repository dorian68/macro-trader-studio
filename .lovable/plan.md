

## Supprimer l'espace vide entre le graphique et les 3 boutons sur mobile

### Diagnostic

L'espace vide visible sur le screenshot vient d'un conflit de contraintes :
- Le conteneur grid (ligne 260) a `flex-1` ce qui lui donne tout l'espace restant
- Le conteneur du graphique a `max-h-[calc(100%-5rem)]` qui le limite en hauteur
- Resultat : le grid prend tout l'espace (`flex-1`) mais le graphique ne le remplit pas entierement a cause du `max-h`, creant un vide entre le bas du graphique et les 3 boutons

### Solution

Remplacer l'approche `max-h` par une approche plus propre :
1. Retirer le `max-h-[calc(100%-5rem)]` du conteneur du graphique (il n'est plus necessaire)
2. Le conteneur grid garde `flex-1 min-h-0` pour prendre l'espace restant naturellement
3. Le graphique avec `h-full` remplira son conteneur grid sans espace perdu

Le `flex-1 min-h-0` sur le grid + `shrink-0` sur les boutons + `overflow-hidden` sur le layout parent suffisent a garantir que les boutons restent visibles.

### Modifications

**`src/pages/TradingDashboard.tsx`**

Ligne 262 - Retirer `max-h-[calc(100%-5rem)] md:max-h-none` du conteneur du graphique :

- Avant : `min-w-0 min-h-0 order-1 my-0 overflow-hidden max-h-[calc(100%-5rem)] md:max-h-none md:min-h-[500px] md:h-full chart-landscape-boost md:!h-full`
- Apres : `min-w-0 min-h-0 order-1 my-0 overflow-hidden md:min-h-[500px] md:h-full chart-landscape-boost md:!h-full h-full`

Le `h-full` force le graphique a occuper exactement l'espace que le flex layout lui attribue, sans espace vide.

### Ce qui ne change pas

- Le layout desktop 2 colonnes reste identique
- Les 3 boutons gardent leur `shrink-0` et restent visibles
- Le graphique TradingView/TwelveData fonctionne normalement
- Aucune logique metier modifiee

