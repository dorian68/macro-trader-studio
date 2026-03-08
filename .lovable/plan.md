

## Signup Flow Audit

### What works correctly

1. **Signup request** — `POST /signup` returns 200 with user `bae9d86f`. Redirect URL correctly set to `/email-confirmation-success`. ✅
2. **DB trigger `handle_new_user`** — Creates profile with `status: 'pending'` and assigns `user` role in `user_roles`. ✅
3. **Admin notification** — `notify-new-registration` fires successfully, notifies 2 super users. ✅
4. **Welcome email** — `send-admin-notification` sends `welcome_signup` to the new user. ✅
5. **Confirmation email** — Supabase sends confirmation mail to `labrynicolas@gmail.com`. ✅
6. **Navigation** — User redirected to `/email-confirmation` page. ✅
7. **Free trial intent** — If `intent=free_trial`, it's stored in localStorage for later activation (no longer called immediately). ✅

### Bug found: Race condition on login after email confirmation

**Location:** `src/pages/Auth.tsx` — `onAuthStateChange` handler (lines 129-167) vs `handleSignIn` (lines 597-659)

**Problem:** When a user logs in with email/password on `/auth`, TWO code paths run:

1. `handleSignIn` (synchronous after `signInWithPassword`) — checks `alphalens_pending_free_trial`, removes it, calls `activateFreeTrial()`, navigates to `/payment-success?type=free_trial`
2. `onAuthStateChange` SIGNED_IN callback (via `setTimeout(..., 0)`) — finds `pendingTrial` already removed by #1, falls through to `navigate('/dashboard')` (line 163/166)

**Result:** The deferred `onAuthStateChange` callback overrides the navigation from `handleSignIn`, sending the user to `/dashboard` instead of `/payment-success?type=free_trial`. The free trial IS activated, but the user misses the success page.

**Fix:** In the `onAuthStateChange` SIGNED_IN handler for email/password (lines 129-167), skip navigation entirely when the sign-in originated from `handleSignIn`. The simplest approach: set a flag like `isManualSignIn` before calling `signInWithPassword`, and check it in the listener to avoid double-handling.

### No other issues detected

- The `EmailConfirmationSuccess` page correctly redirects to `/auth` for login
- The `EmailConfirmation` page resend uses the correct redirect URL (`/email-confirmation-success`)
- The `activateFreeTrial` edge function is only called post-confirmation (JWT valid)
- Broker selection is optional for email signup (only required for Google OAuth)

### Summary

The signup itself is clean. The only bug is a **navigation race condition** on first login after confirmation when `intent=free_trial`. For users without a free trial intent, the flow works correctly since both paths navigate to `/dashboard`.

### Proposed fix

In `handleSignIn`, set a ref flag before calling `signInWithPassword`. In the `onAuthStateChange` handler, check that flag and skip navigation if the manual sign-in handler already took care of it. This is a ~5 line change.

