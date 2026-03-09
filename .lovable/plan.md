

## Audit: Approval Email Notification Process

### Flow Analysis

```text
Admin clicks "Approve" in UsersTable
  → useAdminActions.updateUserStatus(userId, 'approved', userEmail)
    → 1. UPDATE profiles SET status='approved'  ✅ works
    → 2. supabase.functions.invoke('send-admin-notification', {
           body: { to, notificationType, userName, metadata }
         })
      → Edge function receives request
        → Resend sends email from "onboarding@resend.dev"
```

### Verdict: The email is NOT being delivered to real users

**Bug 1 (CRITICAL): Resend test domain — emails only reach the account owner**

The edge function sends from:
```
from: "Alphalens Platform <onboarding@resend.dev>"
```

`onboarding@resend.dev` is Resend's **sandbox domain**. It can ONLY deliver emails to the email address associated with your Resend account. All other recipients are silently dropped — no error, no bounce, just nothing.

This means:
- If your Resend account email is `admin@yourdomain.com`, only that address receives emails
- Every other user who gets approved will **never** receive the notification
- The logs show `"Email sent successfully: undefined"` — the `undefined` ID confirms Resend is not actually sending

**Bug 2 (MINOR): Interface/destructuring mismatch (no runtime impact)**

The TypeScript interface says `type` and `userEmail`, but the handler destructures `to` and `notificationType`. This works at runtime because TS interfaces don't enforce, but it's misleading code.

**Bug 3 (MINOR): Hardcoded URLs inconsistent across templates**

Some templates link to `https://macro-trader-studio.lovable.app/auth`, others to `https://alphalensai.com/admin`. If you've moved to a custom domain, some links are broken.

---

### Fix Required

**To make emails actually work**, you need to either:

**Option A — Add a verified custom domain in Resend** (recommended for production)
- Add your domain (e.g., `notify.alphalens.ai`) in the Resend dashboard
- Update the `from` field to use your verified domain
- Then all recipients will receive emails

**Option B — Use Lovable's managed email system**
- This project already has `RESEND_API_KEY` configured. The fix is simply updating the `from` address once you verify a domain in Resend.

### What works today
- Profile status update in DB → works perfectly
- Toast notification in admin UI → works
- Email delivery → **broken for all users except the Resend account owner**

### No code changes needed
This is a **Resend configuration issue**, not a code bug. The code is correct — it just needs a verified sender domain. Once you add one in Resend and update the `from` field in the edge function, everything will work.

