import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isFreeTrialExpired } from '../src/lib/trial';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('free-trial expiry follows the configured duration', () => {
  const now = Date.parse('2026-06-10T12:00:00Z');
  const startedAt = '2026-06-05T12:00:00Z';

  expect(isFreeTrialExpired('free_trial', startedAt, 4, now)).toBe(true);
  expect(isFreeTrialExpired('free_trial', startedAt, 7, now)).toBe(false);
  expect(isFreeTrialExpired('basic', startedAt, 4, now)).toBe(false);
  expect(isFreeTrialExpired('free_trial', null, 4, now)).toBe(false);
});

test('frontend and backend use the same free-trial configuration source', () => {
  const profileHook = read('src/hooks/useProfile.tsx');
  const authGuard = read('src/components/AuthGuard.tsx');
  const backendAuth = read('supabase/functions/_shared/auth.ts');

  expect(profileHook).toContain(".from('plan_parameters')");
  expect(profileHook).toContain(".select('trial_duration_days')");
  expect(profileHook).toContain('isFreeTrialExpired');
  expect(authGuard).toContain('trialDurationDays');
  expect(backendAuth).toContain(".select('trial_duration_days')");
});

test('free-trial activation cannot report success without updating the profile', () => {
  const migration = read('supabase/migrations/20260610020000_verify_free_trial_activation.sql');

  expect(migration).toContain('ALTER FUNCTION public.activate_free_trial_safe(uuid) OWNER TO postgres');
  expect(migration).toContain("status = 'approved'");
  expect(migration).toContain("user_plan = 'free_trial'");
  expect(migration).toContain("v_profile.status IS DISTINCT FROM 'approved'");
  expect(migration).toContain('RAISE EXCEPTION');
});

test('billing endpoints reject unverified callers before Stripe work', () => {
  for (const path of [
    'supabase/functions/create-checkout/index.ts',
    'supabase/functions/activate-free-trial/index.ts',
    'supabase/functions/check-subscription/index.ts',
    'supabase/functions/customer-portal/index.ts',
  ]) {
    const source = read(path);
    expect(source).toContain('await requireVerifiedUser(req)');
  }
});

test('paid access is granted only after a paid invoice webhook', () => {
  const webhook = read('supabase/functions/stripe-webhook/index.ts');
  const checkoutBranch = webhook.slice(
    webhook.indexOf('case "checkout.session.completed"'),
    webhook.indexOf('case "customer.subscription.updated"'),
  );
  const invoiceBranch = webhook.slice(
    webhook.indexOf('case "invoice.payment_succeeded"'),
    webhook.indexOf('case "invoice.payment_failed"'),
  );

  expect(checkoutBranch).not.toContain('provision_plan_credits');
  expect(checkoutBranch).toContain('awaiting paid invoice');
  expect(invoiceBranch).toContain('provision_plan_credits');
  expect(invoiceBranch).toContain("status: 'approved'");
});
