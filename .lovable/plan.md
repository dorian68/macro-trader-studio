

## Auth Flow Audit — Bugs Found

### Bug 1: `activateFreeTrial()` called immediately after signup (CRITICAL)

**File:** `src/pages/Auth.tsx`, lines 502-513

After email/password signup, the code navigates to `/email-confirmation` (line 499), then 1 second later calls `activateFreeTrial()`. At this point, the user has NOT confirmed their email, so the Supabase JWT is invalid (missing `sub` claim).

**Evidence from edge function logs:**
```
[ACTIVATE-FREE-TRIAL] ERROR - {"message":"Authentication error: invalid claim: missing sub claim"}
```

**Fix:** Remove the `setTimeout` block that calls `activateFreeTrial()` after signup. Free trial activation should only happen AFTER email confirmation, not during signup. Move it to the `EmailConfirmationSuccess` page or to the first login after email confirmation.

---

### Bug 2: Conflicting navigation after signup with `intent=free_trial`

Lines 499 and 510 both call `navigate()` — first to `/email-confirmation`, then (if trial succeeds) to `/payment-success`. This creates a race condition. Since the trial always fails (Bug 1), only the first navigate fires, but the logic is broken.

**Fix:** When `intent=free_trial`, store it in localStorage. After email confirmation + first login, read it back and activate the trial at that point.

---

### Bug 3: `emailRedirectTo` points to `/dashboard` instead of `/email-confirmation-success`

**File:** `src/pages/Auth.tsx`, line 455

The signup `emailRedirectTo` is set to `/dashboard`. When the user clicks the confirmation link in their email, they land on `/dashboard` but may not have a valid session yet or the confirmation success page is skipped entirely.

**Fix:** Change `emailRedirectTo` to `${window.location.origin}/email-confirmation-success` so users see the success page after confirming.

---

### Bug 4: `EmailConfirmation` resend also points to `/dashboard`

**File:** `src/pages/EmailConfirmation.tsx`, line 57

Same issue — the resend confirmation email redirect also points to `/dashboard`.

**Fix:** Change to `/email-confirmation-success`.

---

### Implementation Plan

1. **`src/pages/Auth.tsx` — `handleSignUp`**
   - Remove the `setTimeout` block (lines 502-513) that calls `activateFreeTrial()` after signup
   - Store `intent=free_trial` in localStorage if present: `localStorage.setItem('alphalens_pending_free_trial', 'true')`
   - Change `emailRedirectTo` from `/dashboard` to `/email-confirmation-success`

2. **`src/pages/EmailConfirmation.tsx`**
   - Change `emailRedirectTo` from `/dashboard` to `/email-confirmation-success`

3. **`src/pages/Auth.tsx` — `handleSignIn`**
   - After successful sign-in (line 631+), check `localStorage.getItem('alphalens_pending_free_trial')`. If present, activate free trial, remove the flag, and redirect to `/payment-success?type=free_trial`
   - This handles the case where the user confirms email, returns, and logs in

4. **`src/pages/Auth.tsx` — `onAuthStateChange` SIGNED_IN handler**
   - Same check for `alphalens_pending_free_trial` in the email/password SIGNED_IN handler (line 129-151), so it works regardless of how the user arrives post-confirmation

These are minimal, surgical fixes that don't change the overall architecture.

