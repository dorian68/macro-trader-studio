

# Plan : Ajustements UX du Trade Generator

## Modifications à effectuer

### 1. Déplacer la Risk Surface sous le Forecast Summary (Step 2)

**Fichier :** `src/pages/ForecastTradeGenerator.tsx`  
**Lignes affectées :** 2546-2598

**Actuellement :**
```
Step 2: Quant Validation
├── Powered by: ...
├── Risk Surface (3D chart)      ← ACTUELLEMENT ICI
└── Forecast Summary by Horizon
```

**Après modification :**
```
Step 2: Quant Validation
├── Powered by: ...
├── Forecast Summary by Horizon  ← EN PREMIER
└── Risk Surface (3D chart)      ← EN DESSOUS
```

Simplement inverser l'ordre des deux blocs dans le JSX.

---

### 2. Étendre les Setup Cards sur toute la largeur (Step 1)

**Fichier :** `src/pages/ForecastTradeGenerator.tsx`  
**Ligne affectée :** 2500

**Problème actuel :**
- Le grid utilise `md:grid-cols-2` → 2 colonnes fixes
- Si une seule carte, elle n'occupe que 50% de la largeur

**Solution :**
Utiliser une grille dynamique qui s'adapte au nombre de cartes :
- 1 carte → pleine largeur
- 2 cartes → 2 colonnes

```tsx
// AVANT
<div className="grid gap-4 md:grid-cols-2">

// APRÈS
<div className={cn(
  "grid gap-4",
  aiSetupResult.setups.length === 1 
    ? "grid-cols-1" 
    : "md:grid-cols-2"
)}>
```

---

## Récapitulatif

| Modification | Lignes | Description |
|--------------|--------|-------------|
| Risk Surface | 2546-2598 | Déplacer après le Forecast Summary |
| Setup Cards grid | 2500 | Grille adaptative selon le nombre de cartes |

## Garanties

- Zero régression fonctionnelle
- Risk Surface : même composant, même props
- Forecast Table : inchangé
- Layout responsive préservé

