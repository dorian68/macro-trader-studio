

# Patch: Cycle de vie des comptes supprimés

## Audit — Cause racine

Le système actuel fait un **soft delete** (`profiles.is_deleted = true`) mais conserve la ligne `auth.users` intacte. Conséquences :

1. **L'email reste bloqué** — `signUp` retourne "User already registered" car `auth.users` existe toujours
2. **Le login fonctionne encore** — `signInWithPassword` réussit, puis le code détecte `is_deleted` et propose une **réactivation** (comportement inverse du besoin)
3. **Google OAuth reconnecte** l'utilisateur à son ancien compte supprimé et propose la réactivation
4. **Reset password** peut théoriquement réactiver un compte supprimé
5. **AuthGuard** affiche un écran de réactivation au lieu de bloquer définitivement
6. **Pas de self-service deletion** — seuls les super_users peuvent supprimer

## Stratégie

**Hard delete de `auth.users` + conservation du profil archivé pour audit.**

Quand un compte est supprimé :
1. Le profil est marqué `is_deleted=true` avec `deleted_at` (audit trail conservé)
2. `auth.users` est **hard-deleté** via `supabase.auth.admin.deleteUser()` — libère l'email
3. Toutes les sessions sont révoquées immédiatement

Quand l'utilisateur revient avec le même email :
- `signUp` crée un nouveau `auth.users` avec un **nouveau UUID**
- Le trigger `handle_new_user` crée un **nouveau profil** (pas de collision : `ON CONFLICT (user_id) DO NOTHING`)
- L'ancien profil reste en base avec l'ancien `user_id` pour audit
- Aucune donnée de l'ancien compte n'est accessible depuis le nouveau

## Changements

### 1. Migration SQL — Table `deleted_accounts_audit`

Table dédiée pour centraliser les traces :
- `id UUID`, `original_user_id UUID`, `email_hash TEXT` (SHA256, pas l'email en clair), `deleted_at TIMESTAMPTZ`, `deleted_by UUID`, `deletion_type TEXT` ('admin' | 'self_service'), `metadata JSONB` (broker_name, plan_type, created_at du profil original)
- RLS : lecture super_user/admin uniquement

### 2. Edge Function `delete-user/index.ts` — Ajouter hard delete auth

Après le soft delete du profil, ajouter :
```
await supabase.auth.admin.deleteUser(userId)
```
Avant le hard delete, capturer l'email de l'utilisateur via `admin.getUserById()` pour insérer dans `deleted_accounts_audit` (email hashé).

Séquence atomique :
1. Soft delete profil (`is_deleted=true`)
2. Insert dans `deleted_accounts_audit`
3. Hard delete `auth.users`
4. Si le hard delete échoue, log l'erreur (le profil est déjà soft-deleted, intervention manuelle possible)

### 3. Nouvelle Edge Function `delete-own-account/index.ts` — Self-service

Permet à un utilisateur connecté de supprimer **son propre compte** :
- Vérifie le JWT, extrait `user_id`
- Soft delete le profil
- Insert dans `deleted_accounts_audit` (type: 'self_service')
- Hard delete `auth.users`
- Retourne success (le client gère la déconnexion)

Config.toml : `[functions.delete-own-account]` avec `verify_jwt = false`

### 4. `Auth.tsx` — Supprimer toute logique de réactivation

- **handleSignIn (~L624-640)** : Supprimer le check `is_deleted` + dialog réactivation. Après hard delete de `auth.users`, `signInWithPassword` retournera "Invalid login credentials" naturellement — aucune fuite d'information.
- **handleOAuthEvent (~L239-246)** : Supprimer le check `is_deleted` + réactivation. L'ancien `auth.users` n'existant plus, Google OAuth créera une nouvelle entrée.
- **Dialog de réactivation (~L868-943)** : Supprimer entièrement.
- **States** : Supprimer `showReactivation`, `pendingReactivationUser`.

### 5. `useAuth.tsx` — Supprimer le check soft-delete

Supprimer le bloc L106-118 qui vérifie `is_deleted` au chargement de session. Si l'utilisateur est hard-deleted de `auth.users`, `getSession()` retournera `null` naturellement.

### 6. `AuthGuard.tsx` — Simplifier le bloc isDeleted

Remplacer l'écran de réactivation (L77-124) par un simple force signOut. Ce cas ne devrait jamais se produire en conditions normales (safety net uniquement).

### 7. Composant `DeleteAccountSection.tsx` — Self-service deletion

Composant pour le Dashboard/Settings :
- Bouton "Delete My Account"
- Dialog de confirmation avec double confirmation (texte "DELETE" à taper)
- Appel à `delete-own-account`
- SignOut immédiat + redirection vers `/auth`
- État `isProcessing` pour éviter les double-clicks

### 8. Dashboard — Intégrer DeleteAccountSection

Ajouter le composant dans la page Dashboard ou dans un onglet Settings existant.

## Fichiers modifiés/créés

| Fichier | Action |
|---------|--------|
| `supabase/migrations/xxx.sql` | CREATE — table `deleted_accounts_audit` |
| `supabase/functions/delete-user/index.ts` | EDIT — ajouter audit + `admin.deleteUser()` |
| `supabase/functions/delete-own-account/index.ts` | CREATE — self-service deletion |
| `supabase/config.toml` | EDIT — ajouter `[functions.delete-own-account]` |
| `src/pages/Auth.tsx` | EDIT — supprimer réactivation dialog + checks `is_deleted` |
| `src/hooks/useAuth.tsx` | EDIT — supprimer check soft-delete |
| `src/components/AuthGuard.tsx` | EDIT — simplifier bloc isDeleted (force signOut) |
| `src/components/DeleteAccountSection.tsx` | CREATE — composant self-service |
| `src/pages/Dashboard.tsx` | EDIT — intégrer DeleteAccountSection |

## Ce qui ne change PAS

- `handle_new_user` trigger — déjà compatible (`ON CONFLICT (user_id) DO NOTHING`)
- Reset password — naturellement safe (pas d'envoi d'email si user n'existe plus dans `auth.users`)
- `restore-user` edge function — reste pour l'admin (cas exceptionnel, mais ne pourra restaurer que le profil, pas le `auth.users`)
- Système de credits, abonnements, billing
- Admin panel (UsersTable, UserActionsDialog)
- Blog, Homepage, SEO

## Sécurité

- Hard delete de `auth.users` = aucun token existant ne fonctionnera
- Pas de fuite d'information : erreur générique "Invalid login credentials"
- Double confirmation UX pour la self-service deletion
- Race condition couverte : soft delete profil en premier, puis hard delete auth (séquentiel)

## Risques résiduels

- Si `admin.deleteUser()` échoue après le soft delete, le profil est soft-deleted mais l'email reste bloqué → log d'erreur pour intervention manuelle admin
- `restore-user` ne pourra plus restaurer complètement un compte (pas de `auth.users` à restaurer) → acceptable, l'admin peut créer un nouveau compte manuellement si besoin

