

# Plan : Notifications email pour inscription utilisateur

## Analyse de l'existant

Après exploration du code, voici ce qui est déjà en place :

| Fonctionnalité | Statut |
|----------------|--------|
| Email "Compte approuvé" envoyé à l'utilisateur | ✅ **Déjà implémenté** |
| Email "Compte rejeté" envoyé à l'utilisateur | ✅ **Déjà implémenté** |
| Template email professionnel avec branding Alphalens | ✅ Existe |
| Infrastructure `send-admin-notification` | ✅ Fonctionne |
| Clé API Resend configurée | ✅ Présente |

**Ce qu'il manque :**
- ❌ Notification aux super users lors d'une nouvelle inscription en attente

---

## Modifications à effectuer

### 1. Ajouter un nouveau type de notification : `new_registration`

**Fichier :** `supabase/functions/send-admin-notification/index.ts`

Ajouter un nouveau case dans la fonction `getEmailContent()` :

```typescript
interface AdminNotificationRequest {
  type: 'status_approved' | 'status_rejected' | 'credits_updated' | 
        'reactivation_request' | 'reactivation_approved' | 'reactivation_rejected' |
        'new_registration';  // ← NOUVEAU
  // ...
}
```

Template email à ajouter (style sobre et professionnel) :

```
Subject: 🆕 Nouvelle inscription en attente - Alphalens

Contenu :
- Header avec logo Alphalens
- "Nouvelle demande d'inscription"
- Détails : email utilisateur, broker sélectionné, date d'inscription
- Bouton CTA vers Admin Panel
- Footer professionnel
```

---

### 2. Créer une Edge Function dédiée : `notify-new-registration`

**Fichier :** `supabase/functions/notify-new-registration/index.ts`

Cette fonction :
1. Est appelée après la création d'un profil avec `status: 'pending'`
2. Récupère la liste des super users (via `user_roles` table)
3. Envoie un email à chaque super user via `send-admin-notification`

**Pourquoi une fonction séparée ?**
- Isolation des responsabilités
- Peut être appelée depuis un trigger ou le frontend
- Cohérent avec l'architecture existante (`request-reactivation` fait pareil)

---

### 3. Intégrer l'appel dans le flow d'inscription

**Fichier :** `src/pages/Auth.tsx`

Après la création réussie d'un compte (signUp), appeler la nouvelle Edge Function :

```typescript
// Dans handleSignUp, après succès
if (!error) {
  // Fire-and-forget notification aux admins
  supabase.functions.invoke('notify-new-registration', {
    body: {
      userEmail: email,
      brokerName: selectedBrokerName || null
    }
  }).catch(console.error);
  
  toast({ ... });
}
```

Même chose pour le flow Google OAuth (handleOAuthEvent pour les nouveaux utilisateurs).

---

## Schéma du flux

```text
┌─────────────────┐
│ Nouvel user     │
│ s'inscrit       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Création profil │
│ status: pending │
└────────┬────────┘
         │
         ▼ (fire-and-forget)
┌─────────────────────────────┐
│ notify-new-registration     │
│ Edge Function               │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Fetch super_users           │
│ from user_roles             │
└────────┬────────────────────┘
         │
         ▼ (pour chaque super user)
┌─────────────────────────────┐
│ send-admin-notification     │
│ type: 'new_registration'    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 📧 Email envoyé aux admins  │
│ "Nouvelle inscription"      │
└─────────────────────────────┘
```

---

## Fichiers modifiés/créés

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/send-admin-notification/index.ts` | Modifier | Ajouter template `new_registration` |
| `supabase/functions/notify-new-registration/index.ts` | Créer | Nouvelle Edge Function |
| `supabase/config.toml` | Modifier | Ajouter config pour la nouvelle fonction |
| `src/pages/Auth.tsx` | Modifier | Appeler la notification après inscription |

---

## Garanties de non-régression

| Élément | Garantie |
|---------|----------|
| Flow d'inscription existant | ✅ Inchangé - notification en fire-and-forget |
| Statut utilisateur par défaut | ✅ Reste `pending` |
| Validation manuelle par admin | ✅ Toujours requise |
| Email "compte approuvé" | ✅ Déjà implémenté, conservé |
| Email "compte rejeté" | ✅ Déjà implémenté, conservé |
| Tables existantes | ✅ Aucune modification |
| Rôles et permissions | ✅ Aucun changement |

---

## Contenu des emails

### Email aux Super Users (nouvelle inscription)

```
📬 À: Tous les super_users
📋 Sujet: 🆕 Nouvelle inscription en attente - Alphalens

Corps:
- "Un nouvel utilisateur s'est inscrit sur la plateforme"
- Email de l'utilisateur
- Broker sélectionné (si applicable)
- Date/heure d'inscription
- Bouton "Examiner dans le Panel Admin →"
- Message: "Ce compte est en attente de validation."
```

### Email à l'utilisateur (compte approuvé) - DÉJÀ EXISTANT

```
📬 À: Utilisateur
📋 Sujet: 🎉 Your Alphalens Account has been Approved!
(Template déjà implémenté dans send-admin-notification)
```

---

## Configuration requise

- ✅ `RESEND_API_KEY` : Déjà configuré
- ✅ Domaine email vérifié sur Resend
- ✅ Table `user_roles` : Existe déjà

