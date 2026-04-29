
# Adoucir le message "Email non confirmé" à la connexion

## Problème actuel

Dans `src/pages/Auth.tsx` (`handleSignIn`, ligne ~721), quand un utilisateur tente de se connecter sans avoir confirmé son email :
- Supabase renvoie une erreur `Email not confirmed`
- Le code tombe dans le bloc générique `if (error)` qui affiche un **toast rouge destructif** avec le message brut anglais
- L'utilisateur a l'impression d'avoir fait une faute, alors qu'il doit juste cliquer sur le lien dans son email

À noter : un cas de redirection existe déjà ligne 727 (`navigate('/email-confirmation')`) mais il n'est jamais atteint, car Supabase renvoie une erreur **avant** de retourner `data.user` quand l'email n'est pas confirmé.

## Solution

Détecter spécifiquement l'erreur "Email not confirmed" (code `email_not_confirmed` ou message contenant "not confirmed") **avant** le toast d'erreur générique, et :

1. Afficher un toast **informatif** (variant par défaut, pas destructif) avec un ton bienveillant :
   - Titre : "Confirmez votre adresse email"
   - Description : "Nous vous avons envoyé un lien de confirmation. Vérifiez votre boîte de réception (et vos spams)."
2. Rediriger automatiquement vers `/email-confirmation?email=<email>` — la page existe déjà (`EmailConfirmation.tsx`) et accepte un paramètre `email` en fallback, et propose un bouton "Renvoyer l'email de confirmation".

## Changements

### 1. `src/pages/Auth.tsx` — bloc `if (error)` de `handleSignIn`

Avant le toast destructif générique, ajouter une détection :
```ts
const isEmailNotConfirmed =
  error.message?.toLowerCase().includes('not confirmed') ||
  (error as any).code === 'email_not_confirmed';

if (isEmailNotConfirmed) {
  toast({
    title: t('emailConfirmation.pendingTitle'),
    description: t('emailConfirmation.pendingDescription'),
  });
  navigate(`/email-confirmation?email=${encodeURIComponent(email)}`);
  setLoading(false);
  isManualSignInRef.current = false;
  return;
}
```

### 2. Clés i18n

Ajouter dans `src/locales/{en,es,fa}/auth.json` sous `emailConfirmation` :
- `pendingTitle` : "Confirm your email address" / "Confirme tu correo" / équivalent FA
- `pendingDescription` : "We sent you a confirmation link. Please check your inbox (and spam folder)." et équivalents

(La clé parente `emailConfirmation` existe déjà dans les 3 fichiers de locales.)

### 3. Vérifications

- Pas de modification backend nécessaire
- `EmailConfirmation.tsx` lit déjà `searchParams.get('email')` comme fallback — la redirection avec `?email=` fonctionnera même sans session active
- Le bouton "Renvoyer le mail" est déjà fonctionnel sur cette page

## Hors scope

- Pas de changement au flux de signup
- Pas de changement aux templates d'email
- Pas de modification de la page `EmailConfirmation` elle-même
