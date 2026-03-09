

## Fix email logo visibility

### Problem
The logo `alphalens_logo_new.png` is white text on transparent background. While it theoretically works on the dark blue email header, many email clients (Gmail, Outlook) don't render PNG transparency reliably in emails, showing a white background instead -- making the logo invisible.

### Solution
This requires a **manual action from the user**: upload a logo with an opaque background to Supabase Storage.

Two options:
1. **Logo with dark background** (#002244) matching the email header gradient -- best for the current dark header design
2. **Logo with white background and dark text** -- more universally compatible but requires changing the header design

Once the user uploads the new file, update line 18 in `supabase/functions/send-admin-notification/index.ts` with the new filename and redeploy.

### No code changes possible until user uploads new asset

