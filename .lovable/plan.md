
# Plan : Rendre Trade Generator et Macro Lab accessibles à tous les utilisateurs

## Objectif

1. Modifier les routes pour utiliser des chemins plus courts et intuitifs (`/trade-generator` et `/macro-lab`)
2. Supprimer la restriction `SuperUserGuard` globale pour rendre les pages accessibles à tous les utilisateurs authentifiés
3. Conserver les éléments de debug (switches, panneaux, badges) uniquement visibles pour les super-utilisateurs
4. Mettre à jour les cards du Dashboard pour pointer vers les nouvelles pages

---

## Modifications fichier par fichier

### 1. App.tsx - Mise à jour des routes

**Changements :**
- Ajouter les nouvelles routes `/trade-generator` et `/macro-lab` (accessibles à tous les utilisateurs authentifiés)
- Conserver les anciennes routes `/forecast-playground/...` pour la rétro-compatibilité

| Route | Avant | Après |
|-------|-------|-------|
| Trade Generator | `/forecast-playground/trade-generator` | `/trade-generator` (+ alias ancien) |
| Macro Lab | `/forecast-playground/macro-commentary` | `/macro-lab` (+ alias ancien) |

---

### 2. TradingDashboard.tsx - Mise à jour des liens des cards

**Lignes affectées :** L299, L320, L367, L384

| Card | Avant | Après |
|------|-------|-------|
| AI Trade Setup | `/ai-setup` | `/trade-generator` |
| Macro Commentary | `/macro-analysis` | `/macro-lab` |

---

### 3. ForecastMacroLab.tsx - Suppression du SuperUserGuard global + Debug conditionnel

**Changements :**

A. **Import du hook useUserRole** pour vérifier le statut super-utilisateur

B. **Suppression du wrapper `SuperUserGuard`** (L876-879 et L1348)

C. **Rendre le switch HTTP Debug conditionnel** (L895-902)
   - N'afficher que si `isSuperUser === true`

D. **Rendre le panneau de debug HTTP conditionnel**
   - Le panneau ne s'affiche que si `isSuperUser && showHttpDebug && lastHttpDebug`

E. **Mettre à jour le bouton retour** (L886)
   - Changer `/forecast-playground` vers `/dashboard`

---

### 4. ForecastTradeGenerator.tsx - Suppression du SuperUserGuard global + Debug conditionnel

**Changements :**

A. **Restructurer le composant** pour utiliser un seul export avec la logique conditionnelle intégrée

B. **Import du hook useUserRole** pour vérifier le statut super-utilisateur

C. **Rendre les badges "Internal" et "SuperUser" conditionnels** (L1836-1839)
   - N'afficher que si `isSuperUser === true`

D. **Rendre le switch "Debug JSON" conditionnel** (L2038-2043)
   - N'afficher que si `isSuperUser === true`

E. **Rendre le panneau HTTP Debug conditionnel** (L2063-2145)
   - N'afficher que si `isSuperUser && showDebug && (lastPayload || rawResponse)`

F. **Mettre à jour le bouton retour** (L1823)
   - Changer `/forecast-playground` vers `/dashboard`

G. **Supprimer le wrapper `SuperUserGuard`** dans l'export (L2289-2295)

---

### 5. PersistentNotificationProvider.tsx - Mise à jour du routing

**Changements dans `mapFeatureToRoute`** (L112-121) :

| Feature | Avant | Après |
|---------|-------|-------|
| `macro-lab` | `/forecast-playground/macro-commentary` | `/macro-lab` |
| `trade-generator` | `/forecast-playground/trade-generator` | `/trade-generator` |

---

### 6. GlobalLoadingProvider.tsx - Mise à jour du navigationMap

**Changements dans `navigationMap`** (L55-61) :

| Type | Avant | Après |
|------|-------|-------|
| `macro_lab` | `/forecast-playground/macro-commentary` | `/macro-lab` |
| `trade_generator` | `/forecast-playground/trade-generator` | `/trade-generator` |

---

## Section technique : Détails des modifications

### Structure conditionnelle pour les éléments debug

```typescript
// Dans ForecastMacroLab.tsx et ForecastTradeGenerator.tsx
import { useUserRole } from "@/hooks/useUserRole";

// Dans le composant
const { isSuperUser } = useUserRole();

// Pour les switches de debug
{isSuperUser && (
  <div className="flex items-center gap-2 shrink-0">
    <span className="text-sm text-muted-foreground">HTTP debug</span>
    <Switch ... />
  </div>
)}

// Pour les badges
{isSuperUser && (
  <div className="flex flex-wrap gap-2">
    <Badge variant="outline" className="text-xs">Internal</Badge>
    <Badge variant="outline" className="text-xs">SuperUser</Badge>
  </div>
)}

// Pour les panneaux de debug
{isSuperUser && showDebug && rawResponse && (
  <Card className="...">
    {/* Contenu du panneau debug */}
  </Card>
)}
```

### Routes finales

```text
/trade-generator     → ForecastTradeGenerator (tous utilisateurs authentifiés)
/macro-lab           → ForecastMacroLab (tous utilisateurs authentifiés)
/forecast-playground → ForecastPlayground (SuperUser only - hub interne)
/forecast-playground/tool → ForecastPlaygroundTool (SuperUser only)
/forecast-playground/trade-generator → Redirect vers /trade-generator
/forecast-playground/macro-commentary → Redirect vers /macro-lab
```

---

## Tableau récapitulatif des fichiers modifiés

| Fichier | Modifications |
|---------|--------------|
| `src/App.tsx` | Ajouter routes `/trade-generator` et `/macro-lab` |
| `src/pages/TradingDashboard.tsx` | Changer les liens des cards vers `/trade-generator` et `/macro-lab` |
| `src/pages/ForecastMacroLab.tsx` | Supprimer SuperUserGuard, conditionner les éléments debug à isSuperUser |
| `src/pages/ForecastTradeGenerator.tsx` | Supprimer SuperUserGuard, conditionner badges et debug à isSuperUser |
| `src/components/PersistentNotificationProvider.tsx` | Mettre à jour les routes dans mapFeatureToRoute |
| `src/components/GlobalLoadingProvider.tsx` | Mettre à jour navigationMap |

---

## Garanties de non-régression

- Les anciennes routes `/forecast-playground/*` restent fonctionnelles (redirect ou alias)
- Le hub Forecast Playground reste accessible uniquement aux super-utilisateurs
- Les pages AISetup et MacroAnalysis existantes restent inchangées
- Le système de job tracking et notifications continue de fonctionner
- Les éléments de debug ne sont visibles que pour les super-utilisateurs
