
# Plan : Correction de l'architecture Realtime pour le suivi des jobs

## Problème identifié

L'architecture actuelle présente une **fragmentation d'état** entre plusieurs composants :

1. **`JobStatusCards`** (en haut à gauche) appelle `useRealtimeJobManager()` directement, créant une **nouvelle instance d'état isolée**
2. **`ForecastMacroLab`** utilise aussi `useRealtimeJobManager()` pour `createJob()`, mais avec un état séparé
3. **`PersistentNotificationProvider`** gère son propre état `activeJobs` via `supabase.channel()` direct
4. **`DiscreetJobStatus`** (badge central) utilise `activeJobs` du `PersistentNotificationProvider`

**Résultat** : Le job créé par MacroLab n'est **jamais visible** par `JobStatusCards` car ils utilisent des états différents.

## Architecture actuelle (problématique)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                           App.tsx                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  PersistentNotificationProvider                                  ││
│  │  ├── activeJobs (état A)                                         ││
│  │  └── supabase.channel() - INSERT/UPDATE/DELETE                   ││
│  │                                                                   ││
│  │  JobStatusCards                                                   ││
│  │  ├── useRealtimeJobManager() → activeJobs (état B - ISOLÉ)        ││
│  │  └── subscribeToPostgresChanges() - UPDATE only                   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  ForecastMacroLab                                                ││
│  │  ├── useRealtimeJobManager().createJob() → activeJobs (état C)   ││
│  │  └── supabase.channel() local - UPDATE only (fallback)           ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘

État A ≠ État B ≠ État C  →  Jobs créés invisibles aux cards!
```

## Solution : Unification de l'état

### Option retenue : Supprimer `JobStatusCards` et utiliser l'état centralisé

`PersistentNotificationProvider` écoute déjà les événements **INSERT**, **UPDATE**, et **DELETE** sur la table `jobs`. Son état `activeJobs` est accessible via le hook `usePersistentNotifications()`.

La solution la plus simple sans régression :
1. **Supprimer** l'import et l'usage de `JobStatusCards` (qui utilise un état isolé)
2. **Conserver** `DiscreetJobStatus` qui affiche déjà correctement les jobs actifs depuis `PersistentNotificationProvider`
3. **Optionnel** : Créer un nouveau composant de cards qui consomme `usePersistentNotifications()` au lieu de `useRealtimeJobManager()`

## Modifications

### Fichier 1 : `src/App.tsx`

**Supprimer** l'import et l'usage de `JobStatusCards` qui crée une instance isolée.

Lignes concernées :
- Ligne 15 : supprimer `import { JobStatusCards } from "@/components/JobStatusCards";`
- Ligne 86 : supprimer `<JobStatusCards />`

### Fichier 2 : `src/components/Layout.tsx`

Le composant `DiscreetJobStatus` utilise déjà `usePersistentNotifications()` via le Layout. Il reste fonctionnel et affiche les jobs actifs.

**Aucune modification requise** - le badge central continue de fonctionner.

### Fichier 3 (optionnel) : Nouveau composant `JobStatusCardsUnified.tsx`

Si les cards en haut à gauche sont souhaitées, créer un nouveau composant qui utilise `usePersistentNotifications()` :

```typescript
import { usePersistentNotifications } from "@/components/PersistentNotificationProvider";

export function JobStatusCardsUnified() {
  const { activeJobs } = usePersistentNotifications();
  
  // Affiche les cards basées sur l'état centralisé
  // ...
}
```

## Résumé des changements

| Fichier | Action | Impact |
|---------|--------|--------|
| `src/App.tsx` | Supprimer `JobStatusCards` | Élimine l'état isolé |
| `src/components/JobStatusCards.tsx` | Conserver (optionnel cleanup) | Peut être supprimé ou refactoré |
| `src/components/Layout.tsx` | Aucun | `DiscreetJobStatus` reste fonctionnel |

## Comportement après correction

1. **MacroLab** crée un job via `useRealtimeJobManager().createJob()` → INSERT en base
2. **PersistentNotificationProvider** reçoit l'événement INSERT → ajoute le job à son `activeJobs`
3. **DiscreetJobStatus** (badge central) affiche immédiatement le job via `usePersistentNotifications()`
4. **Backend** met à jour le job avec `response_payload`
5. **PersistentNotificationProvider** reçoit l'événement UPDATE → déplace le job vers `completedJobs`
6. **Flash message** s'affiche pour notifier la completion

## Section technique

### Pourquoi `useRealtimeJobManager` ne fonctionne pas en tant que source partagée ?

Le hook `useRealtimeJobManager()` utilise `useState` localement. Chaque composant qui l'appelle obtient une **instance d'état indépendante**. Seul le composant qui appelle `createJob()` verra le job dans son état local.

Pour partager un état entre composants, il faut soit :
- Un **Context Provider** (ce que fait `PersistentNotificationProvider`)
- Un **state manager** global (Zustand, Jotai, Redux)

### Vérification de la configuration Realtime

La table `jobs` a `REPLICA IDENTITY FULL` activé, ce qui permet à Supabase Realtime de transmettre les anciennes et nouvelles valeurs lors des UPDATE/DELETE.

### Risque de régression

**Aucun** - `DiscreetJobStatus` utilise déjà le bon état centralisé. La suppression de `JobStatusCards` élimine simplement un composant qui n'affichait rien car son état était toujours vide.
