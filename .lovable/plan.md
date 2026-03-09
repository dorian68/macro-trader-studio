

## Fix email links: alphalens.ai → alphalensai.com

### Problem
All links in the `send-admin-notification` edge function point to `alphalens.ai` instead of the correct production domain `alphalensai.com`.

### Changes — `supabase/functions/send-admin-notification/index.ts`

Global find-and-replace of `https://alphalens.ai` → `https://alphalensai.com` across all occurrences:

- **Footer links** (×4 templates): `/privacy` and `/terms`
- **CTA links**: `/dashboard`
- **Support email references**: `support@alphalens.ai` → `support@alphalensai.com`

No structural or logic changes. Redeploy the edge function after edit.

