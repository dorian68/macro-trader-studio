

## Diagnostic: Logo not displaying in emails

### Root Cause
The current `LOGO_URL` points to `https://macro-trader-studio.lovable.app/lovable-uploads/Full_logo_no_BG_2.png`. This URL does **not** serve the actual PNG file — Lovable apps are SPAs, so all URLs return the `index.html` page instead of the static asset. Email clients receive HTML instead of an image, and display nothing.

Additionally, the logo `Full_logo_no_BG_2.png` is white text on a transparent background, so even if it loaded, it would be invisible on any light background outside the dark header.

### Solution: Upload the logo to Supabase Storage

You already have a **public** Supabase Storage bucket called `email-assets`. This is the correct place to host email images because Supabase Storage serves files directly (not through SPA routing).

### Action required from you

1. Go to **Supabase Dashboard → Storage → email-assets**:
   [https://supabase.com/dashboard/project/jqrlegdulnnrpiixiecf/storage/buckets/email-assets](https://supabase.com/dashboard/project/jqrlegdulnnrpiixiecf/storage/buckets/email-assets)

2. Upload your logo file (e.g., `Full_logo_no_BG_2.png` or whichever version you want in emails)

3. After uploading, copy the **public URL** — it will look like:
   `https://jqrlegdulnnrpiixiecf.supabase.co/storage/v1/object/public/email-assets/Full_logo_no_BG_2.png`

4. Come back here and share the URL — I will update the edge function with the correct URL and redeploy it.

### Why this works
- Supabase Storage serves raw files directly (no SPA interference)
- The `email-assets` bucket is already configured as **public** (no auth needed)
- Email clients can fetch the image without authentication

