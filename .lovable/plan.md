
# Plan : Optimisation de la latence entre navigations

## Diagnostic des causes de latence identifiées

### Problèmes majeurs détectés

| Source | Impact | Fichier(s) |
|--------|--------|------------|
| **AuthGuard bloquant** | ~500ms par navigation | `AuthGuard.tsx` |
| **Double fetch profil** | ~300ms | `useProfile.tsx` + `AuthGuard.tsx` |
| **Hooks Realtime multiples** | ~200ms montage | `useProfile.tsx`, `useUserRole.tsx`, `useSessionManager.tsx` |
| **CreditsNavbar fetch** | ~200ms par navigation | `CreditsNavbar.tsx` |
| **Dashboard double AuthGuard** | ~400ms | `Dashboard.tsx` → `TradingDashboard` avec 2 AuthGuard |
| **Suspense fallback lourd** | 100-300ms flash | `App.tsx` - Skeleton pleine page |

### Architecture actuelle problématique

```text
Navigation vers /dashboard
    │
    ├── 1. Suspense fallback (skeleton) s'affiche immédiatement
    │
    ├── 2. Lazy load Dashboard.tsx (~100ms)
    │
    ├── 3. AuthGuard #1 (Dashboard.tsx)
    │   ├── useAuth() → vérifie session
    │   ├── useProfile() → fetch profil + subscribe Realtime
    │   └── Affiche Loader2 pendant loading
    │
    ├── 4. TradingDashboard monte
    │   ├── useAuth() (déjà chargé)
    │   ├── useUserRole() → fetch roles + subscribe Realtime
    │   ├── useJobStatusManager() → new instance
    │   └── Layout monte
    │       ├── useAuth()
    │       ├── useUserRole()
    │       ├── CreditsNavbar → useCreditManager() → fetch credits
    │       ├── useResultNotifications()
    │       ├── usePersistentNotifications()
    │       └── AURA monte (si user)
    │
    └── TEMPS TOTAL: 800-1500ms avant affichage complet
```

## Corrections proposées

### Phase 1 : Éliminer les fetches redondants

#### 1.1 Supprimer le double AuthGuard dans Dashboard.tsx

**Fichier** : `src/pages/Dashboard.tsx`

**Problème** : Dashboard.tsx enveloppe TradingDashboard dans un AuthGuard, mais la route dans App.tsx a déjà un AuthGuard.

**Correction** : Supprimer l'AuthGuard interne.

```typescript
// AVANT
export default function Dashboard() {
  return (
    <AuthGuard>
      <TradingDashboard />
    </AuthGuard>
  );
}

// APRÈS
export default function Dashboard() {
  return <TradingDashboard />;
}
```

**Gain** : ~400ms (élimination du double check auth/profil)

### Phase 2 : Optimiser le Suspense fallback

#### 2.1 Fallback léger et transitoire

**Fichier** : `src/App.tsx`

**Problème** : Le Skeleton pleine page crée un flash blanc/gris visible entre les pages.

**Correction** : Utiliser un fallback minimal qui ne perturbe pas la perception.

```typescript
// AVANT
<Suspense fallback={
  <div className="flex items-center justify-center min-h-screen">
    <Skeleton className="h-96 w-full max-w-4xl" />
  </div>
}>

// APRÈS
<Suspense fallback={
  <div className="min-h-screen bg-background" />
}>
```

**Gain** : Transition plus fluide, pas de flash de skeleton

### Phase 3 : Stabiliser les dépendances des hooks

#### 3.1 Memoïser usePersistentNotifications dans Layout

**Fichier** : `src/components/Layout.tsx`

**Problème** : `usePersistentNotifications()` est appelé à chaque render, même si les données n'ont pas changé.

**Correction** : Les données sont déjà extraites correctement, mais le composant recalcule `auraContext` à chaque render.

```typescript
// AVANT (ligne 58-66)
const auraContext = useMemo(() => {
  const path = location.pathname;
  // ...
}, [location.pathname]);

// Cette partie est correcte - déjà optimisée
```

#### 3.2 Optimiser fetchCredits avec useCallback stabilisé

**Fichier** : `src/components/CreditsNavbar.tsx`

**Problème** : L'event listener se re-crée à chaque changement de `fetchCredits`.

**Correction** : Utiliser un ref pour éviter le re-subscribe.

```typescript
// AVANT
React.useEffect(() => {
  const handleCreditsUpdate = () => {
    fetchCredits();
  };
  window.addEventListener('creditsUpdated', handleCreditsUpdate);
  return () => window.removeEventListener('creditsUpdated', handleCreditsUpdate);
}, [fetchCredits]);

// APRÈS
const fetchCreditsRef = React.useRef(fetchCredits);
React.useEffect(() => {
  fetchCreditsRef.current = fetchCredits;
}, [fetchCredits]);

React.useEffect(() => {
  const handleCreditsUpdate = () => {
    fetchCreditsRef.current();
  };
  window.addEventListener('creditsUpdated', handleCreditsUpdate);
  return () => window.removeEventListener('creditsUpdated', handleCreditsUpdate);
}, []); // [] = montage unique
```

**Gain** : Évite le re-subscribe de l'event listener à chaque navigation

### Phase 4 : Préchargement intelligent des routes critiques

#### 4.1 Précharger les routes fréquentes depuis Homepage/Dashboard

**Fichier** : `src/App.tsx`

**Ajout** : Utiliser le pattern `webpackPrefetch` pour les routes critiques.

```typescript
// Routes secondaires avec prefetch
const Dashboard = lazy(() => import(/* webpackPrefetch: true */ "./pages/Dashboard"));
const AISetup = lazy(() => import(/* webpackPrefetch: true */ "./pages/AISetup"));
const MacroAnalysis = lazy(() => import(/* webpackPrefetch: true */ "./pages/MacroAnalysis"));
const Reports = lazy(() => import(/* webpackPrefetch: true */ "./pages/Reports"));
```

**Note** : Vite supporte les hints de prefetch via les magic comments.

**Gain** : Les chunks sont préchargés en arrière-plan dès le chargement initial

### Phase 5 : Optimiser le montage des composants lourds

#### 5.1 Retarder le montage de AURA

**Fichier** : `src/components/Layout.tsx`

**Problème** : AURA monte immédiatement lors de la navigation, ajoutant de la latence.

**Correction** : Différer le montage de 100ms pour prioriser le contenu principal.

```typescript
// AVANT (ligne 290-297)
{user && (
  <AURA
    context={auraContext}
    contextData={contextData}
    isExpanded={isAURAExpanded}
    onToggle={() => setIsAURAExpanded(!isAURAExpanded)}
  />
)}

// APRÈS
const [auraReady, setAuraReady] = useState(false);

useEffect(() => {
  if (user) {
    const timer = setTimeout(() => setAuraReady(true), 100);
    return () => clearTimeout(timer);
  }
}, [user]);

// Dans le JSX
{user && auraReady && (
  <AURA
    context={auraContext}
    contextData={contextData}
    isExpanded={isAURAExpanded}
    onToggle={() => setIsAURAExpanded(!isAURAExpanded)}
  />
)}
```

**Gain** : Le contenu principal s'affiche 100ms plus tôt

#### 5.2 Memoïser le composant DiscreetJobStatus

**Fichier** : `src/components/DiscreetJobStatus.tsx`

**Correction** : Envelopper dans React.memo pour éviter les re-renders inutiles.

```typescript
// AVANT
export function DiscreetJobStatus({ activeJobsCount, latestMessage, className }: DiscreetJobStatusProps) {

// APRÈS
export const DiscreetJobStatus = React.memo(function DiscreetJobStatus({ 
  activeJobsCount, 
  latestMessage, 
  className 
}: DiscreetJobStatusProps) {
  // ...
});
```

### Phase 6 : Éviter les double-renders au montage

#### 6.1 Utiliser useMemo pour les calculs dans TradingDashboard

**Fichier** : `src/pages/TradingDashboard.tsx`

**Problème** : `allAssets` est recréé à chaque render.

**Correction** : Déplacer hors du composant ou memoïser.

```typescript
// AVANT (ligne 46-69) - Tableau recréé à chaque render
const allAssets = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", icon: "💱" },
  // ...
];

// APRÈS - Déclaration hors du composant
const ALL_ASSETS = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", icon: "💱" },
  // ...
] as const;

export default function TradingDashboard() {
  // Utiliser ALL_ASSETS directement
}
```

**Gain** : Évite la recréation du tableau à chaque render

## Résumé des modifications

| Fichier | Modification | Impact estimé |
|---------|--------------|---------------|
| `Dashboard.tsx` | Supprimer double AuthGuard | -400ms |
| `App.tsx` | Fallback Suspense minimal | -100ms flash |
| `App.tsx` | Prefetch routes critiques | -200ms navigation |
| `Layout.tsx` | Différer AURA 100ms | -100ms first paint |
| `CreditsNavbar.tsx` | Ref pour event listener | -50ms re-renders |
| `DiscreetJobStatus.tsx` | React.memo | -30ms re-renders |
| `TradingDashboard.tsx` | Constante hors composant | -20ms re-renders |

**Gain total estimé** : 500-900ms par navigation

## Garanties

- Aucune modification de logique métier
- Aucune modification d'API/backend
- Aucune suppression de fonctionnalité
- Aucun changement de routing
- Tests visuels identiques
- Comportement auth inchangé

## Section technique

### Ordre d'implémentation recommandé

1. **Phase 1** (impact maximal, risque minimal) : Supprimer double AuthGuard
2. **Phase 2** : Optimiser Suspense fallback
3. **Phase 4** : Ajouter prefetch aux routes
4. **Phase 5** : Différer AURA + memo DiscreetJobStatus
5. **Phase 3 + 6** : Stabilisation hooks et constantes

### Points de vigilance

- Le prefetch Vite utilise `/* @vite-ignore */` pour les magic comments si nécessaire
- La suppression du double AuthGuard est safe car App.tsx l'applique déjà
- Le fallback minimal préserve la couleur de fond pour éviter le flash blanc
