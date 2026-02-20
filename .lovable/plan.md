

## Credit System Audit - Root Cause Report and Fix Plan

### Root Cause: 3 Critical Bugs Found

---

### BUG 1 (CRITICAL) - Stale Engaged Credits Never Get Cleaned Up

**The primary cause of "insufficient credits" false positives.**

The `cleanup_stale_engaged_credits()` DB function only cleans entries where:
- The associated job is NOT in `pending` or `running` status, OR
- The engagement is older than 10 minutes

**The problem**: All 22 stale entries in the database have jobs stuck in `pending` status forever. These jobs were created, credits were engaged, but the backend never responded (timeout, crash, network error). The job stays `pending` indefinitely, and the cleanup function considers `pending` as "active" and never purges the engagement.

**Live evidence** (user `ecb4200a`):
- Ideas: 7 credits remaining, 7 engaged = 0 available (UI shows 7)
- Queries: 131 remaining, 13 engaged = 118 available (UI shows 131)
- Reports: 14 remaining, 1 engaged = 13 available (UI shows 14)

The oldest stale engagement dates back to January 13, 2026 -- over 5 weeks.

**Fix**: Change the cleanup function to also purge engagements where the associated job has been `pending` for more than 10 minutes (it means the backend never picked it up).

---

### BUG 2 (HIGH) - UI Credit Display Does Not Subtract Engaged Credits

`CreditDisplay.tsx` and `CreditsNavbar.tsx` show `credits_queries_remaining` directly from the `user_credits` table WITHOUT subtracting `credits_engaged` count.

The user sees "7 Ideas credits" but actually has 0 available because 7 are locked by stale engagements.

**Fix**: Both components must show `remaining - engaged` as the effective balance.

---

### BUG 3 (MEDIUM) - Async checkCredits Called Without Await

In `useAIInteractionLogger.tsx` line 52:
```
if (!checkCredits(creditType)) { ... }
```

`checkCredits` is `async` (returns `Promise<boolean>`), but is called without `await`. A Promise object is always truthy, so `!Promise` is always `false`. This means the credit check in `logInteraction` never blocks -- it always passes.

This is not the blocking gate (that role belongs to `tryEngageCredit`), but it means the `logInteraction` function never correctly validates credits before logging.

**Fix**: Add `await` to the call.

---

### Implementation Plan

#### Step 1: Fix the cleanup function (SQL migration)

Update `cleanup_stale_engaged_credits()` to also purge engagements where:
- Job is `pending` for more than 10 minutes (backend never picked it up)
- Job doesn't exist at all (orphaned engagement)

```sql
CREATE OR REPLACE FUNCTION public.cleanup_stale_engaged_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cleaned_count INT;
BEGIN
  DELETE FROM public.credits_engaged ce
  WHERE 
    -- No associated job exists at all
    NOT EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = ce.job_id
    )
    -- Job is in terminal state (completed/failed/error)
    OR EXISTS (
      SELECT 1 FROM public.jobs j 
      WHERE j.id = ce.job_id 
      AND j.status IN ('completed', 'failed', 'error')
    )
    -- Job stuck in pending for more than 10 minutes
    OR EXISTS (
      SELECT 1 FROM public.jobs j 
      WHERE j.id = ce.job_id 
      AND j.status = 'pending'
      AND j.created_at < NOW() - INTERVAL '10 minutes'
    )
    -- Engagement is older than 30 minutes regardless
    OR ce.engaged_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS cleaned_count = ROW_COUNT;

  IF cleaned_count > 0 THEN
    RAISE LOG '[CLEANUP] Purged % stale credits_engaged entries', cleaned_count;
  END IF;
END;
$$;
```

#### Step 2: Immediate one-time cleanup

Run the updated function immediately to purge the 22 currently stale entries.

#### Step 3: Fix UI credit display

**`src/components/CreditsNavbar.tsx`** and **`src/components/CreditDisplay.tsx`**:

Add a query to `credits_engaged` to show effective balance = `remaining - engaged`.

Modify `useCreditManager.tsx` to expose effective credits by fetching engaged count alongside remaining credits and computing `effectiveCredits` = `remaining - engaged`.

#### Step 4: Fix the async/await bug

**`src/hooks/useAIInteractionLogger.tsx`** line 52:
```typescript
// Before (broken):
if (!checkCredits(creditType)) {

// After (fixed):
if (!(await checkCredits(creditType))) {
```

Also make `checkAndLogInteraction` properly await this.

#### Step 5: Add post-engagement credit refresh

After `tryEngageCredit` succeeds on any page, dispatch `creditsUpdated` event so the navbar immediately reflects the new effective balance.

### What Does NOT Change

- Database schema (no new tables/columns)
- Credit engagement flow (`tryEngageCredit` RPC remains atomic)
- Debit-on-completion trigger (`auto_manage_credits`)
- Payment/billing integration
- Routing, feature logic
- Edge functions (except cleanup logic improvement)

### Technical Summary

| Issue | Severity | Root Cause | Fix |
|-------|----------|-----------|-----|
| Stale engaged credits | CRITICAL | Cleanup ignores stuck `pending` jobs | Expand cleanup conditions |
| UI shows wrong balance | HIGH | Display reads `remaining` without subtracting `engaged` | Show effective balance |
| checkCredits not awaited | MEDIUM | Missing `await` on async call | Add `await` |
| No refresh after engagement | LOW | `creditsUpdated` event not fired after `tryEngageCredit` | Dispatch event |

