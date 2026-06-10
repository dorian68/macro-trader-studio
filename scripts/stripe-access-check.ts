// Read-only Stripe access check. Proves connectivity and answers the "basil"
// question (is `invoice.subscription` present at runtime?).
//
// Run:  deno run --allow-env --allow-net scripts/stripe-access-check.ts
// Requires env STRIPE_TEST_KEY (sk_test_... — TEST MODE ONLY).
import Stripe from "https://esm.sh/stripe@18.5.0";

const key = Deno.env.get("STRIPE_TEST_KEY");
if (!key) {
  console.error("STRIPE_TEST_KEY not set. Aborting (no live keys).");
  Deno.exit(1);
}
if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
  console.error("Refusing: key is not a TEST-mode key (expected sk_test_ / rk_test_).");
  Deno.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });

// 1) Prove access: who are we?
const account = await stripe.accounts.retrieve();
console.log("✅ Connected to Stripe account:", {
  id: account.id,
  country: account.country,
  livemode: (account as unknown as { livemode?: boolean }).livemode ?? false,
});

// 2) Answer the basil question on a real Invoice (if any exist).
const invoices = await stripe.invoices.list({ limit: 1 });
const inv = invoices.data[0];
if (!inv) {
  console.log("ℹ️ No invoices in this test account yet — create a test subscription to verify field shape.");
} else {
  const legacy = (inv as unknown as { subscription?: unknown }).subscription ?? null;
  const basil = inv.parent?.subscription_details?.subscription ?? null;
  console.log("🔎 Invoice field shape:", {
    invoiceId: inv.id,
    "invoice.subscription (legacy)": legacy,
    "invoice.parent.subscription_details.subscription (basil)": basil,
  });
}
