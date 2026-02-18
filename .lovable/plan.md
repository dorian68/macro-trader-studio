

# Market Thesis et Quant Validation : pliees par defaut

## Constat actuel

- **Market Thesis (Step 1)** : pas de prop `defaultCollapsed`, donc ouverte par defaut
- **Quant Validation (Step 2)** : deja `defaultCollapsed={true}`, donc correctement pliee

## Modification

**Fichier** : `src/pages/ForecastTradeGenerator.tsx` (ligne 2289-2295)

Ajouter `defaultCollapsed={true}` au composant `NarrativeSection` de Market Thesis (Step 1), comme c'est deja fait pour Quant Validation.

Avant :
```tsx
<NarrativeSection
  step={1}
  title="Market Thesis"
  subtitle="Why this trade exists"
  icon={<Lightbulb className="h-5 w-5" />}
  tagline="Human + AI Context"
>
```

Apres :
```tsx
<NarrativeSection
  step={1}
  title="Market Thesis"
  subtitle="Why this trade exists"
  icon={<Lightbulb className="h-5 w-5" />}
  tagline="Human + AI Context"
  defaultCollapsed={true}
>
```

## Impact

- Seul le `DecisionSummaryCard` reste visible en premier plan apres generation
- L'utilisateur peut deployer chaque section en cliquant dessus
- Aucune regression : la logique du composant `NarrativeSection` gere deja ce comportement

