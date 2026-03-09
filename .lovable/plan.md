

## Fix "Sign in to purchase" checkout flow

### Problem
4 bugs prevent the pricing-to-checkout flow from working correctly for unauthenticated users.

### Changes

#### 1. Fix property name mismatch in `src/pages/Auth.tsx` (~line 147)
```
// BEFORE (broken):
body: { planType: pendingPlan }

// AFTER:
body: { plan: pendingPlan, success_url: 'https://alphalensai.com/payment-success?session_id={CHECKOUT_SESSION_ID}', cancel_url: 'https://alphalensai.com/payment-canceled' }
```

#### 2. Store pending plan on login too, not just signup — `src/pages/Auth.tsx`
Currently `localStorage.setItem('alphalens_pending_plan', selectedPlan)` only runs in the signup handler. Add the same logic in the `handleSignIn` function so existing users clicking "Sign in to purchase" also get redirected to checkout after login.

#### 3. Hardcode production URLs in Pricing.tsx checkout call (~line 134)
Replace `window.location.origin` with `https://alphalensai.com` in `proceedWithCheckout` for `success_url` and `cancel_url`, consistent with all other redirect fixes already applied.

### Files to modify
- `src/pages/Auth.tsx` (fix body property + store plan on login)
- `src/pages/Pricing.tsx` (hardcode production domain in URLs)

