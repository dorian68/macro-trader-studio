export interface StripeConfig {
  secretKey: string;
  webhookSecret: string | null;
  mode: 'test' | 'live';
}

/**
 * Get Stripe configuration based on STRIPE_MODE environment variable
 * @returns StripeConfig object with secretKey, webhookSecret, and mode
 * @throws Error if the required secret key is not set
 */
export function getStripeConfig(): StripeConfig {
  const rawMode = Deno.env.get("STRIPE_MODE") || "test";
  
  // Validate STRIPE_MODE — must be exactly "test" or "live"
  if (rawMode !== "test" && rawMode !== "live") {
    console.warn(`[STRIPE-CONFIG] ⚠️ STRIPE_MODE is set to an invalid value: "${rawMode.substring(0, 20)}...". Defaulting to "test". Ensure STRIPE_MODE is either "test" or "live".`);
  }
  
  const mode = (rawMode === "live" ? "live" : "test") as 'test' | 'live';
  
  let secretKey: string;
  let webhookSecret: string | null;
  
  if (mode === "live") {
    secretKey = Deno.env.get("STRIPE_SECRET_KEY_LIVE") || "";
    webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE") || null;
  } else {
    secretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || null;
  }
  
  if (!secretKey) {
    throw new Error(`STRIPE_SECRET_KEY${mode === 'live' ? '_LIVE' : ''} is not set`);
  }
  
  return { secretKey, webhookSecret, mode };
}
