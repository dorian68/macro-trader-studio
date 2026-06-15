import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('privileged credit RPCs and role management are locked down', () => {
  const migration = read('supabase/migrations/20260610000000_security_harden_auth_and_credits.sql');

  expect(migration).toContain('DROP POLICY IF EXISTS "Admins can manage roles"');
  expect(migration).toContain('CREATE POLICY "Super users can manage roles"');
  expect(migration).toContain('user_in_current_broker');
  expect(migration).toContain('CREATE POLICY "Admins can view profiles in their broker"');
  expect(migration).toContain('CREATE POLICY "Admins can view credits in their broker"');
  expect(migration).toContain('CREATE POLICY "Admins can view jobs in their broker"');
  expect(migration).toContain('protect_profile_broker_assignment');
  expect(migration).toContain("VALUES (NEW.id, NULL, NULL, 'pending')");
  expect(migration).toContain('DROP POLICY IF EXISTS "Admins and super users can view all jobs"');
  expect(migration).toContain('auth.uid() <> target_user_id');
  expect(migration).toContain('auth.uid() <> p_user_id');
  expect(migration).toContain('Invalid job ownership');
  expect(migration).toContain('Credit type does not match job feature');
  expect(migration).toContain('discard_pending_job');
  expect(migration).toContain('REVOKE ALL ON FUNCTION public.provision_plan_credits');
  expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.provision_plan_credits');
  expect(migration).toContain('TO service_role');
  expect(migration).toContain('v_balance - v_engaged_count <= 0');
  expect(migration).toContain('revoke_product_access_service');
  expect(migration).toContain('renew_due_credits_service');
  expect(migration).toContain("status = 'approved'");
});

test('Stripe checkout and webhook fail closed', () => {
  const checkout = read('supabase/functions/create-checkout/index.ts');
  const webhook = read('supabase/functions/stripe-webhook/index.ts');

  expect(checkout).not.toContain('proceeding with guest checkout');
  expect(checkout).toContain('user_id: user.id');
  expect(checkout).toContain('await requireVerifiedUser(req)');
  expect(webhook).toContain('Webhook secret not configured');
  expect(webhook).toContain('Missing Stripe signature');
  expect(webhook).not.toContain('parsed without signature verification');
  expect(webhook).not.toContain("return 'premium'");
  expect(webhook).toContain("status: 'failed'");
  expect(webhook).toContain("status: 'completed'");
  expect(webhook).toContain('revoke_product_access_service');
  expect(webhook).not.toContain("p_source: 'stripe_webhook_subscription_updated'");
  expect(webhook).toContain('metadataUserId ? metadataUser : await findUserByEmail');
  expect(webhook).toContain('subscription canceled');
  const checkoutBranch = webhook.slice(
    webhook.indexOf('case "checkout.session.completed"'),
    webhook.indexOf('case "customer.subscription.updated"'),
  );
  expect(checkoutBranch).not.toContain('provision_plan_credits');
  expect(checkoutBranch).not.toContain("status: 'approved'");
  expect(checkoutBranch).toContain('awaiting paid invoice');
  expect(webhook).toContain('await ensureProfile(user.id)');
  expect(webhook).toContain(".select('user_id')");
});

test('paid compute endpoints enforce product access and credits', () => {
  const chargedEndpoints = [
    'supabase/functions/forecast-proxy/index.ts',
    'supabase/functions/surface-proxy/index.ts',
    'supabase/functions/aura/index.ts',
    'supabase/functions/portfolio-copilot/index.ts',
  ];

  for (const endpoint of chargedEndpoints) {
    const source = read(endpoint);
    expect(source).toContain('requireProductAccess');
    expect(source).toContain('consumeProductCredit');
  }

  const macroLab = read('supabase/functions/macro-lab-proxy/index.ts');
  expect(macroLab).toContain('requireProductAccess');
  expect(macroLab).toContain('credits_engaged');
  expect(macroLab).toContain('No valid credit engagement found for this job');
  expect(macroLab).toContain(".eq('feature', requiredFeature)");
  expect(macroLab).toContain(".eq('status', 'pending')");
});

test('super users bypass commercial product gates without bypassing authentication', () => {
  const auth = read('supabase/functions/_shared/auth.ts');
  const guard = read('src/components/AuthGuard.tsx');
  const creditManager = read('src/hooks/useCreditManager.tsx');
  const migration = read('supabase/migrations/20260615170000_super_user_product_access_bypass.sql');

  expect(auth).toContain(".eq('role', 'super_user')");
  expect(auth).toContain('if (!profile || profile.is_deleted)');
  expect(auth).toContain('if (superUserRole) return caller');
  expect(auth).toContain('super-user-bypass:');
  expect(guard).toContain('if (!isSuperUser && isTrialExpired)');
  expect(guard).toContain('if (!isSuperUser && requireApproval && profile)');
  expect(creditManager).toContain('if (isSuperUser) return true');
  expect(migration).toContain("public.has_role(p_user_id, 'super_user')");
  expect(migration).toContain("public.has_role(NEW.user_id, 'super_user')");
  expect(migration).toContain("'Super user credit bypass'");
  expect(migration).toContain('Unauthorized credit operation');
  expect(migration).toContain('Invalid job ownership');
});

test('super users are isolated from commercial lifecycle and lower-role mutations', () => {
  const migration = read('supabase/migrations/20260615190000_super_user_commercial_and_governance_isolation.sql');
  const checkout = read('supabase/functions/create-checkout/index.ts');
  const webhook = read('supabase/functions/stripe-webhook/index.ts');
  const selfDelete = read('supabase/functions/delete-own-account/index.ts');
  const adminDelete = read('supabase/functions/delete-user/index.ts');
  const activateTrial = read('supabase/functions/activate-free-trial/index.ts');

  expect(migration).toContain("NOT public.has_role(user_id, 'super_user')");
  expect(migration).toContain('Admins cannot modify super user profiles');
  expect(migration).toContain('Cannot deactivate the last active super user');
  expect(migration).toContain('Cannot remove the last active super user role');
  expect(migration).toContain("jsonb_build_object('success', true, 'skipped', true, 'reason', 'super_user')");
  expect(migration).toContain("NOT public.has_role(uc.user_id, 'super_user')");
  expect(checkout).toContain('super_user_commercial_bypass');
  expect(webhook).toContain("provisionResult?.reason === 'super_user'");
  expect(selfDelete).toContain('Super user accounts must be deleted by another super user');
  expect(adminDelete).toContain('Cannot delete the last active super user');
  expect(activateTrial).not.toContain("paidPlans.includes(profileData.user_plan)");
});

test('sensitive utility functions authenticate and scope their callers', () => {
  expect(read('supabase/functions/import-abcg-portfolio/index.ts')).toContain(
    "requireRole(req, ['admin', 'super_user'])",
  );
  expect(read('supabase/functions/reconcile-payments/index.ts')).toContain(
    "requireRole(req, ['super_user'])",
  );
  expect(read('supabase/functions/send-report-email/index.ts')).toContain(
    'Reports can only be sent to your verified account email',
  );
  expect(read('supabase/functions/send-report-email/index.ts')).toContain(
    "consumeProductCredit(user.id, 'reports'",
  );
  expect(read('supabase/functions/send-report-email/index.ts')).toContain('sanitizeHtml(htmlContent');
  expect(read('supabase/functions/send-report-email/index.ts')).toContain('refundProductCredit');
  expect(read('src/components/MacroCommentary.tsx')).toContain("functions.invoke('send-report-email'");
  expect(read('src/components/MacroCommentary.tsx')).not.toContain("functions.invoke('generate-macro-report'");
  expect(read('supabase/functions/send-admin-notification/index.ts')).toContain(
    "requireRole(req, ['admin', 'super_user'])",
  );
});

test('signup and payment UI no longer expose broker or guest-signup steps', () => {
  const auth = read('src/pages/Auth.tsx');
  const paymentSuccess = read('src/pages/PaymentSuccess.tsx');

  expect(auth).not.toContain('BrokerSelection');
  expect(auth).not.toContain('selectBroker');
  expect(paymentSuccess).not.toContain('GuestSignupForm');
  expect(paymentSuccess).not.toContain('Select Your Broker');
  for (const locale of ['en', 'es', 'fa']) {
    expect(read(`src/locales/${locale}/auth.json`)).not.toContain('selectBroker');
  }
});

test('internal jobs and public contact relay are hardened', () => {
  expect(read('supabase/functions/renew-credits/index.ts')).toContain('Service authorization required');
  expect(read('supabase/functions/cleanup-stale-credits/index.ts')).toContain('Service authorization required');
  const maintenanceMigration = read('supabase/migrations/20260615200000_harden_session_and_maintenance_rpcs.sql');
  expect(maintenanceMigration).toContain("auth.uid() <> current_user_id");
  expect(maintenanceMigration).toContain(
    'REVOKE ALL ON FUNCTION public.cleanup_stale_engaged_credits() FROM PUBLIC, anon, authenticated',
  );
  expect(maintenanceMigration).toContain(
    'REVOKE ALL ON FUNCTION public.invalidate_previous_sessions(uuid, text) FROM PUBLIC, anon',
  );
  const contact = read('supabase/functions/send-contact-email/index.ts');
  expect(contact).toContain('check_contact_rate_limit_service');
  expect(contact).toContain('Too many contact requests');
  expect(contact).toContain('escapeHtml');
  expect(read('supabase/functions/refresh-news-feed/index.ts')).toContain('requireProductAccess');
  const collective = read('supabase/functions/collective-insights/index.ts');
  expect(collective).toContain('Math.min(Math.max(Number(requestedLimit)');
  expect(collective).not.toContain('full_content:');
});

test('account deletion cannot leave billable Stripe subscriptions behind', () => {
  const helper = read('supabase/functions/_shared/stripe-subscriptions.ts');
  const selfDelete = read('supabase/functions/delete-own-account/index.ts');
  const adminDelete = read('supabase/functions/delete-user/index.ts');
  const webhook = read('supabase/functions/stripe-webhook/index.ts');

  expect(helper).toContain("metadata['user_id']");
  expect(helper).toContain('status: "all"');
  expect(helper).toContain('await stripe.subscriptions.cancel');
  expect(selfDelete).toContain('await cancelUserSubscriptions');
  expect(selfDelete).toContain('supabase.auth.admin.deleteUser(userId)');
  expect(selfDelete).not.toContain('Stripe cleanup failed (non-blocking)');
  expect(selfDelete).not.toContain("['basic', 'standard', 'premium'].includes(profile.user_plan)");
  expect(adminDelete).toContain('await cancelUserSubscriptions');
  expect(adminDelete).toContain('supabase.auth.admin.deleteUser(userId)');
  expect(adminDelete).not.toContain("['basic', 'standard', 'premium'].includes(existingProfile.user_plan)");
  expect(webhook).toContain('Subscription belongs to an already deleted account');
  expect(webhook).toContain('canceling subscription for deleted account');
});

test('state-changing account endpoints accept POST only', () => {
  for (const endpoint of [
    'supabase/functions/activate-free-trial/index.ts',
    'supabase/functions/delete-own-account/index.ts',
    'supabase/functions/delete-user/index.ts',
  ]) {
    expect(read(endpoint)).toContain("req.method !== 'POST'");
  }
});

test('generated report HTML is sanitized before browser rendering', () => {
  const reports = read('src/pages/Reports.tsx');
  const history = read('src/components/AIInteractionHistory.tsx');
  const blog = read('src/pages/BlogPost.tsx');
  const sanitizer = read('src/lib/sanitize-report-html.ts');

  expect(reports).toContain('sanitizeReportHtml');
  expect(history).toContain('sanitizeRichHtml(response)');
  expect(blog).toContain('sanitizeRichHtml(rendered)');
  expect(reports).toContain('dangerouslySetInnerHTML');
  expect(sanitizer).toContain('DOMPurify.sanitize');
  expect(sanitizer).toContain("'script'");
});

test('third-party workflow and market-data calls stay server-side', () => {
  const workflowProxy = read('supabase/functions/workflow-proxy/index.ts');
  const currentPrice = read('supabase/functions/fetch-current-price/index.ts');
  const safeRequest = read('src/lib/safe-request.ts');
  const marketData = read('src/services/marketDataService.ts');
  const technicalDashboard = read('src/components/TechnicalDashboard.tsx');

  expect(workflowProxy).toContain('requireProductAccess');
  expect(workflowProxy).toContain('credits_engaged');
  expect(workflowProxy).toContain('isUuid');
  expect(workflowProxy).toContain(".eq('status', 'pending')");
  expect(workflowProxy).toContain('user_id: user.id');
  expect(safeRequest).toContain("supabase.functions.invoke('workflow-proxy'");
  expect(currentPrice).toContain("Deno.env.get('TWELVE_DATA_API_KEY')");
  expect(marketData).toContain("supabase.functions.invoke('fetch-current-price'");
  expect(technicalDashboard).toContain("'fetch-technical-indicators'");
  expect(marketData).not.toContain('apikey=');
  expect(technicalDashboard).not.toContain('apikey=');
});

test('paid provider failures refund directly consumed credits', () => {
  for (const endpoint of [
    'supabase/functions/aura/index.ts',
    'supabase/functions/forecast-proxy/index.ts',
    'supabase/functions/portfolio-copilot/index.ts',
    'supabase/functions/send-report-email/index.ts',
    'supabase/functions/surface-proxy/index.ts',
    'supabase/functions/workflow-proxy/index.ts',
  ]) {
    expect(read(endpoint)).toContain('refundProductCredit');
  }
  expect(read('supabase/functions/_shared/upstream.ts')).toContain("url.protocol !== 'https:'");
});

test('admin utilities fail closed and do not simulate Stripe changes', () => {
  const stripeMode = read('supabase/functions/update-stripe-mode/index.ts');
  const getStripeMode = read('supabase/functions/get-stripe-mode/index.ts');
  const fetchUsers = read('supabase/functions/fetch-users-with-emails/index.ts');
  const admin = read('src/pages/Admin.tsx');

  expect(stripeMode).toContain("requireRole(req, ['super_user'])");
  expect(stripeMode).toContain('status: 501');
  expect(stripeMode).not.toContain('success: true');
  expect(getStripeMode).toContain("requireRole(req, ['super_user'])");
  expect(fetchUsers).toContain("profilesQuery.eq('user_id', user.id)");
  expect(admin).toContain('Managed via deployment secrets');
  expect(read('src/App.tsx')).toContain('<SuperUserGuard fallback={<Navigate to="/dashboard" replace />}>');
});

test('only server-side proxies can publish job results', () => {
  const migration = read('supabase/migrations/20260610000000_security_harden_auth_and_credits.sql');
  const workflowProxy = read('supabase/functions/workflow-proxy/index.ts');
  const macroProxy = read('supabase/functions/macro-lab-proxy/index.ts');
  const aura = read('src/components/AURA.tsx');

  expect(migration).toContain('DROP POLICY IF EXISTS "Users can update their own jobs"');
  expect(workflowProxy).toContain("status: 'completed', response_payload: responsePayload");
  expect(macroProxy).toContain("status: 'completed', response_payload: responsePayload");
  expect(aura).not.toContain("supabase.from('jobs').update");
  expect(read('src/components/RealtimeDiagnostic.tsx')).not.toContain(".from('jobs')\n          .update");
  expect(read('src/lib/job-security.ts')).toContain("supabase.rpc('discard_pending_job'");
});
