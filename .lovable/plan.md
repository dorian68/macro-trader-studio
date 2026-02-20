

## Plan: Credit System Fixes + Admin Panel Repairs

This plan addresses 5 confirmed bugs across the credit system and admin panel. No routing, payment, or schema changes.

---

### BUG 1 (CRITICAL): Stale Engaged Credits Never Cleaned Up

**Evidence**: 22 entries in `credits_engaged` with jobs stuck in `pending` status, oldest from January 13 (5+ weeks). The current `cleanup_stale_engaged_credits()` function treats `pending` jobs as "active" and never purges them.

**Fix**: Database migration to replace the cleanup function with one that also purges engagements where:
- Job is `pending` for more than 10 minutes
- Job does not exist (orphaned)
- Engagement older than 30 minutes regardless

Then execute the function immediately to clear the 22 stale entries.

---

### BUG 2 (HIGH): UI Shows Wrong Credit Balance

**Evidence**: `CreditsNavbar.tsx` and `CreditDisplay.tsx` display raw `credits_*_remaining` values without subtracting engaged credits. A user with 7 ideas credits but 7 engaged sees "7" when they actually have 0 available.

**Fix**: Update `useCreditManager.tsx` to fetch engaged credit counts alongside remaining credits. Expose `effectiveQueries`, `effectiveIdeas`, `effectiveReports` values. Update both UI components to display effective balances.

---

### BUG 3 (MEDIUM): Missing `await` on Async Credit Check

**Evidence**: In `useAIInteractionLogger.tsx` line 52:
```
if (!checkCredits(creditType)) {
```
`checkCredits` is async (returns `Promise<boolean>`). A Promise is always truthy, so `!Promise` is always `false`. The credit check never blocks.

**Fix**: Change to `if (!(await checkCredits(creditType)))`.

---

### BUG 4 (HIGH): Admin "Unknown" Emails

**Evidence**: `fetch-users-with-emails/index.ts` line 114 calls `listUsers()` without pagination. Supabase returns max 50 users per page. With 56+ profiles, 6+ users show "Unknown" email.

**Fix**: Add pagination loop with `perPage: 1000` to fetch all auth users.

---

### BUG 5 (MEDIUM): Admin Table Rows Not Fully Visible

**Evidence**: `UsersTable.tsx` wraps the table in a Radix `ScrollArea` with fixed `h-[600px]`. The nested `overflow-x-auto` div inside ScrollArea makes horizontal scrolling unreliable, hiding action buttons.

**Fix**: Replace `ScrollArea` with native `max-h-[600px] overflow-y-auto` on the outer container, keeping `overflow-x-auto` for horizontal scroll.

---

### Technical Details

**Files to modify:**

| File | Change |
|------|--------|
| Database migration | Replace `cleanup_stale_engaged_credits()` + run immediately |
| `src/hooks/useCreditManager.tsx` | Add engaged credits fetching, expose effective balances |
| `src/components/CreditsNavbar.tsx` | Display effective balance (remaining - engaged) |
| `src/components/CreditDisplay.tsx` | Display effective balance (remaining - engaged) |
| `src/hooks/useAIInteractionLogger.tsx` | Add missing `await` on line 52 |
| `supabase/functions/fetch-users-with-emails/index.ts` | Paginate `listUsers()` |
| `src/components/admin/UsersTable.tsx` | Replace ScrollArea with native scroll |

**What does NOT change:**
- No routing changes
- No payment/billing integration changes
- No new database tables or columns
- No edge function logic changes (except admin email fix)
- No changes to AURA, TradingDashboard, or other pages
- `tryEngageCredit` RPC remains atomic with `FOR UPDATE` locking
- `auto_manage_credits` trigger remains unchanged

