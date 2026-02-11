

# Patch minimal PersistentToast : Fix zombie + Alignement visuel

## 1) Fix bug "zombie toast" (spinner qui tourne sans jobs)

### Probleme

La condition de sortie `if (totalCount === 0) return null` (ligne 144) depend de `totalCount = activeJobs.length + completedJobs.length + flashMessages.length`. Quand tous les jobs sont dismiss via `markJobAsViewed`, les arrays se vident et le composant return null. Cependant, deux cas edge provoquent un etat zombie :

- **Index invalide** : Apres le dismiss du dernier job, `selectedJobIndex` peut pointer vers un index hors limites pendant un tick de render. Le `currentJob` est alors `undefined`, mais le toast reste visible car `totalCount` n'est pas encore 0 (les `useEffect` de clamp s'executent apres le render).
- **Flash messages residuels** : Si un `flashMessage` existe encore (pas de timeout auto sur certains types), `totalCount > 0` et le toast affiche un spinner car `allJobs` est vide mais le composant ne return pas null.

### Correctif

- Ajouter un guard supplementaire : si `allJobs.length === 0` et `flashMessages.length === 0`, return null immediatement (plus robuste que `totalCount`).
- Clamper `selectedJobIndex` de maniere synchrone (avec `useMemo` ou directement dans le render) au lieu de `useEffect` asynchrone, pour eviter un frame avec index invalide.
- Reset `selectedJobIndex` a 0 dans le handler de `markJobAsViewed` quand le job dismiss etait le dernier.

### Fichier : `src/components/PersistentToast.tsx`

```typescript
// Remplacer le clamp via useEffect par un clamp synchrone
const safeIndex = allJobs.length > 0 
  ? Math.min(selectedJobIndex, allJobs.length - 1) 
  : 0;
const currentJob = allJobs[safeIndex];

// Guard de sortie renforce (ligne 144)
if (allJobs.length === 0 && flashMessages.length === 0) return null;
```

Supprimer les deux `useEffect` de clamp (lignes 36-48) qui sont desormais inutiles et source de desynchronisation.

---

## 2) Alignement visuel avec le design system AlphaLens

### Probleme

Le composant utilise `shadow-elegant` (classe inexistante dans le tailwind config), `border-primary/20` (border blanche tres subtile sur fond quasi-noir = quasi invisible), et des styles generiques qui ne s'integrent pas au glossy-black theme du site (fond `#0a0a0a`, cards `#0d0d0d`, borders `hsl(0 0% 20%)`).

### Correctif (styles uniquement, zero changement structurel)

**Card principale (expanded)** :
- `shadow-elegant` → `shadow-[0_8px_30px_rgba(0,0,0,0.6)]` (correspond a `--shadow-medium`)
- `border-primary/20` → `border-border` (utilise le token `--border: 0 0% 20%`)
- `bg-card/95 backdrop-blur-sm` → `bg-card/98 backdrop-blur-md` (plus opaque, blur plus prononce pour le glossy effect)

**Card minimisee (bubble)** :
- `shadow-lg border-0 bg-card` → `shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-border/50 bg-card` (ajout d'une bordure subtile pour ancrer visuellement la bulle)

**Hover preview desktop** :
- Memes corrections : `shadow-elegant` → `shadow-[var(--shadow-medium)]`, `border-primary/20` → `border-border`

**Boutons et controles** :
- `hover:bg-muted` → `hover:bg-white/[0.06]` (conforme a la memoire `high-contrast-hover-preference`)
- Chips status : garder `bg-primary/10` et `bg-success/10` (deja coherents)

**Liste items** :
- `hover:bg-muted/50` → `hover:bg-white/[0.06]`
- `bg-primary/10 ring-1 ring-primary/20` → `bg-white/[0.06] ring-1 ring-border` (selection plus subtile)

### Fichier : `src/components/PersistentToast.tsx`

Uniquement des remplacements de classes CSS, aucun changement de structure JSX.

---

## Ce qui ne change pas

- Logique UX (dismiss job-by-job, single/list view, minimize, drag)
- PersistentNotificationProvider (aucun changement)
- MiniProgressBubble (aucun changement)
- Realtime, credits, navigation, session
- Structure JSX du composant

## Resultat attendu

- Zero etat zombie : quand plus aucun job/flash n'existe, le composant disparait immediatement et de maniere deterministe
- Le toast s'integre visuellement au reste du site (glossy black, borders coherentes, shadows du design system, hovers haute visibilite)
