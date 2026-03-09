

## Full Payment Flow Audit

### Issues Found (7 critical, 2 moderate)

---

### CRITICAL 1 — `create-checkout` uses `price_data` instead of `price` ID

The checkout function creates **ad-hoc Stripe prices** via `price_data` on every checkout. This means:
- Each subscription gets a unique, ephemeral price ID
- `check-subscription` has **hardcoded price IDs** (`PRICE_TO_PLAN`) that will never match
- The webhook fallback (lookup by `stripe_price_id` in `plan_parameters`) also fails since the price is ad-hoc

**Fix**: Use the `stripe_price_id` from `plan_parameters` table directly with the `price` field instead of `price_data`. This is Stripe best practice (trackable, consistent).

```
// BEFORE (broken)
line_items: [{ price_data: { currency: 'usd', ... } }]

// AFTER
line_items: [{ price: planParams.stripe_price_id, quantity: 1 }]
```

---

### CRITICAL 2 — AuthGuard blocks paying users

`AuthGuard` requires `profile.status === 'approved'`. New users get `status: 'pending'` via the `handle_new_user` trigger. **Even after successful Stripe payment, users are blocked from the dashboard** because the webhook never updates `profiles.status`.

**Fix**: In the webhook's `checkout.session.completed` handler, after updating `user_plan`, also set `profiles.status = 'approved'`. Paying customers should be auto-approved.

---

### CRITICAL 3 — `check-subscription` and `customer-portal` missing from config.toml

These functions are not listed with `verify_jwt = false`. The gateway rejects calls before the function code runs.

**Fix**: Add both to `supabase/config.toml`.

---

### CRITICAL 4 — CORS headers incomplete on 4 edge functions

`create-checkout`, `check-subscription`, `customer-portal`, and `stripe-webhook` use minimal CORS headers missing `x-supabase-client-platform`, `x-supabase-client-platform-version`, `x-supabase-client-runtime`, `x-supabase-client-runtime-version`. The Supabase JS client sends these headers, causing preflight failures.

**Fix**: Update `corsHeaders` in all 4 functions to include the full set.

---

### CRITICAL 5 — `check-subscription` uses hardcoded price-to-plan mapping

Lines 17-21 hardcode 3 price IDs. These will be wrong in live mode (different keys) and won't match `price_data`-generated prices.

**Fix**: Query `plan_parameters` table dynamically (same pattern as the webhook).

---

### CRITICAL 6 — Checkout opens in new tab for authenticated users

`Pricing.tsx` line 149 uses `window.open(data.url, '_blank')`. This:
- Breaks the payment flow (user loses context)
- May be blocked by popup blockers
- Is not how any SaaS checkout works

**Fix**: Use `window.location.href = data.url` (same as all other checkout calls in the codebase).

---

### CRITICAL 7 — Webhook doesn't update `profiles.status` on subscription cancellation

`customer.subscription.deleted` downgrades credits to `free_trial` but doesn't update `profiles.user_plan` to reflect the downgrade.

**Fix**: Add `profiles.user_plan = 'free_trial'` update in the `subscription.deleted` handler.

---

### MODERATE 1 — Webhook uses `listUsers()` without pagination

`supabase.auth.admin.listUsers()` returns max 1000 users. With growth, user lookup by email will silently fail. This affects all 4 webhook event handlers.

**Fix**: Use `listUsers({ filter: email })` or a paginated approach. However this is a future scalability issue, not blocking today.

---

### MODERATE 2 — `customer-portal` return URL uses preview domain fallback

Line 69 falls back to the Lovable preview URL. Should default to `https://alphalensai.com/dashboard`.

**Fix**: Hardcode production domain as fallback.

---

### Files to modify

| File | Changes |
|------|---------|
| `supabase/functions/create-checkout/index.ts` | Use `price` instead of `price_data`; fix CORS headers |
| `supabase/functions/check-subscription/index.ts` | Remove hardcoded mapping, query DB; fix CORS headers |
| `supabase/functions/stripe-webhook/index.ts` | Auto-approve profile on checkout.session.completed; update user_plan on subscription.deleted |
| `supabase/functions/customer-portal/index.ts` | Fix CORS headers; fix fallback URL |
| `supabase/config.toml` | Add `check-subscription` and `customer-portal` |
| `src/pages/Pricing.tsx` | Change `window.open` to `window.location.href` |

No database schema changes required. No new tables or migrations needed.

