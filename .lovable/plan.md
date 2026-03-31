

# Audit and Patch: SaaS Payment Flow End-to-End

## PART 1 — AUDIT OF EXISTING FLOW

### A. Pricing Page (`src/pages/Pricing.tsx`)

**Current behavior:**
- Fetches plan data from `plan_parameters` table
- If user is NOT authenticated: `navigate('/auth?plan=${planType}')` — plan is passed via URL param
- If user IS authenticated: calls `create-checkout` Edge Function directly, redirects to Stripe

**Verdict: CORRECT.** Plan intent is preserved via URL parameter.

---

### B. Auth Flow (`src/pages/Auth.tsx`)

**Email/Password Signup:**
- On successful signup, stores `localStorage.setItem('alphalens_pending_plan', selectedPlan)` (line 529-531)
- User receives confirmation email, clicks link, lands on `/confirm-success`
- `EmailConfirmationSuccess.tsx` picks up `alphalens_pending_plan` from localStorage, calls `create-checkout`, redirects to Stripe
- **Verdict: WORKS** (same browser only — fragile if user confirms on another device, but acceptable)

**Email/Password Login:**
- `handleSignIn` stores the plan in localStorage then immediately reads it back and calls `create-checkout` (lines 681-699)
- Redirects to Stripe checkout
- **Verdict: WORKS**

**onAuthStateChange (returning session):**
- If user is already signed in when visiting `/auth?plan=X`, the `getSession()` check (line 184-211) picks up `alphalens_pending_plan` and creates checkout
- **Verdict: WORKS**

**CRITICAL FLAW — Google OAuth:**
- `handleGoogleSignIn` and `handleGoogleSignUp` (lines 551-619) do NOT store the `selectedPlan` in localStorage before redirecting to Google
- `handleOAuthEvent` (lines 214-434) never checks `selectedPlan` URL param or `alphalens_pending_plan` in localStorage
- After Google OAuth completes, user is ALWAYS sent to `/dashboard` — **the plan intent is LOST**
- **Verdict: BROKEN.** Any user choosing a plan on Pricing then using Google auth will lose their plan selection.

---

### C. Stripe Integration

**create-checkout (Edge Function):**
- Receives `{ plan }`, looks up `stripe_price_id` from `plan_parameters`
- Supports both authenticated and guest checkout
- Stores `plan_type` in session metadata
- **Verdict: SOLID**

**stripe-webhook (Edge Function):**
- Signature verification with `STRIPE_WEBHOOK_SECRET`
- Idempotency via `processed_stripe_events` table (unique constraint on `event_id`)
- `checkout.session.completed`: resolves user by email, resolves plan from metadata or price_id, provisions credits via `provision_plan_credits` RPC, sets `status: 'approved'` and `user_plan` on profile, sends admin notification
- `customer.subscription.updated`: handles upgrades/downgrades
- `invoice.payment_succeeded`: handles monthly renewals
- `customer.subscription.deleted`: downgrades to `free_trial`
- If user doesn't exist, creates one via `admin.createUser`
- **Verdict: SOLID.** Idempotent, auto-approves paid users, notifies admin.

**check-subscription (Edge Function):**
- Queries Stripe directly for active subscriptions
- Resolves plan type from `plan_parameters` mapping
- **Verdict: CORRECT**

**MINOR FLAW — findUserByEmail:**
- Uses `supabase.auth.admin.listUsers()` which fetches ALL users (no filter param)
- Won't scale beyond ~1000 users
- Should use `supabase.auth.admin.listUsers({ filter: email })` or a direct query

---

### D. Database / State

**Source of truth:**
- `profiles.user_plan`: stores the plan type (free_trial, basic, standard, premium)
- `profiles.status`: stores approval status (pending, approved, rejected)
- `user_credits`: stores credit balances
- `plan_parameters`: stores plan config and `stripe_price_id`
- `processed_stripe_events`: idempotency guard

**Webhook updates both plan and status atomically** (separate queries but in same handler — acceptable).

**Verdict: CORRECT** — backend is the source of truth, not frontend.

---

### E. Post-Payment / App Access

**PaymentSuccess page:**
- Calls `check-subscription` (queries Stripe directly) and `fetchCredits`
- If user is authenticated, shows subscription details
- Has a 2-second delayed second `fetchCredits` call to catch webhook lag
- **FLAW: Only 2 seconds delay.** If webhook takes longer, credits may not show. No polling.

**AuthGuard (`src/components/AuthGuard.tsx`):**
- If `isPending` AND `hasPaidPlan` (basic/standard/premium): shows "Processing Your Payment" with spinner
- Uses `useProfile` with realtime subscription — auto-updates when webhook sets `status: 'approved'`
- **Verdict: EXCELLENT.** Handles the race condition between redirect and webhook correctly.

---

### F. Admin Notification

**Webhook triggers `paid_subscription` notification** to all super_users via `send-admin-notification`
- Idempotency: tied to `processed_stripe_events`, so webhook can't re-trigger
- Contains: email, plan, Stripe customer ID, subscription ID, timestamp
- **Verdict: CORRECT.** No duplication risk.

---

## PART 2 — IDENTIFIED FLAWS (Prioritized)

### FLAW 1 (CRITICAL): Google OAuth loses selected plan
**Impact:** Any user who clicks a plan on Pricing, is redirected to Auth, and uses "Sign in with Google" will lose their plan selection. After Google auth, they land on the dashboard without going through Stripe checkout.
**Fix:** Store `selectedPlan` in localStorage before Google OAuth redirect. After OAuth completes, check for pending plan and redirect to Stripe checkout instead of dashboard.

### FLAW 2 (MEDIUM): PaymentSuccess has no robust polling for credits
**Impact:** User may see the success page but credits haven't been provisioned yet (webhook lag). The 2-second timeout is insufficient.
**Fix:** Add polling with exponential backoff on PaymentSuccess to wait for credits/plan to appear.

### FLAW 3 (LOW): findUserByEmail fetches all users
**Impact:** Performance degrades with user growth.
**Fix:** Use email filter parameter in listUsers API.

### FLAW 4 (LOW): Welcome email says "Your account is being reviewed" even for paid users
**Impact:** Confusing UX — paid user gets a "pending review" email before the webhook auto-approves them.
**Fix:** This is acceptable because the webhook fires within seconds and sends a separate notification. No change needed.

---

## PART 3 — CORRECTIONS TO IMPLEMENT

### Fix 1: Google OAuth + Pending Plan (Auth.tsx)

**In `handleGoogleSignIn` and `handleGoogleSignUp`** (before the OAuth redirect):
- Store `selectedPlan` in localStorage: `localStorage.setItem('alphalens_pending_plan', selectedPlan)`

**In `handleOAuthEvent`** (after OAuth completes, before navigating):
- Check `localStorage.getItem('alphalens_pending_plan')`
- If a plan is pending, call `create-checkout` and redirect to Stripe instead of `/dashboard`
- This applies to BOTH new and returning Google OAuth users

### Fix 2: PaymentSuccess Polling (PaymentSuccess.tsx)

- After initial `fetchCredits` + `checkSubscriptionStatus`, if the profile still shows `pending` or credits are missing, poll every 3 seconds for up to 30 seconds
- Use the realtime subscription from `useProfile` as the primary mechanism (already exists via AuthGuard), but add client-side polling as backup for the PaymentSuccess page specifically

### Fix 3: findUserByEmail optimization (stripe-webhook)

- Replace `supabase.auth.admin.listUsers()` + `.find()` with a filtered query or direct email lookup

---

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Store selectedPlan before Google OAuth; handle pending plan after OAuth callback |
| `src/pages/PaymentSuccess.tsx` | Add polling for credits/subscription until provisioned |
| `supabase/functions/stripe-webhook/index.ts` | Optimize findUserByEmail |

## WHAT IS ALREADY CORRECT (NO CHANGES NEEDED)

- `create-checkout` Edge Function
- `stripe-webhook` idempotency and provisioning logic
- `check-subscription` Edge Function
- `AuthGuard` race condition handling (realtime + "Processing Payment" state)
- `plan_parameters` as source of truth for price IDs
- Admin notification system (`paid_subscription` template)
- `activate-free-trial` Edge Function
- `profiles` table schema and RLS policies
- Approval bypass for paid users (already implemented in webhook)
- Email/password signup + login plan persistence

## TESTING STRATEGY

After implementation, the following scenarios should be verified:

1. Unauthenticated user -> Pricing -> Select Basic -> Google Sign Up -> Stripe Checkout -> PaymentSuccess -> Dashboard with correct plan/credits/status
2. Unauthenticated user -> Pricing -> Select Premium -> Email Signup -> Confirm email -> Stripe Checkout -> Dashboard
3. Unauthenticated user -> Pricing -> Select Standard -> Email Login -> Stripe Checkout -> Dashboard
4. Authenticated user -> Pricing -> Select plan -> Direct Stripe Checkout -> Dashboard
5. Payment abandoned (cancel URL) -> No plan change
6. Webhook retry (same event_id) -> Idempotent, no double credits
7. Free signup (no plan) -> Status remains `pending`, admin approval required
8. Monthly renewal webhook -> Credits refreshed correctly

