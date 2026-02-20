

## Plan: Fix Admin Issues + Credit System Patches

### Issue 1: "Unknown" emails in admin user list

**Root cause**: The edge function `fetch-users-with-emails` calls `supabaseAdmin.auth.admin.listUsers()` without pagination. Supabase's `listUsers()` returns a maximum of 50 users per page by default. With 56 profiles in the database, at least 6 users won't have their email matched, showing "Unknown".

**Fix**: Paginate through all auth users in the edge function using a loop with `perPage: 1000` (maximum allowed) to ensure all users are fetched.

```
// Before (line 114):
const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers()

// After:
const allAuthUsers = [];
let page = 1;
while (true) {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
  allAuthUsers.push(...(data.users || []));
  if (!data.users || data.users.length < 1000) break;
  page++;
}
```

**File**: `supabase/functions/fetch-users-with-emails/index.ts`

---

### Issue 2: User management rows not fully visible (can't access action buttons)

**Root cause**: The `UsersTable` wraps the table in a `ScrollArea` with fixed `h-[600px]` for vertical scroll, but the horizontal scrolling is nested inside it. On smaller screens, the table columns (Email, User ID, Broker, Status, Role, Plan & Credits, Created, Actions) exceed viewport width, and the horizontal scroll is hard to reach or interact with because `ScrollArea` primarily handles vertical scrolling.

**Fix**: 
- Remove the `ScrollArea` wrapper and keep only the `overflow-x-auto` div for horizontal scroll
- Add `max-h-[600px] overflow-y-auto` directly on the outer container
- This makes both horizontal and vertical scrolling work natively without Radix ScrollArea interfering

**File**: `src/components/admin/UsersTable.tsx` (lines 219-348)

---

### Issue 3: Credit system fixes (from approved plan)

Three changes to implement:

**A) Database migration** -- Update `cleanup_stale_engaged_credits()` to purge engagements where:
- Job is `pending` for more than 10 minutes
- Job does not exist (orphaned)
- Engagement older than 30 minutes regardless
- Then run the function immediately to clean 22 stale entries

**B) Fix missing `await`** in `useAIInteractionLogger.tsx` line 52:
```
// Before:
if (!checkCredits(creditType)) {
// After:
if (!(await checkCredits(creditType))) {
```

**C) UI effective balance** -- Update `CreditsNavbar.tsx` and `CreditDisplay.tsx` to show `remaining - engaged` instead of raw `remaining`. Add engaged credits fetching to `useCreditManager.tsx` and expose `effectiveCredits` values.

**D) Post-engagement refresh** -- After `tryEngageCredit` succeeds, dispatch `creditsUpdated` event so navbar updates immediately.

---

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/fetch-users-with-emails/index.ts` | Paginate `listUsers()` |
| `src/components/admin/UsersTable.tsx` | Replace ScrollArea with native scroll |
| `src/hooks/useAIInteractionLogger.tsx` | Add missing `await` |
| `src/hooks/useCreditManager.tsx` | Add engaged credits tracking, expose effective balances |
| `src/components/CreditsNavbar.tsx` | Show effective balance |
| `src/components/CreditDisplay.tsx` | Show effective balance |
| Database migration | Update cleanup function + immediate execution |

### What does NOT change

- No routing changes
- No payment/billing changes
- No schema changes (columns/tables)
- No edge function logic other than the listed fixes
- No changes to AURA, TradingDashboard, or other pages
