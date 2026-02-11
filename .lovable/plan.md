

# Optimisation Performance : Navigation + Temps de chargement

## Diagnostic des points lents

Apres analyse du codebase, voici les causes principales de latence :

1. **useProfile fait un fetch Supabase a chaque navigation** via AuthGuard (chaque route protegee = 1 requete profiles + 1 souscription realtime)
2. **useNewsFeed appelle une edge function** a chaque montage du dashboard (pas de cache inter-session)
3. **AURA.tsx (1170 lignes)** est charge dans Layout.tsx meme quand l'utilisateur ne l'utilise pas - le lazy est fait mais le composant reste lourd
4. **QueryClient sans staleTime** = chaque navigation re-fetch toutes les queries
5. **Images sans lazy loading** (header_logo, footer_logo charges immediatement)
6. **Plotly.js** (3MB+) est dans les dependances et potentiellement bundle au demarrage

## Actions par priorite

### A) Cache et deduplication des fetches (impact majeur)

**`src/App.tsx`** : Configurer le QueryClient avec un `staleTime` global de 5 minutes et un `gcTime` de 10 minutes. Cela empeche les re-fetches inutiles lors des navigations entre pages.

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min
      gcTime: 10 * 60 * 1000,       // 10 min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**`src/hooks/useProfile.tsx`** : Migrer vers `useQuery` de TanStack Query au lieu de `useState` + `useEffect` manuel. Le profil est fetch une seule fois et cache pendant toute la session. La souscription realtime reste pour les updates en temps reel mais ne re-fetch plus a chaque montage.

### B) Prefetch intelligent des routes (navigation percue)

**`src/components/Layout.tsx`** : Ajouter un prefetch des routes principales au hover sur les boutons de navigation. Utiliser `router.prefetch` ou un simple `import()` dynamique au `onMouseEnter` sur les liens Dashboard, Trade Generator, Macro Lab, Reports.

```typescript
const prefetchRoute = (path: string) => {
  const routeMap: Record<string, () => Promise<any>> = {
    '/dashboard': () => import('@/pages/TradingDashboard'),
    '/trade-generator': () => import('@/pages/ForecastTradeGenerator'),
    '/macro-lab': () => import('@/pages/ForecastMacroLab'),
    '/reports': () => import('@/pages/Reports'),
  };
  routeMap[path]?.();
};
```

### C) Memoization des composants lourds

**`src/pages/TradingDashboard.tsx`** : Wrapper les sous-composants stables (`CandlestickChart`, `DashboardColumnCarousel`, `AssetInfoCard`) avec `React.memo` pour eviter les re-renders quand seul l'asset change.

**`src/components/Layout.tsx`** : Memoiser le header et le footer avec `useMemo` car ils ne changent que lors du signOut/signIn.

### D) Lazy loading des assets media

**`index.html`** : Ajouter `fetchpriority="high"` au preload du header_logo et `loading="lazy"` aux images non-critiques (footer_logo, logos secondaires).

**`src/components/Layout.tsx`** et **`src/components/Footer.tsx`** : Ajouter `loading="lazy"` aux balises `<img>` du footer.

### E) Exclusion de Plotly du bundle initial

**`vite.config.ts`** : Ajouter `plotly.js` et `react-plotly.js` dans un chunk separe `vendor-plotly` pour eviter de charger 3MB+ au demarrage. Ces libs ne sont utilisees que dans les pages Labs.

```typescript
manualChunks: {
  // ...existing chunks...
  'vendor-plotly': ['plotly.js', 'react-plotly.js'],
}
```

### F) Skeleton de transition coherent

**`src/App.tsx`** : Remplacer le `<div className="min-h-screen bg-background" />` Suspense fallback par un skeleton minimal mais structure (header placeholder + zone de contenu) pour eviter le layout shift. Garder l'approche minimaliste mais ajouter un placeholder pour le header (meme hauteur que le vrai header = `h-14 sm:h-16`).

```tsx
<Suspense fallback={
  <div className="min-h-screen bg-background">
    <div className="h-14 sm:h-16 border-b border-white/5 bg-background" />
  </div>
}>
```

## Ce qui ne change pas

- Logique metier, auth, permissions, API calls
- Structure des routes et AuthGuard
- Fonctionnalites existantes (credits, jobs, realtime, AURA)
- Design system et identite visuelle
- Mobile layout

## Resultat attendu

- Navigation Dashboard <-> pages principales ~200-400ms plus rapide (cache profile + staleTime queries)
- Zero re-fetch inutile lors du retour sur une page deja visitee
- Prefetch au hover = chargement quasi-instantane des routes principales
- Bundle initial reduit de ~3MB (plotly isole)
- Zero layout shift entre les transitions (skeleton header stable)

