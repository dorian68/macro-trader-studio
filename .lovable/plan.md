

# Fix: Free Trial Credit Overwrite Bug

## Root Cause

The `initialize_user_credits` DB function uses `ON CONFLICT (user_id) DO UPDATE SET` which **overwrites all credits** to the trial amount. A user with 80 credits clicks "Start Free Trial" and gets reset to 21.

## Solution (3 changes)

### 1. DB Migration — Add `trial_used` column + safe trial RPC

Add `trial_used` (boolean, default false) and `trial_started_at` (timestamp) to `profiles` table.

Create a new `activate_free_trial_safe` RPC function (SECURITY DEFINER, atomic):
- Check `trial_used` on profiles → if true, return `{success: false, reason: 'already_used'}`
- If false: **ADD** trial credits on top of existing credits (not overwrite)
- Set `trial_used = true`, `trial_started_at = now()`
- Return `{success: true, credits_added: {...}}`

```sql
-- Pseudocode for the RPC
SELECT trial_used FROM profiles WHERE user_id = p_user_id FOR UPDATE;
IF trial_used THEN RETURN false;
-- Get trial amounts from plan_parameters
SELECT max_queries, max_ideas, max_reports FROM plan_parameters WHERE plan_type = 'free_trial';
-- ADD credits (not overwrite)
UPDATE user_credits SET
  credits_queries_remaining = credits_queries_remaining + trial_queries,
  credits_ideas_remaining = credits_ideas_remaining + trial_ideas,
  credits_reports_remaining = credits_reports_remaining + trial_reports
WHERE user_id = p_user_id;
-- If no row exists, INSERT
-- Mark trial as used
UPDATE profiles SET trial_used = true, trial_started_at = now();
```

### 2. Edge Function — `activate-free-trial/index.ts`

Replace the current logic (which calls `initialize_user_credits`) with a call to the new `activate_free_trial_safe` RPC. Return appropriate status codes:
- 200 + success if trial applied
- 409 if trial already used
- Remove the `profiles.update({ user_plan: 'free_trial' })` for users who already have a paid plan

### 3. Frontend — `useCreditManager.tsx` + Homepage/Auth

- `activateFreeTrial`: handle 409 response (already used) gracefully
- Add `trialUsed` state fetched from profiles
- Homepage CTA: if user is logged in AND `trial_used == true`, show "Trial Already Activated" (disabled button) instead of linking to `/auth?intent=free_trial`
- Auth.tsx: before calling `activateFreeTrial()`, no change needed — the backend guard handles idempotency

### Files Modified

| File | Change |
|------|--------|
| Migration SQL | Add `trial_used`, `trial_started_at` columns + `activate_free_trial_safe` RPC |
| `supabase/functions/activate-free-trial/index.ts` | Use new safe RPC, handle already-used case |
| `src/hooks/useCreditManager.tsx` | Handle 409, expose `trialUsed` |
| `src/pages/Homepage.tsx` | Conditional CTA for logged-in users with trial already used |

### What is NOT changed

- `initialize_user_credits` RPC (used by paid plan provisioning — untouched)
- Credit consumption logic (`decrement_credit`, `try_engage_credit`, `auto_manage_credits`)
- Authentication system
- Stripe payment flows

