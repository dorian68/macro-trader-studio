

## Fix Email Delivery + Clean Up Templates

### Changes to `supabase/functions/send-admin-notification/index.ts`

**1. Fix sender address (line 592)**
Change `from: "Alphalens Platform <onboarding@resend.dev>"` to `from: "Alphalens Platform <noreply@optiquant-ia.com>"`. This is the critical fix that will make emails actually reach users.

**2. Fix TypeScript interface mismatch (lines 11-16)**
The interface declares `type` and `userEmail`, but the handler at line 581 destructures `to` and `notificationType`. Update the interface to match the actual destructuring:
```typescript
interface AdminNotificationRequest {
  to: string;
  notificationType: string;
  userName: string;
  metadata?: any;
}
```

**3. Standardize hardcoded URLs**
Replace all inconsistent URLs with `https://alphalensai.com`:
- Line 168: `macro-trader-studio.lovable.app/auth` → `alphalensai.com/auth`
- Line 489: `macro-trader-studio.lovable.app` → `alphalensai.com`

Lines 306, 350, 393, 553 already use `alphalensai.com` — no change needed.

### Files to modify
- `supabase/functions/send-admin-notification/index.ts` — 4 line-level edits

### Result
All notification emails (approval, rejection, credits, reactivation, welcome, new registration) will be delivered to real users via the verified `optiquant-ia.com` domain.

