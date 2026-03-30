

# Audit complet : Signup + Visibilite admin

## Diagnostic

### Probleme principal : Le signup n'a PAS cree de nouvel utilisateur

Les logs Supabase Auth montrent clairement :

```text
action: "user_repeated_signup"
actor_username: "labrydorian.mpsi@hotmail.fr"
```

L'email utilise pour tester **existait deja** (profil cree le 29/09/2025, statut `approved`). Par defaut, Supabase ne renvoie pas d'erreur pour proteger contre l'enumeration d'emails. Il retourne un objet `user` sans `identities`, ce qui fait que `Auth.tsx` affiche "Verifiez votre email" alors qu'aucun utilisateur n'a ete cree. C'est pour ca qu'il n'y a rien de nouveau dans le panneau admin.

### Probleme secondaire : `ensure-profile` jamais invoque

Zero logs pour cette edge function. Soit elle n'a pas ete deployee lors du dernier push, soit elle n'a jamais ete declenchee (car `handle_new_user` fonctionne correctement pour les vrais nouveaux users). Il faut s'assurer qu'elle est deployee.

### Probleme tertiaire : Appels `fetch-users-with-emails` avec token expire

Les logs edge function montrent `"User not authenticated"` depuis le referer `email-confirmation-success`. Ce sont des appels provenant d'onglets admin ouverts en parallele dont la session a expire lors du test de signup (logout + re-login). Pas un bug de code, mais du bruit inutile.

### Etat de la base de donnees

La base est saine : **16 profils `pending`** existent. Le trigger `handle_new_user` et la reconciliation fonctionnent correctement. Le probleme est uniquement cote UX : l'email de test existait deja.

## Corrections proposees

### Fix 1 : Detecter les signups avec email existant (CRITIQUE)

Dans `Auth.tsx` -> `handleSignUp`, apres l'appel `supabase.auth.signUp()`, verifier si `data.user?.identities?.length === 0`. Si oui, c'est un email deja enregistre. Afficher un message explicite (comme choisi par l'utilisateur) : "Cet email est deja enregistre. Veuillez vous connecter."

```text
Avant:
  signUp() -> success -> show "check your email"

Apres:
  signUp() -> check identities
    if identities.length === 0 -> show "email already registered, please sign in"
    else -> show "check your email"
```

### Fix 2 : Deployer `ensure-profile`

Re-deployer la edge function pour s'assurer que le safety net est actif.

### Fix 3 : Deployer `fetch-users-with-emails` (deja corrige)

Re-deployer pour s'assurer que les corrections de reconciliation orphelin sont en production.

## Fichiers modifies

| Fichier | Action |
|---------|--------|
| `src/pages/Auth.tsx` | EDIT -- detecter `identities.length === 0` dans `handleSignUp` et afficher message explicite |
| `supabase/functions/ensure-profile/index.ts` | DEPLOY (code deja correct) |
| `supabase/functions/fetch-users-with-emails/index.ts` | DEPLOY (code deja correct) |

## Ce qui ne change PAS

- Trigger `handle_new_user` -- fonctionne correctement
- `AuthGuard.tsx` -- corrections anti-boucle deja en place
- Admin panel -- affiche correctement les utilisateurs existants
- RLS policies -- correctes

## Detail technique

### Detection email existant

Supabase Auth retourne un objet `user` meme pour un signup duplique (protection anti-enumeration). La difference est que `user.identities` sera un tableau vide `[]` quand l'email existe deja. Ce check est officiellement documente par Supabase.

```text
const { data, error } = await supabase.auth.signUp({ email, password });

if (!error && data.user && data.user.identities?.length === 0) {
  // Email already registered
  toast("Cet email est deja enregistre. Connectez-vous.")
  return;
}
```

