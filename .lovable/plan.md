

## Audit: Email Template Images + Logo Branding

### Critical Finding: All logo images are BROKEN (404)

Every email template references this URL:
```
https://jqrlegdulnnrpiixiecf.supabase.co/storage/v1/object/public/lovable-uploads/Full_logo_no_BG_2.png
```

This URL returns **`{"statusCode":"404","error":"Bucket not found"}`**. The bucket `lovable-uploads` does not exist in Supabase Storage (only `abcg-insights` and `AlphaLens_PDF` exist). This means every email sent shows a **broken image icon** where the logo should be.

### Template-by-template audit

| Template | Logo present? | Logo visible? |
|----------|--------------|---------------|
| `status_approved` | Yes (img tag) | NO - 404 broken image |
| `status_rejected` | Yes (img tag) | NO - 404 broken image |
| `credits_updated` | Yes (img tag) | NO - 404 broken image |
| `welcome_signup` | Yes (img tag) | NO - 404 broken image |
| `new_registration` | Yes (img tag) | NO - 404 broken image |
| `reactivation_request` | NO - no img tag at all | N/A |
| `reactivation_approved` | NO - no img tag at all | N/A |
| `reactivation_rejected` | NO - no img tag at all | N/A |

### Additional issue: Logo is white-on-transparent

The file `Full_logo_no_BG_2.png` is a white logo on transparent background. The email header has a dark gradient (`#002244` to `#1e40af`), so it would be visible **if** the URL worked. However, for maximum email client compatibility, a logo with a solid background or the white-BG version (`Full_logi_white_BG_FINAL.png`) would be safer.

### Fix Plan

**Step 1: Create a public Supabase storage bucket `email-assets`** and upload the logo there. This gives a stable, publicly accessible URL independent of the app deployment.

**Step 2: Upload the logo** `Full_logi_white_BG_FINAL.png` (white background version, works in all email clients regardless of header color) to the new bucket.

**Step 3: Update all 8 email templates** in `send-admin-notification/index.ts`:
- Replace the broken Supabase storage URL with the new public bucket URL
- Add the logo `<img>` tag to the 3 templates that are missing it (`reactivation_request`, `reactivation_approved`, `reactivation_rejected`)
- Ensure consistent header styling across all templates

### Files to modify
- `supabase/functions/send-admin-notification/index.ts` — update all logo URLs + add missing logos

### Result
All 8 notification emails will display the Alphalens logo correctly, giving a professional, branded appearance.

