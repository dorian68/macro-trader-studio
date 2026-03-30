

# Audit du systeme de subscription Stripe

## Diagnostic : 3 problemes critiques identifies

### PROBLEME 1 (CRITIQUE) — Le webhook Stripe ne recoit AUCUN evenement

La table `processed_stripe_events` ne contient qu'un seul enregistrement de test manuel (`evt_test_idempotency_001`). Les logs de la edge function `stripe-webhook` sont vides. **Aucun paiement n'a jamais ete traite par le webhook.**

Sans webhook fonctionnel :
- Pas d'auto-approbation du profil
- Pas d'attribution de credits
- Pas de notification admin
- Le user paie, revient sur `/payment-success`, mais son profil reste `pending` → bloque

**Cause probable** : Le webhook n'est pas configure dans le Stripe Dashboard, ou l'URL configuree est incorrecte.

**Action requise (manuelle)** : Configurer le webhook dans Stripe Dashboard :
- URL : `https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/stripe-webhook`
- Evenements : `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Copier le Signing Secret → le mettre a jour dans Supabase secrets sous `STRIPE_WEBHOOK_SECRET`

### PROBLEME 2 (CRITIQUE) — STRIPE_MODE mal configure

Les logs `create-checkout` montrent :
```text
"mode":"pk_live_51SC35fB2Pjgoe0Q1TjJmejBC3GMlqRrzaQ..."
```

Le secret `STRIPE_MODE` contient une **cle publique Stripe** au lieu de la valeur `"test"` ou `"live"`. Dans `getStripeConfig()`, le code fait :
```text
if (mode === "live") → utilise STRIPE_SECRET_KEY_LIVE
else → utilise STRIPE_SECRET_KEY (test)
```

Comme la valeur n'est ni `"test"` ni `"live"`, le systeme utilise les cles TEST par defaut. Cela fonctionne tant que les `stripe_price_id` dans `plan_parameters` sont des prix TEST. Mais c'est une bombe a retardement et empeche le passage en production.

**Action requise** : Mettre a jour le secret `STRIPE_MODE` a la valeur `"test"` (pour l'instant) ou `"live"` (quand pret pour la production).

### PROBLEME 3 (MINEUR) — Double creation de checkout session

Les logs montrent deux sessions checkout creees a la meme seconde pour le meme utilisateur. Cause probable : double-clic ou React StrictMode. Il faut ajouter un guard dans `Pricing.tsx`.

## Ce qui fonctionne correctement

- `create-checkout` : cree les sessions Stripe correctement (prix, customer, metadata)
- `stripe-webhook` : le code est correct (idempotence, auto-approbation, credits, notification admin)
- `check-subscription` : lit correctement le statut Stripe
- `AuthGuard` : gere le cas "Processing Payment" pour les plans payants
- `provision_plan_credits` RPC : idempotent avec `reference_id`
- Les `stripe_price_id` dans `plan_parameters` correspondent aux prix Stripe TEST

## Plan de correction

### Fix 1 — Corriger STRIPE_MODE
Mettre a jour le secret `STRIPE_MODE` de sa valeur actuelle (une cle publique) vers `"test"`.

### Fix 2 — Guide de configuration webhook
L'utilisateur doit configurer le webhook manuellement dans le Stripe Dashboard. Je fournirai les instructions exactes.

### Fix 3 — Anti double-clic sur le checkout
Dans `Pricing.tsx`, le guard existe deja via `checkoutLoading` state, mais il faut verifier qu'il bloque correctement les appels concurrents.

### Fix 4 — Ajouter un log dans getStripeConfig pour debugger
Ajouter un log explicite si `STRIPE_MODE` n'est ni `"test"` ni `"live"` pour detecter les mauvaises configurations.

## Fichiers a modifier

| Fichier | Action |
|---------|--------|
| Secret `STRIPE_MODE` | UPDATE → `"test"` |
| `supabase/functions/_shared/stripe-config.ts` | EDIT — ajouter validation/warning si mode invalide |
| Deploy `stripe-webhook` | Redeploy pour s'assurer que la derniere version est active |

## Ce que l'utilisateur doit faire manuellement

1. Aller sur https://dashboard.stripe.com/test/webhooks
2. Ajouter un endpoint : `https://jqrlegdulnnrpiixiecf.supabase.co/functions/v1/stripe-webhook`
3. Selectionner les evenements : `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copier le Signing Secret (commence par `whsec_`)
5. Mettre a jour le secret `STRIPE_WEBHOOK_SECRET` dans Supabase avec cette valeur

## Resume

Le code est correct mais le webhook Stripe n'est pas configure cote Stripe Dashboard, donc aucun evenement de paiement n'arrive jamais au backend. C'est la raison pour laquelle les comptes ne sont jamais approuves et les credits jamais attribues apres paiement. En plus, `STRIPE_MODE` est mal configure (contient une cle publique au lieu de "test"/"live").

