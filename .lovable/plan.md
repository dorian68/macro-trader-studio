

# Audit and Patch Plan: SaaS Payment Flow End-to-End

## PART 1 — AUDIT OF THE EXISTING FLOW

### A. Pricing Page (`src/pages/Pricing.tsx`)
**Current behavior:**
- Fetches plans from `plan_parameters` table (basic/standard/premium)
- If user is NOT authenticated: redirects to `/auth?plan={planType}` — plan is preserved in URL
- If user IS authenticated: calls `create-checkout` Edge Function directly, then `window.location.href` to Stripe
- `create-checkout` uses `plan_parameters.stripe_price_id` as source of truth for prices

**Verdict: SOLID.** Plan intent is properly passed via URL param. No issues found.

### B. Auth Page (`src/pages/Auth.tsx`)
**Current behavior:**
- Reads `plan` from URL search params (`selectedPlan`)
- On signup: stores `selectedPlan` in `localStorage('alphalens_pending_plan')` before showing confirmation
- On login (email/password): stores `selectedPlan` in localStorage, then immediately invokes `create-checkout` and redirects to Stripe
- On Google OAuth: stores `selectedPlan` in localStorage before redirect, retrieves it after OAuth callback to invoke checkout
- `EmailConfirmationSuccess.tsx`: listens for auth session, invokes `create-checkout` with pending plan from localStorage
- `onAuthStateChange` also checks localStorage for pending plan on SIGNED_IN events

**Verdict: SOLID.** Plan intent is preserved across all auth flows (email signup, email login, Google OAuth, email confirmation). Multiple redundant checks ensure the plan is not lost.

### C. Stripe Integration
**Checkout (`create-checkout/index.ts`):**
- Creates a Stripe Checkout Session in `subscription` mode
- Stores `plan_type` in session `metadata`
- Supports both authenticated and guest checkout
- Uses `plan_parameters.stripe_price_id` — single source of truth

**Webhook (`stripe-webhook/index.ts`):**
- Handles: `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
- Signature verification: YES (when `STRIPE_WEBHOOK_SECRET` is set)
- Idempotency: YES — uses `processed_stripe_events` table with unique constraint on `event_id`
- User resolution: paginates through `auth.admin.listUsers()` by email
- Plan resolution: reads `metadata.plan_type` first, falls back to `stripe_price_id` lookup in `plan_parameters`
- Credits: uses `provision_plan_credits` RPC (idempotent, additive)
- Profile update: sets `user_plan` AND `status = 'approved'` — **auto-bypass of manual approval**
- Admin notification: sends `paid_subscription` email to all super_users
- Guest checkout: creates auth user via `admin.createUser()` if not found

**Verdict: SOLID.** The webhook is well-architected with idempotency, signature verification, proper plan resolution, auto-approval, and admin notification.

### D. Post-Payment (`PaymentSuccess.tsx`)
**Current behavior:**
- Polls profile for `status === 'approved'` and `user_plan !== 'free_trial'` up to 10 times (every 3s)
- Calls `check-subscription` and `fetchCredits` to update UI
- Handles unauthenticated users landing on success page (guest checkout scenario)

**Verdict: SOLID.** Exponential polling handles webhook latency gracefully.

### E. AuthGuard (`src/components/AuthGuard.tsx`)
**Current behavior:**
- If profile is `pending` AND `user_plan` is a paid plan (basic/standard/premium): shows "Processing Your Payment" spinner instead of "Under Review"
- Uses realtime subscription (via `useProfile`) to auto-update when webhook sets `status = 'approved'`
- Trial expiration check forces upgrade

**Verdict: SOLID.** Paid users are never shown the "Under Review" message. The realtime listener ensures auto-refresh when the webhook completes.

### F. Admin Notification
- Triggered inside `stripe-webhook` on `checkout.session.completed` after successful profile update
- Sends to ALL users with `super_user` role
- Includes: customer email, plan type, Stripe customer ID, subscription ID, timestamp
- Protected by idempotency guard (event won't be processed twice = email won't be sent twice)
- Fire-and-forget (non-blocking)

**Verdict: SOLID.**

---

## PART 2 — IDENTIFIED FAILLES (Issues Found)

After thorough audit, the existing implementation is **remarkably comprehensive**. Here are the remaining edge cases:

### FAILLE 1: Race condition — webhook arrives before profile exists (NEW user via guest checkout)
**Risk:** When `create-checkout` is used without auth (guest), and the webhook fires `checkout.session.completed`, it creates a user via `admin.createUser()`. But the `handle_new_user` trigger may not create the profile instantly, and the webhook immediately tries to `UPDATE profiles SET user_plan, status` — which could silently fail if the profile row doesn't exist yet.

**Impact:** User gets created but profile never gets `status = 'approved'` or `user_plan` set. They land in limbo.

**Fix needed:** In the webhook, after creating a new user, add a retry loop or `UPSERT` for the profile update.

### FAILLE 2: `handleSignIn` stores `selectedPlan` in localStorage THEN immediately reads it back
**Risk (minor):** In `handleSignIn` (line 732-733), it stores the plan then reads it. This is fine but redundant — it could just use `selectedPlan` directly instead of going through localStorage.

**Impact:** None functionally, just messy code.

### FAILLE 3: No `invoice.payment_failed` handling for access revocation
**Risk:** When `invoice.payment_failed` fires, the webhook only logs it but doesn't take any action. If a renewal payment fails, the user keeps their plan and credits until `customer.subscription.deleted` eventually fires (which may take days depending on Stripe retry settings).

**Impact:** Low risk — Stripe's built-in dunning handles this. But could be tighter.

### FAILLE 4: `customer.subscription.deleted` downgrades to `free_trial` but doesn't revoke `status = 'approved'`
**Risk:** After cancellation, user keeps `status = 'approved'` which means they still pass AuthGuard even on `free_trial` plan. This is likely intentional (free trial users with approved status can still use the platform within trial limits), but worth noting.

**Impact:** By design — not a flaw if free_trial has limited credits.

---

## PART 3 — PATCHES REQUIRED

Only **1 real fix** is needed:

### Patch 1: Webhook — Ensure profile exists before updating (CRITICAL)

**File:** `supabase/functions/stripe-webhook/index.ts`

In the `checkout.session.completed` handler, after creating a new user (line 139-155), add a profile existence check with retry + upsert fallback before the profile update (line 185-188):

```typescript
// After userId is determined (line 155), before plan provisioning:

// Ensure profile exists (trigger may be slow for new users)
let profileExists = false;
for (let i = 0; i < 5; i++) {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existingProfile) {
    profileExists = true;
    break;
  }
  await new Promise(r => setTimeout(r, 1000));
}

if (!profileExists) {
  logStep("Profile not found after retries, creating manually");
  await supabase.from('profiles').insert({
    user_id: userId,
    status: 'pending',
    user_plan: 'free_trial'
  });
}
```

Then the existing `UPDATE profiles SET user_plan, status = 'approved'` will succeed.

### Patch 2 (cosmetic): Simplify handleSignIn localStorage roundtrip

**File:** `src/pages/Auth.tsx` (lines 732-753)

Use `selectedPlan` directly instead of storing to localStorage and reading it back in the same function scope. Minor cleanup.

---

## PART 4 — SUMMARY

### What was already working correctly:
1. Plan intent preserved across all auth flows (URL param + localStorage)
2. Stripe webhook is idempotent (deduplicated via `processed_stripe_events`)
3. Webhook signature verification active
4. Auto-approval for paid users (no "under review" for paying customers)
5. Credits provisioned via idempotent `provision_plan_credits` RPC
6. Admin notification on paid subscription (to all super_users, once per event)
7. PaymentSuccess polls for provisioning completion
8. AuthGuard shows "Processing Payment" for paid-but-pending users
9. Realtime listener auto-updates profile when webhook completes
10. Google OAuth preserves plan intent through localStorage

### What needs fixing:
1. **Webhook race condition** — profile might not exist when webhook tries to update it for newly created users (guest checkout or first-time Stripe user). Fix: retry + manual insert fallback.

### Verification strategy:
After the patch, the 20 test cases from the requirements are all covered:
- Cases 1-4: Plan intent preserved via URL + localStorage across all auth paths
- Case 5: PaymentSuccess polls backend, doesn't trust frontend redirect alone
- Case 6: Access granted only after webhook sets `status = 'approved'`
- Cases 7-8: Webhook sets both `user_plan` AND provisions credits atomically
- Cases 9-10: Idempotency via `processed_stripe_events`
- Case 11: **Fixed by Patch 1** — profile ensured before update
- Cases 12-14: Email-based user lookup + existing customer check in create-checkout
- Case 15: AuthGuard shows "Processing" for paid pending, never "Under Review"
- Cases 16-17: Admin email sent once per idempotent event
- Case 18: Access depends on webhook (backend), not success URL (frontend)
- Case 19: `customer.subscription.deleted` handler downgrades plan
- Case 20: `invoice.payment_succeeded` handler re-provisions credits

