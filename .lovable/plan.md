

## Remove emojis and fix logo in email templates

### Changes to `supabase/functions/send-admin-notification/index.ts`

**1. Fix logo URL** — Switch back to the Supabase Storage URL (which works in the other email):
```
https://jqrlegdulnnrpiixiecf.supabase.co/storage/v1/object/public/email-assets/alphalens_logo_new.png
```

**2. Remove all emojis** from subjects and HTML body across all 8 templates:

| Template | Current subject | New subject |
|---|---|---|
| status_approved | `🎉 Your Alphalens Account has been Approved!` | `Your Alphalens Account has been Approved!` |
| credits_updated | `💳 Your Alphalens Credits Have Been Updated` | `Your Alphalens Credits Have Been Updated` |
| reactivation_request | `🔔 New Account Reactivation Request - Alphalens` | `New Account Reactivation Request - Alphalens` |
| reactivation_approved | `✅ Your Alphalens Account Has Been Reactivated!` | `Your Alphalens Account Has Been Reactivated!` |
| reactivation_rejected | `❌ Update on Your Account Reactivation Request` | `Update on Your Account Reactivation Request` |
| welcome_signup | `🎉 Welcome to Alphalens – Your Registration is Being Reviewed` | `Welcome to Alphalens – Your Registration is Being Reviewed` |
| new_registration | `🆕 New Registration Pending Approval - Alphalens` | `New Registration Pending Approval - Alphalens` |

Also remove inline emojis: `🚀`, `✅`, `💳`, `🔔`, `🆕`, `⏳`, `🤖`, `📊`, `📈`, `📄`, `👋` from all HTML body content.

No other changes — all template structure, styles, and logic remain identical.

