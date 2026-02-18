

# 3 Ameliorations UX : Page de confirmation, PersistentToast auto-minimize, flux Pricing

## 1. Redirection vers une page de confirmation apres le Sign Up

**Probleme actuel** : Apres inscription, un simple toast s'affiche. L'utilisateur reste sur la page Auth sans retour visuel fort.

**Solution** : Apres un signup reussi (email/password), rediriger vers la page `/email-confirmation` qui existe deja et qui affiche un message clair avec le logo, l'email de l'utilisateur, et un bouton pour renvoyer l'email.

**Fichier** : `src/pages/Auth.tsx` (ligne ~474)
- Remplacer le `toast(...)` de succes par un `navigate('/email-confirmation')` 
- Le toast reste uniquement pour les erreurs
- Le flux `free_trial` (intent) conserve sa redirection specifique vers `/payment-success`

**Note** : La page `EmailConfirmation` existe deja avec un design adequat (logo, message, bouton resend, lien sign out). Pas besoin de creer une nouvelle page.

## 2. PersistentToast : auto-minimisation au changement de page

**Probleme actuel** : Quand l'utilisateur lance une query puis navigue, le PersistentToast reste en taille complete, ce qui donne une impression statique.

**Solution** : Ajouter un `useEffect` dans `PersistentToast.tsx` qui ecoute les changements de route via `useLocation` de react-router-dom. Quand la route change et qu'il y a des jobs actifs, le toast se minimise automatiquement.

**Fichier** : `src/components/PersistentToast.tsx`
- Importer `useLocation` de `react-router-dom`
- Ajouter un `useEffect` qui surveille `location.pathname`
- Quand le pathname change ET qu'il y a des `activeJobs`, appeler `setIsMinimized(true)`
- Ne pas minimiser si le toast est deja minimise (eviter les re-renders inutiles)

## 3. Flux Pricing : gestion du parametre `plan` dans Auth

**Probleme actuel** : La page Pricing redirige vers `/auth?plan=basic` pour les utilisateurs non connectes, mais Auth.tsx ne lit pas ce parametre `plan`. Apres inscription, le plan choisi est perdu.

**Solution** : 
- Lire le parametre `plan` dans Auth.tsx via `searchParams`
- Stocker le plan dans `localStorage` avant le signup
- Apres la confirmation email et connexion, verifier si un plan est en attente et rediriger vers le checkout Stripe automatiquement
- Afficher un badge discret sur le formulaire signup indiquant le plan selectionne (ex: "Selected plan: Premium")

**Fichiers modifies** :
- `src/pages/Auth.tsx` : lire `plan` param, l'afficher, le stocker dans localStorage
- `src/pages/Auth.tsx` : dans le flux post-login (onAuthStateChange), detecter un plan en attente et rediriger vers checkout

## Resume des fichiers impactes

| Fichier | Modification |
|---------|-------------|
| `src/pages/Auth.tsx` | Redirect vers /email-confirmation + gestion param `plan` |
| `src/components/PersistentToast.tsx` | Auto-minimize sur changement de route |

## Ce qui ne change pas
- Page EmailConfirmation (deja existante et adequate)
- Page EmailConfirmationSuccess
- PersistentNotificationProvider (aucune modification)
- Logique des jobs, realtime, credits
- Tous les autres composants
