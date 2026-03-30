

# Audit: User invisible dans l'admin dashboard

## Cause racine identifiee

Il y a **3 failles** dans le pipeline signup-to-admin-visibility :

### Faille 1 (PRINCIPALE) : Pas de fallback si le trigger `handle_new_user` echoue pour les signups email/password

Le signup email/password (`Auth.tsx` L482) appelle `supabase.auth.signUp()`. La creation du profil depend **entierement** du trigger SQL `handle_new_user` qui s'execute sur `INSERT INTO auth.users`. Si ce trigger echoue silencieusement (ex: erreur dans le lookup broker, timeout, contrainte violee), **aucun profil n'est cree dans `profiles`**.

Cote Google OAuth, il y a un fallback avec retry + creation manuelle (L282-328). **Cote email/password, il n'y en a aucun.**

Resultat : l'utilisateur existe dans `auth.users`, le frontend affiche "check your email" (signup success), mais aucun profil n'existe. Le dashboard admin (`fetch-users-with-emails`) lit **uniquement la table `profiles`** puis la joint avec `auth.users`. Pas de profil = utilisateur invisible.

### Faille 2 : Pas d'INSERT RLS policy sur `profiles`

La table `profiles` n'a **pas de policy INSERT**. Le fallback Google OAuth (L299-306) fait `supabase.from('profiles').insert(...)` avec le token utilisateur. Sans policy INSERT, cette requete echoue silencieusement (RLS violation). Le fallback est donc mort pour le client-side.

### Faille 3 : Le dashboard admin ne detecte pas les "orphelins"

`fetch-users-with-emails` construit sa liste en partant de `profiles` et en joignant `auth.users` pour l'email. Les utilisateurs qui existent dans `auth.users` mais PAS dans `profiles` sont completement invisibles. Il n'y a aucun mecanisme de detection ou reconciliation.

### Scenario exact du bug

1. L'utilisateur s'inscrit par email/password
2. `auth.signUp()` cree le user dans `auth.users`
3. Le trigger `handle_new_user` echoue (ou ne se declenche pas — possible si Supabase retourne un "fake signup" pour un email deja existant non confirme)
4. Le frontend affiche "check your email" (success)
5. L'utilisateur confirme son email, se connecte
6. `AuthGuard` charge le profil via `useProfile` → profil = null → `!isApproved` → affiche "Account Setup Required" (qui peut etre percu comme "under review")
7. L'admin ne voit rien car aucun profil n'existe dans `profiles`

## Strategie de correction

### 1. Ajouter un "ensure profile" au login (safety net)

Dans `Auth.tsx`, apres un `signInWithPassword` ou au retour OAuth, verifier que le profil existe. Si non, le creer via une edge function (qui utilise le service role, bypass RLS).

### 2. Creer une edge function `ensure-profile`

Nouvelle edge function qui :
- Verifie le JWT
- Verifie si un profil existe pour ce `user_id`
- Si non, cree un profil `status: 'pending'` avec le service role
- Idempotent : ne fait rien si le profil existe deja

### 3. Ajouter une policy INSERT sur `profiles`

Permettre aux utilisateurs authentifies de creer leur propre profil (`auth.uid() = user_id`). Cela repare aussi le fallback Google OAuth existant.

### 4. Ameliorer `fetch-users-with-emails` pour detecter les orphelins

Ajouter une detection des utilisateurs `auth.users` sans profil correspondant. Creer automatiquement un profil `pending` pour ces orphelins (reconciliation).

### 5. Ajouter un garde-fou dans `AuthGuard`

Si `profile === null` apres chargement, au lieu d'afficher "Account Setup Required", tenter de creer/reparer le profil via `ensure-profile`.

## Fichiers modifies/crees

| Fichier | Action |
|---------|--------|
| `supabase/functions/ensure-profile/index.ts` | CREATE — edge function idempotente |
| `supabase/migrations/xxx.sql` | CREATE — INSERT policy sur profiles |
| `src/pages/Auth.tsx` | EDIT — appeler `ensure-profile` apres login si profil absent |
| `src/components/AuthGuard.tsx` | EDIT — appeler `ensure-profile` si profil null |
| `supabase/functions/fetch-users-with-emails/index.ts` | EDIT — reconcilier les orphelins auth sans profil |

## Ce qui ne change PAS

- Trigger `handle_new_user` — reste en place (happy path)
- Google OAuth flow — existant preserve, le fallback L299 fonctionnera maintenant grace a la policy INSERT
- Dashboard admin layout/UX
- RLS policies existantes (SELECT/UPDATE)
- Systeme de credits, roles, billing
- Blog, SEO, toutes les autres pages

## Securite

- `ensure-profile` valide le JWT et ne cree un profil que pour le user authentifie
- La policy INSERT est scopee a `auth.uid() = user_id`
- La reconciliation dans `fetch-users-with-emails` utilise le service role (admin seulement)
- Pas de fuite d'information

