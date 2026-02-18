

# Reorganisation de la DecisionSummaryCard + Suppression de DecisionLayer

## Objectif

1. Deplacer la `DecisionSummaryCard` en premiere position (avant Step 1 - Market Thesis)
2. Supprimer completement le composant `DecisionLayer` (Step 3)
3. Rendre la `DecisionSummaryCard` accessible a tous les utilisateurs (pas uniquement SuperUser)

## Changements

### Fichier: `src/pages/ForecastTradeGenerator.tsx`

**1. Supprimer le composant `DecisionLayer`** (lignes 1634-1787)
- Retirer l'interface `DecisionLayerProps` et la fonction `DecisionLayer` entierement (~150 lignes)

**2. Deplacer la DecisionSummaryCard avant Step 1** (lignes 2438-2610)
- La carte sera placee juste apres `{hasResults && !loading && (` et avant la `NarrativeSection` Step 1
- Retirer la condition `isSuperUser` pour la rendre visible a tous

Avant :
```text
hasResults
  +-- Step 1: Market Thesis
  +-- Step 2: Quant Validation
  +-- Step 3: DecisionLayer          <-- supprime
  +-- Section 4: DecisionSummaryCard <-- superuser only
```

Apres :
```text
hasResults
  +-- DecisionSummaryCard            <-- visible par tous, en premier
  +-- Step 1: Market Thesis
  +-- Step 2: Quant Validation
```

**3. Nettoyage des imports et references**
- Retirer les icons `CheckCircle2` et `AlertTriangle` si elles ne sont plus utilisees ailleurs dans le fichier (verification necessaire)
- Retirer le `useUserRole` et `isSuperUser` uniquement si plus utilises ailleurs (ils le sont encore pour le debug toggle, donc ils restent)

### Fichier: `src/components/DecisionSummaryCard.tsx`
- Aucune modification. Le composant reste identique.

## Resume des modifications

| Action | Localisation | Detail |
|--------|-------------|--------|
| Supprimer | Lignes 1634-1787 | Composant `DecisionLayer` + interface |
| Supprimer | Lignes 2601-2605 | Appel `<DecisionLayer />` dans le JSX |
| Deplacer | Lignes 2607-2610 vers ~2440 | `DecisionSummaryCard` avant Step 1 |
| Modifier | Ligne 2608 | Retirer la condition `isSuperUser &&` |
| Supprimer | Commentaires "SuperUser only" | Mettre a jour les commentaires associes |

## Ce qui ne change pas

- `DecisionSummaryCard.tsx` : inchange
- Logique d'extraction `extractDecisionSummary` : inchangee
- State `decisionSummary` : inchange
- Sections Step 1 et Step 2 : intactes
- Debug toggle SuperUser : reste en place
- Toutes les autres pages : zero impact

