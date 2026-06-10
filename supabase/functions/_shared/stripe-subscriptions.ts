import Stripe from "https://esm.sh/stripe@18.5.0";

const terminalStatuses = new Set<Stripe.Subscription.Status>([
  "canceled",
  "incomplete_expired",
]);

export async function cancelUserSubscriptions(
  stripe: Stripe,
  userId: string,
  email: string | null | undefined,
): Promise<number> {
  const subscriptions = new Map<string, Stripe.Subscription>();

  for await (const subscription of stripe.subscriptions.search({
    query: `metadata['user_id']:'${userId}'`,
    limit: 100,
  })) {
    subscriptions.set(subscription.id, subscription);
  }

  if (email) {
    for await (const customer of stripe.customers.list({ email, limit: 100 })) {
      for await (const subscription of stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 100,
      })) {
        subscriptions.set(subscription.id, subscription);
      }
    }
  }

  let canceledCount = 0;
  for (const subscription of subscriptions.values()) {
    if (!terminalStatuses.has(subscription.status)) {
      await stripe.subscriptions.cancel(subscription.id);
      canceledCount += 1;
    }
  }

  return canceledCount;
}
