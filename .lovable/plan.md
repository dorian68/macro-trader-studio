

# Emails utilisateur : Bienvenue + Confirmation d'approbation

## Etat actuel

| Scenario | Email envoye ? | Destinataire |
|----------|---------------|-------------|
| Inscription (sign up) | Oui - `new_registration` | Admins uniquement |
| Approbation par admin | Oui - `status_approved` | Utilisateur |
| Rejet par admin | Oui - `status_rejected` | Utilisateur |

**Probleme 1** : L'utilisateur qui s'inscrit ne recoit aucun email de bienvenue expliquant le produit et le processus d'approbation.

**Probleme 2** : L'email d'approbation existe mais le CTA pointe vers `/dashboard` au lieu de `/auth` (l'utilisateur doit d'abord se connecter).

## Modifications prevues

### 1. Nouveau template `welcome_signup` dans `send-admin-notification`

Ajouter un nouveau type de notification `welcome_signup` dans l'Edge Function `send-admin-notification/index.ts` :
- Sujet : "Bienvenue sur Alphalens - Votre inscription est en cours de validation"
- Contenu :
  - Presentation du produit (AI-powered trading insights, portfolio management, etc.)
  - Explication du processus : compte en attente de validation par l'equipe
  - Delai indicatif
  - Lien vers le site pour en savoir plus
- Pas de CTA de connexion (le compte n'est pas encore approuve)

### 2. Envoi de l'email de bienvenue lors du sign up

Dans `src/pages/Auth.tsx`, apres l'appel `notify-new-registration` (qui notifie les admins), ajouter un second appel fire-and-forget vers `send-admin-notification` avec le type `welcome_signup` envoye directement a l'email de l'utilisateur. Cela concerne les deux flux :
- Email/password sign up (ligne ~449)
- Google OAuth sign up (ligne ~291)

### 3. Corriger le CTA de l'email d'approbation

Dans le template `status_approved` de `send-admin-notification/index.ts` :
- Changer le lien CTA de `https://alphalens.ai/dashboard` vers `https://macro-trader-studio.lovable.app/auth`
- Modifier le texte du bouton : "Access Your Dashboard" devient "Sign In Now"
- Cela garantit que l'utilisateur est redirige vers la page de connexion

### 4. Mettre a jour l'interface du type

Ajouter `welcome_signup` dans l'interface `AdminNotificationRequest.type` et dans le `switch/case` de `getEmailContent`.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/send-admin-notification/index.ts` | Ajout template `welcome_signup` + correction CTA `status_approved` |
| `src/pages/Auth.tsx` | Ajout envoi email bienvenue a l'utilisateur (2 endroits) |

## Ce qui ne change pas

- Le flux `notify-new-registration` vers les admins reste identique
- Les templates existants (`status_rejected`, `credits_updated`, etc.) restent intacts
- La logique d'approbation dans `useAdminActions.tsx` reste identique (elle envoie deja `status_approved`)
- Aucune modification de base de donnees

