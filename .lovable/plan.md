

## Remonter les 3 boutons (AI Trade Setup, Macro Commentary, Reports) sur mobile

### Probleme

Le conteneur du graphique utilise `flex-1 min-h-0` ce qui lui permet de prendre tout l'espace disponible. Les 3 cartes en bas ont `shrink-0` mais le graphique les pousse hors de l'ecran sur les petits viewports mobiles.

### Solution

Limiter la hauteur max du conteneur du graphique sur mobile pour laisser assez de place aux 3 boutons. Sur tablette/desktop les contraintes existantes restent inchangees.

### Modification dans `src/pages/TradingDashboard.tsx`

**Ligne 262** - Ajouter une hauteur max mobile au conteneur du graphique :

Remplacer :
```
min-w-0 min-h-0 order-1 my-0 overflow-hidden md:min-h-[500px] md:h-full chart-landscape-boost md:!h-full
```
Par :
```
min-w-0 min-h-0 order-1 my-0 overflow-hidden max-h-[calc(100%-5rem)] md:max-h-none md:min-h-[500px] md:h-full chart-landscape-boost md:!h-full
```

Le `max-h-[calc(100%-5rem)]` reserve ~80px en bas pour les 3 cartes sur mobile. Le `md:max-h-none` desactive cette contrainte sur tablette/desktop.

### Ce qui ne change pas

- Le layout desktop 2 colonnes reste identique
- Le graphique TradingView garde son fonctionnement
- Les 3 boutons gardent leur style et comportement
- Aucune logique metier modifiee

