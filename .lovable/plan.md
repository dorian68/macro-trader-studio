

# Refondre le Free Trial : uniquement pour les nouveaux utilisateurs + conversion auto

## Probleme actuel

Le bouton "Start Free Trial" est accessible a tous, meme aux utilisateurs deja connectes avec des credits existants. Un utilisateur avec un abonnement payant peut cliquer dessus et declencher `activateFreeTrial()`, ce qui ajoute des credits gratuits en plus de son plan paye.

**Points d'entree du bug :**
1. **Homepage** — 2 boutons "Start Free Trial" visibles meme pour les utilisateurs connectes (juste masques si `trialUsed`)
2. **Auth.tsx** — Si un utilisateur connecte arrive sur `/auth?intent=free_trial`, le trial est active directement
3. **Blog/BlogPost** — Boutons "Start Free Trial" en bas de page (sans aucune guard)
4. **onAuthStateChange** dans Auth.tsx — Active le trial pour un utilisateur existant qui se reconnecte

## Nouvelle logique metier

Le Free Trial est **exclusivement pour les nouveaux utilisateurs** :
- L'utilisateur s'inscrit → recoit 7 jours de trial avec credits
- A la fin des 7 jours → redirection automatique vers checkout du plan Basic (le moins cher)
- Un utilisateur deja inscrit ne doit **jamais** voir "Start Free Trial"

## Changements

### 1. Homepage.tsx — Conditionner les CTA

**Logique actuelle :** Si `user && trialUsed` → bouton disabled, sinon → lien vers `/auth?intent=free_trial`

**Nouvelle logique :**
- Si `user` (connecte, quel que soit le statut trial) → **ne pas afficher** le bouton "Start Free Trial" du tout. Afficher uniquement "Go to Dashboard"
- Si pas connecte → garder le lien `/auth?intent=free_trial&tab=signup` (force l'onglet signup)

Meme logique pour le CTA en bas de page.

### 2. Auth.tsx — Bloquer le trial pour les utilisateurs existants

**handleSignIn (ligne ~697-711)** : Supprimer la logique qui active le trial quand un utilisateur existant se connecte avec `intent=free_trial`. Un login ne doit jamais activer de trial.

**onAuthStateChange (ligne ~159-173)** : Supprimer le bloc `pendingTrial` qui active le trial quand un utilisateur existant revient via refresh.

**Redirect guard (ligne ~190)** : Supprimer l'exception `intent !== 'free_trial'` — un utilisateur connecte doit toujours etre redirige au dashboard.

**handleOAuthEvent (ligne ~416-427)** : Supprimer le bloc qui active le trial pour un utilisateur Google existant.

**Le trial reste active uniquement dans le flow signup** (ligne ~541) via `localStorage.setItem('alphalens_pending_free_trial')`, qui est consomme une seule fois apres la confirmation email.

### 3. Blog.tsx + BlogPost.tsx — CTA conditionnel

Remplacer les boutons "Start Free Trial" hardcodes par une logique conditionnelle :
- Non connecte → "Start Free Trial" vers `/auth?intent=free_trial&tab=signup`
- Connecte → "Go to Dashboard" vers `/dashboard`

### 4. Backend — Ajouter une guard supplementaire dans activate-free-trial

Dans `activate-free-trial/index.ts` et/ou dans le RPC `activate_free_trial_safe` :
- Verifier que l'utilisateur n'a **pas** de plan paye (`user_plan` != basic/standard/premium)
- Si l'utilisateur a deja un plan paye, retourner une erreur 403

### 5. Expiration du trial → redirection checkout Basic

Ajouter une logique frontend dans le `Layout.tsx` ou `AuthGuard.tsx` :
- Si `user.plan_type === 'free_trial'` ET `trial_started_at + 7 jours < now()` → afficher une modale "Your trial has expired" avec un CTA vers le checkout Basic
- Utiliser les donnees deja presentes dans `profiles.trial_started_at`

### Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/pages/Homepage.tsx` | CTA conditionnel : masquer trial pour users connectes |
| `src/pages/Auth.tsx` | Supprimer activation trial pour login/reconnexion |
| `src/pages/Blog.tsx` | CTA conditionnel |
| `src/pages/BlogPost.tsx` | CTA conditionnel |
| `supabase/functions/activate-free-trial/index.ts` | Guard: refuser si plan paye |
| `src/components/AuthGuard.tsx` ou `Layout.tsx` | Modale expiration trial → checkout Basic |

### Ce qui ne change PAS

- Le RPC `activate_free_trial_safe` (deja safe et idempotent)
- Le systeme de credits existant
- Les flows Stripe
- L'admin panel

