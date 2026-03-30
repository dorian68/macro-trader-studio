

# Patch : Corrections mineures du module d'authentification

## Problèmes identifiés

### P1 (CRITIQUE) — Boucle de reload infinie dans AuthGuard
`AuthGuard` appelle `ensure-profile` puis `window.location.reload()`. Le state `ensureProfileCalled` est réinitialisé à `false` après le reload, causant potentiellement une boucle infinie si la création de profil échoue.

**Fix** : Utiliser `sessionStorage` pour marquer que ensure-profile a été appelé, évitant le re-appel après reload. Ajouter un compteur max (2 tentatives) pour stopper la boucle.

### P2 (MODÉRÉ) — `ensure-profile` utilise `getClaims()` non standard
L'API `getClaims(token)` n'est pas documentée dans toutes les versions du SDK Supabase pour Deno. Les autres edge functions utilisent `getUser(token)`.

**Fix** : Remplacer `getClaims()` par `getUser(token)` dans `ensure-profile`, aligné avec le pattern utilisé dans `delete-user` et `delete-own-account`.

### P3 (MINEUR) — Check `is_deleted` superflu dans `useAuth.tsx`
Ajoute une requête Supabase à chaque chargement d'app. Après le hard delete, ce cas ne se produira jamais en conditions normales.

**Fix** : Supprimer ce check. Le safety net dans AuthGuard (L62-65) et Auth.tsx (L631) suffit comme double protection.

### P4 (MINEUR) — `delete-own-account` ne gère pas Stripe
Un utilisateur avec un abonnement actif peut supprimer son compte mais continuer à être facturé.

**Fix** : Avant la suppression, vérifier si un `stripe_customer_id` existe et annuler l'abonnement via l'API Stripe. Non-bloquant si l'annulation échoue (log + continuer).

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/components/AuthGuard.tsx` | EDIT — sessionStorage guard + max retry pour éviter boucle reload |
| `supabase/functions/ensure-profile/index.ts` | EDIT — remplacer `getClaims()` par `getUser()` |
| `src/hooks/useAuth.tsx` | EDIT — supprimer le check `is_deleted` dans `getSession().then()` |
| `supabase/functions/delete-own-account/index.ts` | EDIT — ajouter annulation Stripe avant suppression |

## Ce qui ne change PAS
- Auth.tsx — flow login/signup/OAuth intact
- delete-user (admin) — inchangé
- fetch-users-with-emails — inchangé
- RLS policies — inchangées
- Dashboard, credits, billing — inchangés

## Détail technique

### AuthGuard — Anti-boucle
```text
Before reload:
  sessionStorage.set('ensure_profile_attempts', count + 1)

On mount:
  if sessionStorage.get('ensure_profile_attempts') >= 2:
    show error card instead of looping
    clear sessionStorage flag
```

### ensure-profile — getUser pattern
```text
Replace:
  getClaims(token) → data.claims.sub

With:
  getUser(token) → data.user.id
```

### delete-own-account — Stripe cleanup
```text
Before soft delete:
  1. Check profile.stripe_customer_id (if column exists)
  2. If customer exists, list active subscriptions
  3. Cancel each subscription
  4. Log result
  5. Continue with deletion even if Stripe fails
```

Note : La colonne `stripe_customer_id` n'existe pas dans le schéma actuel de `profiles`. Si l'annulation Stripe n'est pas faisable sans cette donnée, ce point sera reporté. Le fix se limitera alors à un log d'avertissement.

