
# Plan : Correction du toaster de chargement persistant après réception de la réponse

## Diagnostic

Le toaster de chargement reste affiché même après la réception de la réponse du backend car la logique de conditions dans `PersistentNotificationProvider.tsx` est incorrecte.

### Cause racine identifiée

Dans le gestionnaire d'événements `UPDATE` de Supabase Realtime (lignes 209-224), les conditions sont mutuellement exclusives via `else if` :

```typescript
} else if (updatedJob.progress_message) {
  // Met à jour le message de progression...
  // MAIS ne vérifie PAS si le job est completed !
} else if (updatedJob.status === 'completed' && updatedJob.response_payload) {
  // Cette branche N'EST JAMAIS ATTEINTE si progress_message existe
  setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
}
```

### Preuve en base de données

Les jobs complétés ont tous un `progress_message` non-null :
| Job ID | Status | progress_message | has_response_payload |
|--------|--------|------------------|---------------------|
| 9dea3b06... | completed | "Reading the news" | YES |
| 72f95e3f... | completed | "Reading the news" | YES |
| b414517b... | completed | "Reading the news" | YES |

Quand le backend met à jour le job avec `status: 'completed'` ET `response_payload`, le champ `progress_message` reste présent. La condition `else if (updatedJob.progress_message)` est donc vraie, et la branche `completed` n'est jamais exécutée.

**Résultat** : Le job reste dans `activeJobs` indéfiniment, et le toaster continue de s'afficher.

## Solution

Réorganiser les conditions pour prioriser la vérification du statut `completed`/`error` avant la vérification de `progress_message`.

### Modification

**Fichier** : `src/components/PersistentNotificationProvider.tsx`

**Lignes concernées** : 201-324 (bloc UPDATE)

**Logique actuelle (problématique)** :
```text
1. Si status === 'running' → mettre à jour
2. SINON SI progress_message existe → mettre à jour le message (BLOQUE la suite)
3. SINON SI status === 'completed' && response_payload → retirer de activeJobs
4. SINON SI status === 'error' → retirer de activeJobs
```

**Nouvelle logique (correcte)** :
```text
1. SI status === 'completed' && response_payload → retirer de activeJobs (PRIORITAIRE)
2. SINON SI status === 'error' → retirer de activeJobs (PRIORITAIRE)
3. SINON SI status === 'running' → mettre à jour le statut
4. SINON SI progress_message existe → mettre à jour le message
```

Cette réorganisation garantit que même si un job a un `progress_message`, sa complétion sera traitée correctement.

## Changements de code

### PersistentNotificationProvider.tsx

Réorganiser l'ordre des conditions dans le bloc UPDATE (lignes ~196-324) pour vérifier `completed`/`error` EN PREMIER :

```typescript
(payload) => {
  const updatedJob = payload.new as any;
  
  console.log('🔄 [PersistentNotifications] Job UPDATE:', updatedJob);
  
  // PRIORITÉ 1: Vérifier la complétion AVANT les messages de progression
  if (updatedJob.status === 'completed' && updatedJob.response_payload) {
    // Stop mock simulator on completion
    mockSimulatorsActive.current.set(updatedJob.id, false);
    
    // Move from active to completed
    console.log('✅ [PersistentNotifications] Job completed, moving to completed list');
    
    // ... (extraction des données - code existant)
    
    setActiveJobs(prev => prev.filter(job => job.id !== updatedJob.id));
    
    // ... (création de completedJob et flash message - code existant)
    
  } else if (updatedJob.status === 'error') {
    // PRIORITÉ 2: Gérer les erreurs
    // ... (code existant)
    
  } else if (updatedJob.status === 'running') {
    // PRIORITÉ 3: Mettre à jour le statut running
    setActiveJobs(prev => prev.map(job => 
      job.id === updatedJob.id 
        ? { ...job, status: 'running', progressMessage: updatedJob.progress_message }
        : job
    ));
    console.log('🔄 [PersistentNotifications] Job set to running');
    
  } else if (updatedJob.progress_message) {
    // PRIORITÉ 4: Mettre à jour le message de progression (seulement si pas encore completed)
    // Stop mock simulator when real backend message arrives
    const wasActive = mockSimulatorsActive.current.get(updatedJob.id);
    if (wasActive) {
      console.log(`🛑 [PersistentNotifications] Stopping mock simulator for job ${updatedJob.id}`);
      mockSimulatorsActive.current.set(updatedJob.id, false);
    }
    
    setActiveJobs(prev => prev.map(job => 
      job.id === updatedJob.id 
        ? { ...job, progressMessage: updatedJob.progress_message }
        : job
    ));
  }
}
```

## Résumé des modifications

| Fichier | Modification | Impact |
|---------|--------------|--------|
| `PersistentNotificationProvider.tsx` | Réorganiser les conditions if/else if dans le handler UPDATE | Le job sera retiré de `activeJobs` dès qu'il est completed, même si `progress_message` existe |

## Garanties

- Aucune modification de logique métier
- Aucune modification d'API/backend
- Aucune suppression de fonctionnalité
- Comportement attendu : le toaster disparaît dès réception de la réponse

## Section technique

### Pourquoi le problème se manifeste maintenant ?

Le backend a été mis à jour pour envoyer des messages de progression (`progress_message`) pendant le traitement. Avant cette mise à jour, les jobs n'avaient pas de `progress_message` au moment de la complétion, donc la branche `completed` était atteinte normalement.

### Flux de données corrigé

```text
1. ForecastMacroLab.createJob() → INSERT en base
2. PersistentNotificationProvider reçoit INSERT → ajoute à activeJobs
3. Backend traite → UPDATE avec progress_message
4. PersistentNotificationProvider reçoit UPDATE → met à jour progressMessage
5. Backend termine → UPDATE avec status='completed' + response_payload (+ progress_message toujours présent)
6. PersistentNotificationProvider reçoit UPDATE → 
   ✅ MAINTENANT: vérifie d'abord completed → retire de activeJobs
   ❌ AVANT: vérifie d'abord progress_message → bloqué
```
