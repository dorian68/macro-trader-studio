
# Plan : Activer la consommation de crédits dans ForecastMacroLab

## Contexte

Actuellement, la page ForecastMacroLab (`/forecast-playground/macro-commentary`) **bypass intentionnellement** le système de crédits avec ce commentaire :

```typescript
// Macro Lab is a superuser-only testing tool: do NOT require credits on this page.
// (Credits remain enforced everywhere else.)
```

L'utilisateur souhaite que MacroLabs consomme les crédits de type `queries` (macro commentary) au même titre que la page MacroAnalysis.

## Analyse comparative

| Aspect | MacroAnalysis | ForecastMacroLab |
|--------|---------------|------------------|
| Import `useCreditEngagement` | ✅ Ligne 25 | ❌ Absent |
| Hook `tryEngageCredit` | ✅ Ligne 74 | ❌ Absent |
| Appel `tryEngageCredit('queries', jobId)` | ✅ Lignes 731-748 | ❌ Absent |
| Nettoyage du job si crédits insuffisants | ✅ Lignes 735-739 | ❌ Absent |

## Modifications requises

### Fichier : `src/pages/ForecastMacroLab.tsx`

#### 1. Ajouter l'import du hook

Après la ligne 33 :
```typescript
import { useCreditEngagement } from '@/hooks/useCreditEngagement';
```

#### 2. Initialiser le hook dans le composant

Après la ligne 82 (après `const { createJob } = useRealtimeJobManager();`) :
```typescript
const { tryEngageCredit } = useCreditEngagement();
```

#### 3. Intégrer la logique de crédits dans `generateAnalysis()`

Après la création du job (ligne 489) et avant le commentaire de bypass (lignes 536-537), ajouter :

```typescript
// ✅ ATOMIC: Try to engage credit
const creditResult = await tryEngageCredit('queries', responseJobId);
if (!creditResult.success) {
  console.log('❌ [MacroLabs] Credit engagement failed, cleaning up job:', responseJobId);
  
  // Nettoyer le job orphelin
  await supabase
    .from('jobs')
    .delete()
    .eq('id', responseJobId);
  
  toast({
    title: "Insufficient Credits",
    description: "You've run out of credits. Please recharge to continue using AlphaLens.",
    variant: "destructive"
  });
  setIsGenerating(false);
  setJobStatus("");
  return;
}

console.log('✅ [MacroLabs] Credit engaged successfully. Available:', creditResult.available);
```

#### 4. Supprimer le commentaire de bypass

Supprimer les lignes 536-537 :
```typescript
// Macro Lab is a superuser-only testing tool: do NOT require credits on this page.
// (Credits remain enforced everywhere else.)
```

## Résumé des modifications

| Ligne(s) | Action | Description |
|----------|--------|-------------|
| ~34 | Ajouter import | `import { useCreditEngagement } from '@/hooks/useCreditEngagement';` |
| ~83 | Ajouter hook | `const { tryEngageCredit } = useCreditEngagement();` |
| ~510-530 | Ajouter logique | Vérification atomique des crédits après création du job |
| ~536-537 | Supprimer | Commentaire de bypass des crédits |

## Garanties

- Aucune modification de l'API ou du backend
- Même type de crédit utilisé (`queries`) que MacroAnalysis
- Même comportement en cas de crédits insuffisants (toast + cleanup du job)
- Le trigger PostgreSQL `auto_manage_credits` gère automatiquement la déduction à la completion du job
- SuperUserGuard reste en place (accès réservé aux super-utilisateurs), mais les crédits sont maintenant consommés

## Section technique

### Flux de crédits après modification

```text
1. User clique "Generate"
2. ForecastMacroLab.generateAnalysis()
   ├── createJob() → job inséré en base (status: pending)
   ├── tryEngageCredit('queries', jobId)
   │   ├── RPC try_engage_credit()
   │   │   ├── Vérifie credits_queries_remaining > engaged_count
   │   │   ├── INSERT INTO credits_engaged
   │   │   └── Retourne { success: true/false }
   │   └── Si échec → DELETE job, affiche toast, return
   ├── HTTP POST → backend
   └── Backend UPDATE job (status: completed)
       └── Trigger auto_manage_credits()
           ├── DELETE FROM credits_engaged WHERE job_id = X
           └── credits_queries_remaining -= 1
```

### Cohérence avec MacroAnalysis

La logique est identique à celle de MacroAnalysis (lignes 730-750), garantissant un comportement uniforme sur les deux pages.
