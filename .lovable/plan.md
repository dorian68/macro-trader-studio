

# Audit: Signup et visibilite admin -- Diagnostic

## Constat en production

### 1. `ensure-profile` n'a JAMAIS ete appele (CRITIQUE)
Zero logs pour cette edge function. Bien que le fichier existe dans le codebase et dans `config.toml`, la fonction n'a jamais ete invoquee en production. Le safety net dans `AuthGuard` et `Auth.tsx` (handleSignIn) est donc **mort** -- si le trigger SQL `handle_new_user` echoue, aucun fallback ne se declenche.

**Action** : Deployer `ensure-profile` via Supabase deploy.

### 2. Orphan reconciliation tourne en boucle (BUG)
Les logs de `fetch-users-with-emails` montrent que les memes 7 utilisateurs sont detectes comme "orphelins" a chaque chargement de la page admin (4 fois en 2 secondes). Verification en base : ces 7 utilisateurs **ont deja des profils** (crees il y a des mois, statut `approved`/`rejected`).

**Cause** : La comparaison `profileUserIds` vs `allAuthUsers` ne fonctionne pas correctement dans le contexte de requetes concurrentes. De plus, le log "Created pending profile" s'affiche meme quand l'INSERT echoue avec un duplicate (23505) -- faux positif de logging.

### 3. La base de donnees est saine
La table `profiles` contient 70 lignes non-supprimees, dont de nombreux utilisateurs `pending`. Il y a un index unique sur `user_id`. Les RLS policies sont correctes (INSERT pour authenticated, SELECT pour owner + admins).

## Plan de correction

### Fix 1 : Deployer `ensure-profile`
Deployer la fonction edge existante pour que le safety net fonctionne reellement.

### Fix 2 : Corriger le logging dans `fetch-users-with-emails`
Le `else` branch (L168-169) logue "Created" meme sur 23505. Separer les deux cas : success vs duplicate ignore.

### Fix 3 : Corriger la detection d'orphelins
Ajouter un early return si `orphanAuthUsers.length === 0` et eviter de re-creer des profils qui existent deja. Avant l'INSERT, verifier avec un SELECT que le profil n'existe vraiment pas (la query initiale peut avoir un decalage avec des requetes concurrentes).

### Fix 4 : Eviter les appels concurrents depuis l'admin
La page Admin.tsx appelle `fetch-users-with-emails` depuis **plusieurs endroits** simultanement (useAdminActions, Admin.tsx L266, UserCreditsOverview, JobsMonitoring). Chaque appel declenche la reconciliation. Centraliser les appels ou debouncer.

## Fichiers modifies

| Fichier | Action |
|---------|--------|
| `supabase/functions/fetch-users-with-emails/index.ts` | EDIT -- fix logging + orphan detection robustesse |
| `supabase/functions/ensure-profile/index.ts` | DEPLOY (fichier deja correct) |

## Ce qui ne change PAS
- Auth.tsx, AuthGuard.tsx -- deja corriges, fonctionneront une fois ensure-profile deploye
- RLS policies -- correctes
- Trigger handle_new_user -- reste en place (happy path)
- UI admin -- correcte (filtres, tabs pending/approved fonctionnent)

