

# Audit complet du systeme de billing/credits — Vulnerabilites et plan de remediation

## Audit : vulnerabilites identifiees

### CRITIQUE 1 — `initialize_user_credits` ecrase les credits (PARTIELLEMENT CORRIGE)

Le RPC `initialize_user_credits` utilise `ON CONFLICT DO UPDATE SET credits = plan.max_credits`. Il est appele dans :
- `stripe-webhook` : `checkout.session.completed`, `subscription.updated`, `invoice.payment_succeeded`, `subscription.deleted` → **ecrase les credits a chaque appel**
- `renew-credits` : renouvellement periodique → **ecrase les credits restants au lieu de les recharger**
- `useCreditManager.tsx` ligne 82 : auto-initialization pour les nouveaux users sans credits → OK pour le premier appel, mais dangereux si appele deux fois

**Le trial a ete corrige** avec `activate_free_trial_safe` (additif), mais les webhooks Stripe utilisent encore `initialize_user_credits` qui ecrase.

**Scenario de bug actif :** Un utilisateur avec 50 credits queries restants (sur 80 du plan premium) recoit un `invoice.payment_succeeded` → ses credits sont reinitialises a 80, OK dans ce cas. Mais si un `checkout.session.completed` est rejoue par Stripe (retry), les credits sont aussi reinitialises.

### CRITIQUE 2 — Pas d'idempotence sur les webhooks Stripe

Le webhook ne verifie pas si un `event.id` a deja ete traite. Stripe peut renvoyer le meme evenement plusieurs fois. Actuellement :
- `checkout.session.completed` → appelle `initialize_user_credits` a chaque replay (ecrase)
- `invoice.payment_succeeded` → idem
- `customer.subscription.updated` → idem

Pas de table `processed_webhook_events` pour deduplication.

### CRITIQUE 3 — `renew-credits` ecrase les credits non consommes

Le cron `renew-credits` appelle `initialize_user_credits` qui reset les credits au max du plan. Un utilisateur qui a 50/80 queries se retrouve avec 80/80 — dans ce cas c'est le comportement attendu pour un renouvellement. Mais si le cron s'execute deux fois (retry), pas de probleme car c'est idempotent pour le meme cycle. **Risque faible.**

### MOYEN 4 — Race condition sur `useCreditManager.initializeCredits`

Ligne 191-195 : si `!loading && !credits` → appelle `initializeCredits('free_trial')`. Si deux onglets sont ouverts, deux appels concurrents peuvent arriver. Grace au `ON CONFLICT`, le second ecrase le premier. **Risque faible** car meme valeur.

### MOYEN 5 — `handleSignIn` dans Auth.tsx peut encore activer le trial

Lignes 684-697 : si `localStorage` contient `alphalens_pending_free_trial`, le trial est active au login. Un utilisateur pourrait manuellement ecrire dans localStorage et activer le trial. **Mitigation existante :** le RPC `activate_free_trial_safe` verifie `trial_used` cote serveur, donc le second appel est rejete. **Risque residuel faible.**

### MOYEN 6 — Credits negatifs theoriquement possibles

Le RPC `decrement_credit` fait `SET col = col - 1 WHERE col > 0`, ce qui est safe. Mais `auto_manage_credits` trigger fait `SET col = col - 1` avec un check `IF current_credits > 0` — race condition si deux jobs completent en meme temps. Le `FOR UPDATE` lock existe mais sur le SELECT, pas sur l'UPDATE. **Risque faible** grace au lock.

### MINEUR 7 — Frontend ne desactive pas les boutons pendant le processing du trial/payment

Le bouton "Start Free Trial" dans Homepage n'a pas de state `loading`. Double-click possible. Mitigation cote serveur existante.

---

## Plan de remediation

### Phase 1 — Idempotence webhook (CRITIQUE)

**Fichier : migration SQL**
- Creer une table `processed_stripe_events` avec `event_id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ DEFAULT now()`

**Fichier : `supabase/functions/stripe-webhook/index.ts`**
- Au debut du traitement de chaque event : `INSERT INTO processed_stripe_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING event_id`
- Si pas de `RETURNING` → event deja traite, return 200 immediatement
- Cela garantit qu'un replay Stripe n'ecrase jamais les credits

### Phase 2 — Credit ledger (audit trail)

**Fichier : migration SQL**
- Creer une table `credit_transactions`:
  ```
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id UUID NOT NULL
  transaction_type TEXT NOT NULL  -- 'plan_provision', 'trial', 'usage', 'renewal', 'adjustment'
  credit_type TEXT NOT NULL       -- 'queries', 'ideas', 'reports'
  amount INTEGER NOT NULL         -- positif = ajout, negatif = consommation
  source TEXT NOT NULL             -- 'stripe_webhook', 'trial_activation', 'job_completion', 'admin', 'cron_renewal'
  reference_id TEXT                -- event_id stripe, job_id, etc.
  balance_after INTEGER
  created_at TIMESTAMPTZ DEFAULT now()
  ```
- RLS : users voient les leurs, admins voient tout

**Note :** Le ledger est un **audit trail** supplementaire, pas un remplacement du systeme actuel. `user_credits` reste la source de verite pour les balances (performances). Le ledger permet le debugging et la reconciliation.

### Phase 3 — Wrapper RPC `provision_plan_credits` (remplace `initialize_user_credits` dans les webhooks)

**Fichier : migration SQL**
- Creer un RPC `provision_plan_credits(p_user_id, p_plan_type, p_source, p_reference_id)` :
  - Pour `checkout.session.completed` (premier achat) : SET credits au max du plan + insert ledger
  - Pour `invoice.payment_succeeded` (renouvellement) : SET credits au max du plan + insert ledger
  - Pour `subscription.deleted` : SET credits a 0 + insert ledger
  - Chaque appel enregistre dans `credit_transactions`
  - Idempotent via `p_reference_id` : si deja dans le ledger, skip

**Fichier : `supabase/functions/stripe-webhook/index.ts`**
- Remplacer tous les appels `initialize_user_credits` par `provision_plan_credits` avec le `event.id` comme reference

**Fichier : `supabase/functions/renew-credits/index.ts`**
- Remplacer `initialize_user_credits` par `provision_plan_credits` avec reference `renew_{user_id}_{date}`

### Phase 4 — Frontend safety

**Fichier : `src/hooks/useCreditManager.tsx`**
- Supprimer l'auto-init `useEffect` qui appelle `initializeCredits('free_trial')` pour les users sans credits (lignes 191-195). C'est dangereux — les credits doivent etre initialises uniquement par le signup flow ou le webhook.
- Ajouter un `isProcessing` state pour empecher les appels concurrents a `activateFreeTrial`

### Fichiers modifies (resume)

| Fichier | Changement |
|---------|-----------|
| Migration SQL | Tables `processed_stripe_events`, `credit_transactions` + RPC `provision_plan_credits` |
| `stripe-webhook/index.ts` | Deduplication par event_id + utilisation `provision_plan_credits` + ledger |
| `renew-credits/index.ts` | Utilisation `provision_plan_credits` avec reference idempotente |
| `useCreditManager.tsx` | Supprimer auto-init dangereux + ajouter `isProcessing` guard |

### Ce qui ne change PAS

- `activate_free_trial_safe` — deja corrige et safe
- `try_engage_credit` / `auto_manage_credits` / `decrement_credit` — logique de consommation intacte
- `create-checkout` — inchange
- Toutes les pages frontend (Homepage, Auth, Blog) — deja corrigees dans le dernier patch
- Le systeme d'authentification

