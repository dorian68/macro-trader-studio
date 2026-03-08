

## Auth Flow Audit — Critical Bugs Found

### Bug 1: No `/reset-password` page (CRITICAL — feature completely broken)

**Location:** `src/pages/Auth.tsx` line 1031

Password reset redirects to `/auth` after the user clicks the email link. There is no `/reset-password` route in `App.tsx`, and no code anywhere to detect `type=recovery` in the URL hash or show a "set new password" form. When a user clicks the reset link in their email:
1. They land on `/auth` with `#type=recovery` in the URL
2. Supabase auto-logs them in
3. They see the normal login form — **password is never changed**

**Fix:** Create a dedicated `src/pages/ResetPassword.tsx` page that:
- Detects `type=recovery` in the URL hash
- Shows a form with new password + confirm password fields
- Calls `supabase.auth.updateUser({ password })` on submit
- Redirects to `/auth` on success

Add the route to `App.tsx` and update the `redirectTo` in `Auth.tsx` line 1031.

---

### Bug 2: Wrong translation keys in reactivation dialog (broken UI text)

**Location:** `src/pages/Auth.tsx` lines 868, 869, 881, 882, 886, 887, 901

The file uses `useTranslation('auth')` which means the `t()` function already operates in the `auth` namespace. But the reactivation toasts use `t('auth.reactivation.request_sent_title')` — this resolves to the key `auth.auth.reactivation.request_sent_title` which doesn't exist.

All these should be `t('reactivation.request_sent_title')`, `t('reactivation.request_sent_description')`, etc.

**Also:** The Farsi `auth.json` is missing `request_button`, `request_sent_title`, `request_sent_description`, `request_error_title`, `request_error_description`, `pending_request_title`, `pending_request_description` keys.

---

### Bug 3: `isManualSignInRef` not reset on early returns (navigation permanently broken)

**Location:** `src/pages/Auth.tsx` lines 621-628

If a soft-deleted user logs in, `handleSignIn` returns early at line 627 without resetting `isManualSignInRef.current = false` (which happens at line 667). This means the `onAuthStateChange` handler will skip ALL subsequent navigation forever for this component instance, including after the reactivation dialog is dismissed and the user tries to log in again.

**Fix:** Reset the ref in ALL early return paths in `handleSignIn`, or use a `finally`-style pattern.

---

### Bug 4: Missing Farsi reactivation translation keys

`src/locales/fa/auth.json` `reactivation` section only has `title`, `description`, `confirm`, `cancel`, `success`, `error`. It's missing the keys used in the dialog: `request_button`, `request_sent_title`, `request_sent_description`, `request_error_title`, `request_error_description`, `pending_request_title`, `pending_request_description`.

---

### Implementation Plan

1. **Create `src/pages/ResetPassword.tsx`**
   - Detect recovery token from URL hash
   - Show new password + confirm password form
   - Call `supabase.auth.updateUser({ password })` on submit
   - Redirect to `/auth` with success toast

2. **Add route in `src/App.tsx`**
   - Add `<Route path="/reset-password" element={<ResetPassword />} />`

3. **Fix redirect URL in `src/pages/Auth.tsx`**
   - Line 1031: change `redirectTo` from `/auth` to `/reset-password`

4. **Fix translation keys in `src/pages/Auth.tsx`**
   - Lines 868-901: Remove `auth.` prefix from all `t('auth.reactivation.*')` calls

5. **Fix `isManualSignInRef` reset in `src/pages/Auth.tsx`**
   - Reset ref to `false` in the soft-delete early return (line 627) and error path (line 641)

6. **Update `src/locales/fa/auth.json`**
   - Add missing reactivation keys to match en/es structure

### Files to modify
- `src/pages/ResetPassword.tsx` — new file
- `src/App.tsx` — add route
- `src/pages/Auth.tsx` — fix redirectTo, translation keys, ref reset
- `src/locales/fa/auth.json` — add missing keys

