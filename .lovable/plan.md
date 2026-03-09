

## Audit du parcours client "Sign in to purchase" → Stripe Checkout

### Probleme confirme

Les logs `create-checkout` ne montrent **aucune invocation recente** — uniquement des "shutdown". La fonction n'est jamais appelee.

### Bugs identifies (3 critiques, 1 mineur)

---

#### Bug 1 (CRITIQUE) — Race condition dans EmailConfirmationSuccess

Le flux d'inscription est : Pricing → Auth (signup) → confirmation email → `alphalensai.com/email-confirmation-success`.

La page utilise `setTimeout(checkPendingPlan, 1000)` puis `getSession()`. Mais Supabase n'a pas forcement traite les tokens de session (dans le hash URL) en 1 seconde. Si `getSession()` retourne `null`, le checkout n'est jamais declenche.

**Fix** : Remplacer le `setTimeout` par un listener `onAuthStateChange` qui attend l'evenement `SIGNED_IN` avant de tenter le checkout. C'est la methode fiable recommandee par Supabase.

---

#### Bug 2 (CRITIQUE) — Le bouton "Go to Login" perd le contexte du plan

Si le checkout ne se declenche pas automatiquement (bug 1), l'utilisateur clique sur "Go to Login" qui navigue vers `/auth` **sans parametre `?plan=`**. Le plan selectionne est perdu definitivement.

**Fix** : Avant de nettoyer le localStorage, passer le plan dans l'URL : `navigate('/auth?plan=basic')`. Aussi, ne pas supprimer `alphalens_pending_plan` du localStorage tant que le checkout n'a pas reussi.

---

#### Bug 3 (CRITIQUE) — `create-checkout` manquant dans config.toml

La fonction `create-checkout` n'est **pas listee** dans `supabase/config.toml` avec `verify_jwt = false`. Toutes les autres fonctions appelees depuis le client y sont. Sans cette config, Supabase verifie le JWT au niveau gateway. Si le token n'est pas encore disponible (email confirmation) ou expire, la requete est rejetee en 401 **avant** que le code de la fonction ne s'execute — expliquant l'absence totale de logs.

**Fix** : Ajouter `[functions.create-checkout]` avec `verify_jwt = false` dans config.toml. La fonction gere deja l'authentification en interne.

---

#### Bug 4 (Mineur) — localStorage cross-domaine (preview vs production)

Lors des tests depuis le preview Lovable (`lovableproject.com`), le `alphalens_pending_plan` est stocke sur ce domaine. Mais l'email de confirmation redirige vers `alphalensai.com` ou le localStorage est vide. Ce bug n'affecte pas les utilisateurs en production (meme domaine), uniquement les tests depuis le preview.

**Note** : Pas de fix necessaire, mais bon a savoir pour le debugging.

---

### Plan de correction

#### 1. `supabase/config.toml` — Ajouter create-checkout
```toml
[functions.create-checkout]
verify_jwt = false
```

#### 2. `src/pages/EmailConfirmationSuccess.tsx` — Remplacer setTimeout par onAuthStateChange
- Ecouter `onAuthStateChange` pour l'evenement `SIGNED_IN`
- A la reception de la session, verifier `alphalens_pending_plan` dans localStorage
- Ne supprimer la cle que si le checkout reussit
- Le bouton "Go to Login" transmet le plan via `navigate('/auth?plan=...')`

#### 3. `src/pages/EmailConfirmationSuccess.tsx` — Garder le plan en fallback
- Ne pas `removeItem` avant d'avoir la confirmation du checkout URL
- Si la redirection Stripe echoue, conserver le plan dans localStorage pour la tentative suivante via `/auth`

### Fichiers modifies
- `supabase/config.toml`
- `src/pages/EmailConfirmationSuccess.tsx`

