
# Plan : Intégration des crédits et du toaster de chargement pour Trade Generator

## Résumé des 3 demandes

| Demande | État actuel | Action requise |
|---------|-------------|----------------|
| **1. Crédits Trade Generator** | Pas de gestion de crédits (fetch direct sans job) | Ajouter `useRealtimeJobManager` + `useCreditEngagement` avec type `ideas` |
| **2. Navbar crédits temps réel** | Mise à jour après navigation uniquement | Dispatch `creditsUpdated` après complétion du job via trigger PostgreSQL |
| **3. Toaster de chargement** | Pas de toaster (state `loading` local) | Utiliser le job pour déclencher `PersistentNotificationProvider` |

---

## Diagnostic technique

### Problème 1 : Trade Generator sans crédits

**Fichier** : `src/pages/ForecastTradeGenerator.tsx`

Actuellement, la page effectue un appel HTTP direct sans :
- Création de job en base (pas d'INSERT dans `jobs`)
- Engagement de crédit via `tryEngageCredit()`
- Déclenchement du trigger `auto_manage_credits`

```typescript
// Ligne 1575-1590 : fetch direct sans job
const response = await fetch(MACRO_LAB_PROXY_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(macroPayload),
});
```

### Problème 2 : Navbar non mise à jour en temps réel

Le trigger PostgreSQL `auto_manage_credits` décrémente les crédits automatiquement lors de la complétion d'un job, mais le frontend n'est pas notifié.

**Solution** : Le `PersistentNotificationProvider` doit dispatcher l'événement `creditsUpdated` lors de la complétion d'un job.

### Problème 3 : Pas de toaster de chargement

La page utilise un state `loading` local au lieu de créer un job qui serait intercepté par `PersistentNotificationProvider`.

---

## Solution

### Phase 1 : Ajouter les imports et hooks dans Trade Generator

**Fichier** : `src/pages/ForecastTradeGenerator.tsx`

Ajouter les imports manquants :
```typescript
import { useRealtimeJobManager } from "@/hooks/useRealtimeJobManager";
import { useCreditEngagement } from "@/hooks/useCreditEngagement";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
```

Initialiser les hooks dans le composant :
```typescript
const { user } = useAuth();
const { toast } = useToast();
const { createJob } = useRealtimeJobManager();
const { tryEngageCredit } = useCreditEngagement();
```

### Phase 2 : Refactoriser `handleSubmit` pour utiliser le pattern job

**Fichier** : `src/pages/ForecastTradeGenerator.tsx`

Modifier `handleSubmit` pour :
1. Créer un job avec `createJob()` (déclenche INSERT -> toaster apparaît)
2. Engager le crédit avec `tryEngageCredit('ideas', jobId)`
3. Nettoyer le job si engagement échoue
4. Continuer avec le fetch HTTP

```typescript
const handleSubmit = async () => {
  setLoading(true);
  setError(null);
  // ... reset states ...

  try {
    // 1. Créer le job FIRST (déclenche PersistentNotificationProvider)
    const jobId = await createJob(
      'ai_trade_setup',
      symbol,
      { type: 'RAG', mode: 'trade_generation', instrument: symbol },
      'AI Trade Setup' // feature name for display
    );

    // 2. Engager le crédit (type 'ideas' comme AI Trade Setup)
    const creditResult = await tryEngageCredit('ideas', jobId);
    if (!creditResult.success) {
      // Nettoyer le job orphelin
      await supabase.from('jobs').delete().eq('id', jobId);
      
      toast({
        title: "Insufficient Credits",
        description: "You've run out of credits. Please recharge to continue using AlphaLens.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    // 3. Continuer avec le fetch HTTP (inclure job_id)
    const macroPayload = {
      job_id: jobId,
      // ... reste du payload existant
    };

    const response = await fetch(MACRO_LAB_PROXY_URL, { ... });
    
    // 4. Mettre à jour le job avec la réponse
    if (response.ok) {
      const data = await response.json();
      await supabase.from('jobs').update({
        status: 'completed',
        response_payload: data
      }).eq('id', jobId);
    } else {
      await supabase.from('jobs').update({
        status: 'error'
      }).eq('id', jobId);
    }
    
    // ... traitement de la réponse existant ...
    
  } finally {
    setLoading(false);
  }
};
```

### Phase 3 : Dispatch `creditsUpdated` après complétion dans PersistentNotificationProvider

**Fichier** : `src/components/PersistentNotificationProvider.tsx`

Dans le handler UPDATE, après avoir traité un job `completed`, dispatcher l'événement pour mettre à jour la navbar :

```typescript
if (updatedJob.status === 'completed' && updatedJob.response_payload) {
  // ... code existant de completion ...
  
  // ✅ Trigger navbar credit update
  window.dispatchEvent(new Event('creditsUpdated'));
  
  // ... reste du code ...
}
```

Également dans le handler `error` :
```typescript
else if (updatedJob.status === 'error') {
  // ... code existant ...
  
  // ✅ Trigger navbar credit update (credit was released by trigger)
  window.dispatchEvent(new Event('creditsUpdated'));
}
```

---

## Résumé des modifications

| Fichier | Modification | Impact |
|---------|--------------|--------|
| `ForecastTradeGenerator.tsx` | Ajouter imports `useRealtimeJobManager`, `useCreditEngagement`, `useAuth`, `supabase`, `useToast` | Préparation |
| `ForecastTradeGenerator.tsx` | Initialiser hooks `createJob`, `tryEngageCredit`, `user`, `toast` | Préparation |
| `ForecastTradeGenerator.tsx` | Refactoriser `handleSubmit` : créer job -> engager crédit -> fetch -> update job status | Crédits + Toaster |
| `PersistentNotificationProvider.tsx` | Ajouter `window.dispatchEvent(new Event('creditsUpdated'))` après complétion/erreur | Navbar temps réel |

---

## Garanties

- Aucune modification de logique métier existante (normalizeN8n, extractors, etc.)
- Aucune modification d'API/backend
- Le type de crédit utilisé est `ideas` (même que AI Trade Setup)
- Le toaster utilise le système existant `PersistentNotificationProvider`
- La navbar se met à jour automatiquement via l'événement `creditsUpdated`
- Le trigger PostgreSQL `auto_manage_credits` gère la déduction des crédits

---

## Section technique

### Flux de données après modification

```text
1. User clique "Generate Trade"
2. ForecastTradeGenerator.handleSubmit()
   ├── createJob('ai_trade_setup', symbol, {}, 'AI Trade Setup')
   │   └── INSERT jobs → PersistentNotificationProvider reçoit INSERT
   │       └── Toaster de chargement apparaît
   ├── tryEngageCredit('ideas', jobId)
   │   ├── Si échec → DELETE job, toast "Insufficient Credits"
   │   └── Si succès → continuer
   ├── fetch(MACRO_LAB_PROXY_URL)
   ├── UPDATE jobs.status = 'completed', response_payload = data
   │   └── Trigger auto_manage_credits() décrémente credits_ideas_remaining
   └── PersistentNotificationProvider reçoit UPDATE
       ├── Toaster disparaît
       ├── Flash message "Analysis Complete"
       └── window.dispatchEvent('creditsUpdated')
           └── CreditsNavbar.fetchCredits() → Navbar mise à jour
```

### Cohérence avec AI Trade Setup

La logique est identique à celle de `src/pages/AISetup.tsx` (lignes 392-412), garantissant un comportement uniforme.
