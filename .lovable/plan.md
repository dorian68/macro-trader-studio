

# Audit: Report Generation (`/reports`)

## Critical Bugs Found

### 1. Double Job Creation (HIGH)
`generateReport()` creates a job via `createJob()` (line 511), then `enhancedPostRequest()` creates **another job** with `enableJobTracking: true` (line 619). Since `jobId: reportJobId` is passed, `enhancedPostRequest` skips the insert (line 64 of enhanced-request.ts), but it still runs a full auth check, session refresh, and redundant logging. This is wasteful and fragile — if the option were ever removed, it would create duplicate jobs.

**Fix**: Remove `enableJobTracking: true` from the `enhancedPostRequest` call. The job is already created by `createJob()`. Use `safePostRequest` directly instead, or pass `enableJobTracking: false`.

### 2. Missing `job_id` in Initial Job Payload (HIGH)
The first job created via `createJob()` (line 511) stores `reportPayload` as `request_payload`, but `reportPayload` does NOT contain `job_id`. The `job_id` is only added later at line 617 (`...reportPayload, job_id: reportJobId`). This means the `request_payload` in the DB lacks `job_id`. The n8n webhook receives it correctly, but the persisted record is incomplete.

**Fix**: Add `job_id` to `reportPayload` before calling `createJob()`.

### 3. Fallback Overwrites Realtime Result (MEDIUM)
Lines 644-663: After the HTTP request, the code checks `if (!currentReport)` and creates a fallback report with placeholder content. But `currentReport` is React state — it's always the value from the start of the render, so this fallback **always executes**, potentially overwriting the realtime result that arrives later via `useRealtimeResponseInjector`.

**Fix**: Remove the synchronous fallback block (lines 644-663). The realtime injector and dual response handler already cover all response paths.

### 4. Duplicate Toast on Success (LOW)
Line 667-670: A "Report Generated" toast fires unconditionally at the end of `generateReport()`, even though the realtime injector (line 125-129) and the dual response handler (line 586-589) each fire their own toast. This results in **2-3 "Report Generated" toasts**.

**Fix**: Remove the toast at line 667-670. Let the response handlers show it.

### 5. `dualResponseHandler` Never Extracts HTML (MEDIUM)
The dual response handler (lines 549-590) only creates structured `GeneratedReport` sections — it never checks for HTML content (`base_report`, `html`, etc.). Meanwhile, the backend consistently returns HTML (confirmed: all completed jobs have `payload_type: string` starting with `<html>`). So if the dual handler fires instead of the realtime injector, the user gets placeholder text instead of the actual report.

**Fix**: Add HTML extraction logic to the dual response handler, matching the pattern used in `onReportResult`.

### 6. Orphaned Pending Jobs (LOW)
Two jobs in the DB are stuck at `pending` forever (no timeout, no cleanup). There's no mechanism to expire or retry stale jobs.

**Fix**: Consider adding a cleanup query or a `created_at` timeout check when loading persisted reports.

### 7. `send-report-email` Uses Resend Dev Sender (LOW)
The edge function sends from `onboarding@resend.dev` — this is Resend's sandbox domain. Emails may land in spam or be rejected. Should use a verified custom domain.

## Proposed Changes

### File: `src/pages/Reports.tsx`
1. **Remove double job creation**: Change `enhancedPostRequest` to use `safePostRequest` directly (the job already exists).
2. **Add `job_id` to payload before `createJob`**.
3. **Remove synchronous fallback** (lines 644-663) that creates placeholder content.
4. **Remove duplicate toast** at line 667-670.
5. **Add HTML extraction to dual response handler** (lines 549-590).

### File: `supabase/functions/send-report-email/index.ts`
6. No code change needed now, but flag the `onboarding@resend.dev` sender as a production blocker.

## Summary
The core flow works (n8n webhook → Supabase job → realtime update → HTML rendering), but there are redundant paths competing with each other (dual handler vs realtime injector vs synchronous fallback), causing duplicate toasts, placeholder content flashing, and wasted API calls. The fix consolidates to a single clean path: `createJob` → `POST to n8n` → realtime injector handles response.

