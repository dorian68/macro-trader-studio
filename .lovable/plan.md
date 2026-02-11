
# Audit Complet : Auth Flow Alphalens

## A) Constats (Findings)

### CRITICAL

**C1 - Pas de "Forgot Password"**
Il n'existe aucun lien ni fonctionnalite "Mot de passe oublie" dans le formulaire de login. Un utilisateur qui perd son mot de passe est bloque. Les traductions (`forgotPassword`, `resetPassword`, `backToLogin`, `checkEmail`) existent deja dans `auth.json` mais ne sont utilisees nulle part.

**C2 - Pas de politique INSERT sur `profiles`**
La table `profiles` n'a aucune RLS policy pour INSERT. Le profile est cree par un trigger `handle_new_user` (SECURITY DEFINER) sur `auth.users`, ce qui fonctionne. Cependant, le code Auth.tsx fait un `INSERT` manuel fallback (lignes 234-242) quand le trigger echoue. Ce fallback echouera systematiquement car il n'y a pas de policy INSERT pour les utilisateurs authentifies. L'insert dans `handleBrokerPickerConfirm` (ligne 645-651) a le meme probleme.

**C3 - Leaked Password Protection desactivee**
Le linter Supabase signale que la protection contre les mots de passe compromis (HaveIBeenPwned) est desactivee. Pour un SaaS financier, c'est un risque eleve.

### HIGH

**H1 - Icone erreur password mismatch = spinner**
Ligne 996-997 : quand les mots de passe ne correspondent pas, l'icone affichee est `<Loader2>` (un spinner). L'utilisateur voit un spinner cote champ qui ne tourne pas (car pas `animate-spin`), ce qui est confus. Devrait etre une icone d'erreur (ex: `AlertCircle`).

**H2 - Signup n'envoie plus le broker dans les metadata**
`handleSignUp` (ligne 427-436) passe `full_name` dans `data` mais ne passe ni `broker_id` ni `broker_name`. Le trigger `handle_new_user` cherche ces champs dans `raw_user_meta_data` et ne les trouvera jamais. Le profil est toujours cree sans broker. Le champ broker du formulaire signup a ete retire de l'UI mais le trigger s'attend toujours a le recevoir.

**H3 - OTP expiry trop longue**
Le linter Supabase signale que la duree d'expiration OTP depasse le seuil recommande. Risque de replay d'un lien de confirmation email.

**H4 - `profiles` n'a pas de colonne `email`**
Le code Auth.tsx (ligne 238-239) fait un INSERT avec `email: session.user.email` mais la table `profiles` n'a pas de colonne `email`. Ce fallback INSERT echouerait meme sans le probleme RLS.

### MEDIUM

**M1 - Pas de feedback de force du mot de passe**
Le seul controle est `minLength={6}` sur le champ HTML. Pas de barre de force, pas d'indication de complexite. Pour un SaaS financier, un minimum de 8 caracteres avec indication visuelle serait plus adapte.

**M2 - Fuite d'information potentielle sur login**
Les erreurs Supabase Auth sont affichees directement (`error.message`). Supabase peut retourner "Invalid login credentials" (ok) mais aussi "Email not confirmed" qui revele l'existence du compte. C'est un risque d'enumeration d'emails.

**M3 - Double query profile dans OAuth**
Dans `handleOAuthEvent`, le profil est query 2 fois : une fois ligne 156-160 et une fois ligne 166-170. La deuxieme requete est identique mais selectionne des champs differents. Cela ajoute de la latence inutile.

**M4 - `stayLoggedIn` n'a pas d'effet reel**
Le checkbox "Stay logged in" stocke une preference dans localStorage mais n'affecte pas la duree de session Supabase. La session est toujours persistee via `persistSession: true`. Ce toggle est trompeur pour l'utilisateur.

**M5 - GoogleAuthButton non traduit**
Les textes "Continue with Google" et "Sign Up with Google" sont hardcodes en anglais dans `GoogleAuthButton.tsx` alors que le reste du formulaire est traduit via i18n.

**M6 - Label "Full Name" non traduit**
Ligne 951 : `Full Name` est hardcode en anglais dans le formulaire signup.

### LOW

**L1 - Pas de lien "Forgot Password" visible**
L'utilisateur ne voit aucun lien pour reinitialiser son mot de passe. UX friction significative.

**L2 - AuthGuard textes hardcodes en anglais**
Les messages "Account Pending Approval", "Account Deactivated", "Account Not Approved" dans AuthGuard.tsx ne sont pas traduits.

**L3 - EmailConfirmation et EmailConfirmationSuccess non traduits**
Ces pages ont du texte entierement en anglais.

**L4 - Routes non protegees**
`/portfolio`, `/history`, `/portfolio-analytics`, `/labs/*`, `/asset/:symbol` ne sont pas enveloppees dans AuthGuard. Si c'est intentionnel (acces public), c'est ok. Sinon, c'est une faille d'acces.

**L5 - Session diagnostic logs verbeux**
`useSessionManager` emet beaucoup de logs console (emoji inclus). Acceptable en dev, a reduire en production.

---

## B) Recommandations (Impact + Effort)

| # | Recommandation | Impact | Effort | Priorite |
|---|---|---|---|---|
| C1 | Ajouter le flow "Forgot Password" (lien + formulaire + reset) | Critique - UX | Moyen | P0 |
| C2 | Ajouter une RLS policy INSERT sur profiles OU retirer le fallback INSERT du code | Critique - Securite | Faible | P0 |
| C3 | Activer Leaked Password Protection dans Supabase Dashboard | Haute - Securite | Minimal | P0 |
| H1 | Remplacer Loader2 par AlertCircle pour l'erreur password mismatch | Haute - UX | Minimal | P1 |
| H2 | Passer broker_id/broker_name dans signUp metadata si broker selectionne, OU retirer les refs du trigger | Moyenne - Data | Faible | P1 |
| H3 | Reduire OTP expiry dans Supabase Dashboard | Moyenne - Securite | Minimal | P1 |
| H4 | Retirer `email` du fallback INSERT (colonne inexistante) | Haute - Bug | Minimal | P1 |
| M1 | Ajouter indicateur de force de mot de passe | Moyenne - UX | Moyen | P2 |
| M2 | Normaliser les messages d'erreur login (ne pas exposer l'existence du compte) | Moyenne - Securite | Faible | P2 |
| M3 | Fusionner les 2 queries profile en une seule dans OAuth | Faible - Perf | Minimal | P3 |
| M4 | Retirer le checkbox "Stay logged in" ou implementer une vraie logique de session courte | Faible - UX | Faible | P3 |
| M5-M6 | Traduire GoogleAuthButton et label "Full Name" via i18n | Faible - UX | Minimal | P3 |

---

## C) Plan de Patch Minimal (sans regression)

### Patch 1 : Forgot Password (C1) -- `src/pages/Auth.tsx`
- Ajouter un state `showForgotPassword` et un formulaire inline ou modal
- Utiliser `supabase.auth.resetPasswordForEmail(email, { redirectTo })` 
- Ajouter un lien "Forgot Password?" sous le champ password du formulaire signin
- Utiliser les traductions existantes (`t('forgotPassword')`, `t('resetPassword')`, etc.)

### Patch 2 : Fix fallback INSERT profile (C2 + H4) -- `src/pages/Auth.tsx`
- Retirer `email` du payload INSERT (colonne inexistante)
- Alternative : ajouter une RLS policy INSERT sur profiles pour authenticated users

### Patch 3 : Fix icone password mismatch (H1) -- `src/pages/Auth.tsx`
- Ligne 996 : remplacer `<Loader2 className="h-3 w-3" />` par `<AlertCircle className="h-3 w-3" />`
- Importer `AlertCircle` depuis lucide-react (deja importe dans d'autres composants)

### Patch 4 : Traduire GoogleAuthButton (M5) -- `src/components/auth/GoogleAuthButton.tsx`
- Passer les traductions via props ou useTranslation
- Utiliser `t('signInWithGoogle')` et `t('signUpWithGoogle')`

### Patch 5 : Traduire label "Full Name" (M6) -- `src/pages/Auth.tsx`
- Ligne 951 : remplacer "Full Name" par une cle i18n

---

## D) Checklist de Tests

### Cas nominaux
- [ ] Sign up email/password : profil cree avec status "pending", toast de succes, notification admin envoyee
- [ ] Sign in email/password : redirect vers /dashboard si approved
- [ ] Sign in utilisateur "pending" : affiche ecran "Account Pending Approval"
- [ ] Sign in utilisateur "rejected" : affiche ecran "Account Not Approved"
- [ ] Sign in utilisateur "soft-deleted" : dialog de reactivation propose
- [ ] Google Sign In (returning user) : redirect vers /dashboard
- [ ] Google Sign Up (new user) : profil cree, dialog broker si pas de broker, redirect dashboard
- [ ] Logout : session nettoyee, redirect vers /auth
- [ ] Email confirmation : page accessible, resend fonctionne
- [ ] Forgot Password (apres patch) : email envoye, message de confirmation

### Edge cases
- [ ] Sign up avec email existant : message d'erreur sans reveler l'existence du compte
- [ ] Sign up avec mot de passe < 6 chars : validation bloquante
- [ ] Sign up passwords non identiques : erreur inline visible avec bonne icone
- [ ] Google OAuth timeout (3s sans session) : message d'erreur clair
- [ ] OAuth avec broker expire dans localStorage (> 5min) : gestion gracieuse
- [ ] Login sans email confirme : redirect vers /email-confirmation
- [ ] Double-click sur bouton signup : loading state empeche double soumission
- [ ] Tentative d'acces /dashboard sans auth : redirect vers /auth
- [ ] Utilisateur soft-deleted tente de se reconnecter : dialog reactivation, pas de crash

### Mobile
- [ ] Formulaire login/signup responsive
- [ ] Dialogs (broker picker, reactivation) lisibles sur mobile
- [ ] Touch targets >= 44px (boutons, checkboxes)
