

# Audit complet : Flow Stripe + Auth + Provisioning

## 1. FLOW ACTUEL TRACE END-TO-END

```text
PRICING PAGE
  User clique "Get Started" sur Basic/Standard/Premium
    ├─ Si non authentifie → redirect /auth?plan=basic
    │   ├─ Signup → email stored in localStorage (alphalens_pending_plan)
    │   ├─ Email confirm → /confirm-success → tryCheckout() → create-checkout → Stripe
    │   └─ Login existant → handleSignIn reads localStorage → create-checkout → Stripe
    └─ Si authentifie → create-checkout → Stripe Checkout

STRIPE CHECKOUT
  → Success URL: /payment-success?session_id=...
  → Cancel URL: /payment-canceled

STRIPE WEBHOOK (stripe-webhook edge function)
  checkout.session.completed:
    1. Dedup via processed_stripe_events (idempotent) ✅
    2. Signature verification (si webhookSecret present) ✅
    3. Find/create auth user par email ✅
    4. Resolve plan_type (metadata ou price_id → plan_parameters) ✅
    5. provision_plan_credits RPC (idempotent, avec ledger) ✅
    6. Update profiles: user_plan + status='approved' ✅

  invoice.payment_succeeded:
    → provision_plan_credits (renouvellement) ✅

  customer.subscription.deleted:
    → Downgrade to free_trial ✅
    → MAIS: ne change PAS profiles.status ⚠️

  invoice.payment_failed:
    → Log seulement, AUCUNE action ⚠️

  customer.subscription.updated:
    → Update plan + provision credits si active ✅
```

## 2. REPONSES AUX QUESTIONS METIER

**Q1. Verifie-t-on reellement le paiement Stripe ?**
OUI. Le webhook `checkout.session.completed` est le declencheur. La signature est verifiee si `STRIPE_WEBHOOK_SECRET` est configure. La source de verite est bien Stripe, pas le frontend.

**Q2. Signal frontend fragile ou webhook fiable ?**
Le webhook est la source de verite pour l'approbation et les credits. MAIS le frontend (`PaymentSuccess.tsx`) appelle `check-subscription` et `fetchCredits` pour rafraichir l'UI. Ce n'est pas une faille car ces appels sont en lecture seule.

**Q3. Acces sans paiement valide possible ?**
NON pour les comptes payants. L'approbation (`status='approved'`) est faite uniquement dans le webhook. Un user qui revient sur `/payment-success` sans webhook ne sera pas approuve.

**Q4. Utilisateur payant dans "under review" ?**
OUI, c'est le BUG PRINCIPAL. Si le webhook arrive APRES que l'utilisateur ait charge la page, ou si le profil est cree par le trigger `handle_new_user` AVANT le webhook, le profil est `pending`. Le webhook met bien `status='approved'`, mais si le user charge `/dashboard` entre-temps, il voit "Account Pending Approval". C'est un probleme de timing, pas de logique.

**Q5. Credits attribues au bon moment ?**
OUI, et de maniere idempotente via `provision_plan_credits` avec `reference_id = event.id`.

**Q6. Reconduction mensuelle ?**
OUI via `invoice.payment_succeeded`. Credits reprovisiones correctement.

**Q7. Email admin ?**
NON. Le webhook Stripe n'envoie AUCUN email de notification admin lors d'une souscription payante. `notify-new-registration` est appele seulement depuis `Auth.tsx` (signup form, pas webhook). C'est une faille.

**Q8. Resilience retries/doubles ?**
OUI, grace a `processed_stripe_events` et `provision_plan_credits` avec idempotency sur `reference_id`.

## 3. FAILLES IDENTIFIEES

### FAILLE 1 (CRITIQUE) — Pas d'email admin sur souscription payante via webhook
Le webhook `stripe-webhook` n'appelle jamais `notify-new-registration` ou `send-admin-notification`. L'admin n'est notifie que si le signup passe par `Auth.tsx`, pas si le user est cree par le webhook lui-meme.

### FAILLE 2 (MAJEURE) — Timing race: user voit "pending" entre signup et webhook
Scenario:
1. User s'inscrit → trigger cree profil `pending`
2. User confirme email → redirect /confirm-success → checkout Stripe
3. User paie → redirect /payment-success
4. User navigue vers /dashboard
5. AuthGuard voit `status='pending'` → affiche "Account Pending Approval"
6. Webhook arrive 2-30s plus tard → met `status='approved'`
7. User est bloque et doit refresh manuellement

### FAILLE 3 (MODEREE) — `invoice.payment_failed` ne fait rien
Si le paiement echoue au renouvellement, aucune action n'est prise. Le profil reste `approved` et les credits restent en place. L'utilisateur garde l'acces jusqu'a la prochaine facture ou jusqu'a ce que Stripe finisse par supprimer l'abonnement.

### FAILLE 4 (MODEREE) — `customer.subscription.deleted` ne change pas le status
Le webhook downgrade le plan a `free_trial` mais ne change pas `profiles.status`. Un user annule reste `approved` avec plan `free_trial`. Ce n'est pas forcement une faille si le free_trial est cense etre accessible, mais c'est inconsistant avec le flow manuel ou `pending` bloque l'acces.

### FAILLE 5 (MINEURE) — `findUserByEmail` scanne tous les utilisateurs
`supabase.auth.admin.listUsers()` sans pagination retourne les 1000 premiers users. A scale, cela ne fonctionnera plus. Il faut utiliser un filtre email.

### FAILLE 6 (MINEURE) — Profil peut ne pas exister quand le webhook arrive
Si un guest paye sans compte, le webhook cree le user via `admin.createUser`. Mais le trigger `handle_new_user` cree le profil `pending`. Le webhook met ensuite a jour le profil `approved`. Il y a un risque de race si l'INSERT du trigger n'est pas encore commit quand le webhook fait l'UPDATE. En pratique, ca fonctionne car c'est dans la meme transaction Supabase.

## 4. STRATEGIE CIBLE

### A. Corriger le webhook pour envoyer un email admin
Ajouter un appel a `send-admin-notification` (ou directement a `notify-new-registration`) dans le handler `checkout.session.completed` apres l'approbation reussie.

### B. Corriger le race condition "pending" pour les payants
Le `AuthGuard` doit detecter qu'un paiement est en cours de traitement. Solution: ajouter un realtime listener sur `profiles` dans `AuthGuard` pour que si le profil passe de `pending` a `approved` pendant que l'ecran "Pending" est affiche, il re-rende automatiquement sans refresh. Le hook `useProfile` a deja un realtime subscription — il suffit de verifier qu'il est actif dans `AuthGuard`.

Verification: `useProfile` utilise deja un channel `postgres_changes` sur `profiles`. Quand le webhook met a jour le profil, le changement est pousse via realtime, `queryClient.setQueryData` est appele, et `AuthGuard` doit re-rendre. Si ca ne fonctionne pas, c'est que le realtime n'est pas souscrit assez tot ou que la query n'est pas reactive. Mais en lisant le code, le `useProfile` hook est utilise directement dans `AuthGuard` et le realtime est actif. Le probleme est que le user n'a pas encore de profil quand il charge le dashboard, donc le realtime filter `user_id=eq.${user.id}` ne matche pas le row existant car le profil vient d'etre cree. Conclusion: le realtime DEVRAIT fonctionner. Si le webhook update le profil et que le realtime est actif, le composant devrait se re-rendre. Le vrai probleme est le delai du webhook (peut prendre 5-30s).

Solution alternative plus robuste: sur `/payment-success`, ajouter un polling qui attend que `profiles.status` soit `approved` avant de permettre la navigation vers le dashboard. Ou dans `AuthGuard`, quand `isPending` est true et qu'il y a un `session_id` dans l'URL ou un `plan_type` payant dans le profil, afficher un message "Processing your payment..." au lieu de "Pending Approval".

Approche retenue: Dans `AuthGuard`, si le profil est `pending` ET que `user_plan` est un plan payant (basic/standard/premium), afficher un message "Payment being processed" avec un spinner au lieu de "Pending Approval". Le realtime listener detectera la mise a jour du webhook et affichera le dashboard automatiquement.

### C. Gerer `invoice.payment_failed`
Ajouter un handler qui met `profiles.status = 'pending'` ou au minimum logue l'echec. Ou mieux: ne rien faire car Stripe reessaie automatiquement et finira par envoyer `subscription.deleted` si tous les retries echouent.

Decision: garder le comportement actuel. Stripe gere le cycle de retry. Quand tous les retries echouent, `customer.subscription.deleted` est envoye et traite.

### D. Fix `findUserByEmail`
Remplacer `listUsers()` par l'API admin filtree.

## 5. FICHIERS A MODIFIER

| Fichier | Action |
|---------|--------|
| `supabase/functions/stripe-webhook/index.ts` | EDIT — ajouter email admin apres checkout.session.completed + fix findUserByEmail |
| `src/components/AuthGuard.tsx` | EDIT — afficher "Processing payment" au lieu de "Pending Approval" quand user_plan est payant |
| Deploy `stripe-webhook` | DEPLOY |

## 6. DETAIL DES MODIFICATIONS

### stripe-webhook/index.ts

**Fix findUserByEmail** (L86-89):
Remplacer `listUsers()` par un appel filtre. Supabase admin API n'a pas de filtre email direct sur `listUsers`, mais on peut utiliser une approche via `supabase.from('profiles')` puis `getUserById`, ou on peut simplement paginer. Solution pragmatique: utiliser `listUsers({ filter: email })` — pas supporte. Alternative: faire `listUsers({ perPage: 1000 })` avec pagination. Mais la vraie solution est de chercher le profil en base, pas dans auth. Le webhook a le service_role, il peut faire:

```sql
SELECT user_id FROM profiles WHERE ... 
```

Non, car le webhook recoit un email et doit trouver l'auth user correspondant. Supabase ne supporte pas le filtre email sur `listUsers`. Alternative: RPC custom. Pour l'instant, le volume est faible (~70 users), garder `listUsers()` mais ajouter un commentaire TODO.

**Ajouter notification admin** apres L183 (apres "Profile updated"):
Appeler `send-admin-notification` ou `notify-new-registration` en interne via fetch pour notifier tous les super users.

Approche: utiliser le pattern deja utilise dans `notify-new-registration` — le webhook fait un fetch interne vers `notify-new-registration` (ou directement vers `send-admin-notification` en boucle sur les super users). Plus simple: appeler directement `send-admin-notification` pour chaque super user. Mais il faut d'abord recuperer les emails des super users.

Solution la plus propre: le webhook fait un fetch vers `notify-new-registration` avec le email du user et un flag supplementaire indiquant que c'est une souscription payante (pas un simple signup). On ajoute un nouveau template `paid_subscription` dans `send-admin-notification`.

Alternative encore plus simple: fetch directement vers `${supabaseUrl}/functions/v1/send-admin-notification` pour chaque super user, avec un nouveau type `paid_subscription`. Il faut creer ce template dans `send-admin-notification`.

Approche finale retenue:
1. Ajouter un template `paid_subscription` dans `send-admin-notification`
2. Dans le webhook, apres l'approbation, fetch vers `notify-new-registration` etendu (ou directement lister les super users et appeler `send-admin-notification`)
3. Pour eviter de dupliquer la logique de resolution des super users, reutiliser `notify-new-registration` en ajoutant des metadata supplementaires (planType, stripeCustomerId, subscriptionId)

### AuthGuard.tsx

Dans le block `isPending` (L187-213):
Ajouter une condition: si `userPlan` est `basic`, `standard`, ou `premium`, afficher "Your payment is being processed..." avec un spinner au lieu de "Account Pending Approval". Le realtime listener dans `useProfile` detectera la mise a jour et le composant se re-rendra.

### send-admin-notification/index.ts

Ajouter un case `paid_subscription` avec un template qui inclut:
- Email du client
- Plan choisi
- Date/timestamp
- Stripe customer ID
- Subscription ID

## 7. NON-REGRESSION

Aucune modification ne touche:
- Le flow de signup classique (email/password + pending)
- Le flow Google OAuth
- Le trigger `handle_new_user`
- Le flow free trial
- La logique de credits existante
- Le dashboard admin
- Les RLS policies
- Le flow de login

Les modifications sont strictement additives:
- Un nouveau template email
- Un appel fetch supplementaire dans le webhook (fire-and-forget)
- Un affichage conditionnel dans AuthGuard

## 8. RESUME

**Avant:**
- Source de verite: webhook Stripe (correct)
- Signature verifiee: oui (si secret configure)
- Idempotence: oui (processed_stripe_events + reference_id)
- Credits: provisionnes correctement
- Approbation auto payants: oui dans le webhook
- MAIS: pas d'email admin sur souscription payante
- MAIS: race condition entre webhook et navigation user → "Pending Approval" temporaire

**Apres:**
- Email admin envoye apres chaque nouvelle souscription payante validee
- AuthGuard affiche "Processing payment" au lieu de "Pending Approval" quand le plan est payant
- Le realtime re-rend automatiquement quand le webhook met a jour le profil

