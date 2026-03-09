

## Audit: Signup Experience — Why "Nothing Seems to Happen"

### Root Cause

After clicking "Sign Up", the code at line 526 does `navigate('/email-confirmation')`. However, when Supabase has email confirmation enabled, `signUp()` returns a user object but **does NOT create a session**.

The `EmailConfirmation` page (line 19-30) immediately calls `supabase.auth.getUser()`. Since there's no active session, `user` is null, and it redirects straight back to `/auth` (line 30). The user sees:

```text
Click "Sign Up" → loading spinner → /email-confirmation → instantly → /auth
```

The entire round-trip happens in ~200ms. The user sees a flash and ends up back on the login page with no feedback. The toast notification from `success.registrationSuccessful` is never shown either — the code only fires the welcome email + admin notification, but never shows a toast on the Auth page itself.

### Issues Found

1. **EmailConfirmation page requires a session that doesn't exist** — redirects back to `/auth` immediately
2. **No success toast shown after signup** — the `else` block (line 496) sends emails and navigates but never calls `toast()`
3. **No success state on the Auth page** — if we can't go to EmailConfirmation, the user needs visual feedback right where they are

### Fix Plan

**Approach: Show a success state inline on the Auth page + fix EmailConfirmation to work without a session**

#### 1. Add signup success state to Auth.tsx
- Add a `signupSuccess` state + `signupEmail` state
- After successful signup, set these states instead of navigating away
- Render a success card (replacing the form) showing: logo, email icon, "Check your email" message, resend button, "Back to login" button
- This guarantees the user sees immediate feedback without needing a session

#### 2. Fix EmailConfirmation.tsx to work without session
- Accept email via URL search params (`?email=...`) as fallback
- If no session AND no email param, then redirect to `/auth`
- This way, if the user lands here from the confirmation email link, it still works

#### 3. Add missing success toast in handleSignUp
- Add a toast notification before showing the success state, so the user gets both visual feedback and a toast

### Files to modify
- `src/pages/Auth.tsx` — add `signupSuccess`/`signupEmail` state, render success card when active, add toast after signup
- `src/pages/EmailConfirmation.tsx` — accept email from URL params as fallback when no session

### Result
After clicking "Sign Up", the user will see a clear success screen with their email, a "check your inbox" message, and a resend option — all without leaving the auth page.

