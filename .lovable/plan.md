

# Simplification de l'affichage des resultats Macro Lab

## Probleme

L'affichage actuel empile 4 niveaux de conteneurs redondants pour afficher une seule reponse :
1. Titre H2 "Analysis Results" avec icone Brain
2. Card avec header "Macro Analysis For..." + badge "Complete"
3. Collapsible avec trigger repetant le titre de la section
4. Div interne avec background et bordure supplementaire

Resultat : le contenu est enfoui sous des couches inutiles et les titres se repetent.

## Solution

Fusionner tout en une seule Card propre par analyse, sans collapsible interne ni titre redondant.

## Fichier modifie : `src/pages/ForecastMacroLab.tsx`

### Structure actuelle (lignes 1083-1263)

```text
H2 "Analysis Results"
  Card
    CardHeader "Macro Analysis For..." + badge
    CardContent
      Collapsible (section title = "Analysis Results")
        CollapsibleTrigger (encore un titre)
        CollapsibleContent
          div.bg-muted/20
            TypewriterRenderer
      "Extracted Trading Levels" (conditionnel)
      Footer (Copy + TradingView)
```

### Nouvelle structure

```text
Card (par analyse)
  CardHeader
    Icone Activity + "Macro Analysis" + date + badge Complete
    Sous-titre: la query de l'utilisateur (italique, muted)
  CardContent
    TypewriterRenderer (directement, sans wrapper superflu)
    "Extracted Trading Levels" (inchange, conditionnel)
    Footer (Copy + TradingView, inchange)
```

### Changements concrets

1. **Supprimer le H2 "Analysis Results"** (lignes 1084-1088) -- le titre de chaque card suffit
2. **Supprimer le Collapsible interne** (lignes 1116-1156) -- le contenu est toujours visible, pas besoin de toggle expand/collapse
3. **Supprimer le div wrapper `bg-muted/20`** autour du TypewriterRenderer -- une seule bordure (la Card) suffit
4. **Simplifier le CardHeader** : garder un titre unique "Macro Analysis" + la query en sous-titre + date + badge
5. **Rendre le TypewriterRenderer directement dans CardContent** sans intermediaire

### Code mort a nettoyer

- Supprimer le state `expandedSections` et `setExpandedSections` (plus de collapsibles)
- Supprimer la fonction `toggleSection` (plus utilisee)
- Retirer les imports devenus inutiles si plus utilises ailleurs dans le fichier (verifier `Collapsible` usage dans le debug panel)

### Ce qui ne change PAS

- Le composant `TypewriterRenderer` et son hook
- Le bloc "Extracted Trading Levels" (conditionnel, meme logique)
- Le footer avec les boutons Copy et TradingView
- Le skeleton de chargement
- Le debug panel (HTTP debug)
- Le panneau Market Analysis (TradingView + Technical)
- La carte de generation avec le textarea et les suggestions

