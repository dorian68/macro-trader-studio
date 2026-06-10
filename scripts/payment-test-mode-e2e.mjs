import fs from 'node:fs';
import { chromium } from '@playwright/test';

if (process.env.PAYMENT_E2E_TEST_MODE !== '1') {
  throw new Error('Set PAYMENT_E2E_TEST_MODE=1 to run the destructive test-user flow');
}

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [
        line.slice(0, separator),
        line.slice(separator + 1).replace(/^"|"$/g, ''),
      ];
    }),
);

const siteUrl = 'https://alphalensai.com';
const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const password = `AlphaLens-E2E-${Date.now()}-9x`;
let accessToken = null;
let browser;
const flowFailures = [];

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Keep the raw response for diagnostics.
  }
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${url} failed (${response.status}): ${text.slice(0, 500)}`);
  }
  return body;
}

async function waitFor(description, callback, timeoutMs = 120_000, intervalMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await callback();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError}` : ''}`);
}

async function createTemporaryMailbox() {
  const domains = await jsonRequest('https://api.mail.tm/domains?page=1');
  const domain = domains['hydra:member']?.[0]?.domain;
  if (!domain) throw new Error('mail.tm returned no usable domain');

  const address = `alphalens-e2e-${Date.now()}@${domain}`;
  await jsonRequest('https://api.mail.tm/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  const token = await jsonRequest('https://api.mail.tm/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  return { address, token: token.token };
}

function extractConfirmationLink(message) {
  const html = Array.isArray(message.html) ? message.html.join('\n') : message.html || '';
  const content = `${html}\n${message.text || ''}`.replaceAll('&amp;', '&');
  return content.match(/https?:\/\/[^"'<> ]+\/auth\/v1\/verify\?[^"'<> ]+/)?.[0] ?? null;
}

async function readBrowserAccessToken(page) {
  return page.evaluate((ref) => {
    const raw = localStorage.getItem(`sb-${ref}-auth-token`);
    return raw ? JSON.parse(raw).access_token : null;
  }, projectRef);
}

async function fetchOwnRows(table, select) {
  return jsonRequest(`${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
}

async function invoke(functionName, body) {
  return jsonRequest(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });
}

async function fillIfPresent(page, selectors, value, required = false) {
  const deadline = Date.now() + (required ? 30_000 : 1_000);
  while (Date.now() < deadline) {
    for (const context of [page, ...page.frames()]) {
      for (const selector of selectors) {
        const field = context.locator(selector).first();
        if (await field.count() && await field.isVisible()) {
          await field.fill(value);
          return true;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (required) {
    const diagnostics = [];
    for (const frame of page.frames()) {
      diagnostics.push({
        url: frame.url(),
        inputs: await frame.locator('input').evaluateAll((inputs) => inputs.map((input) => ({
          id: input.id,
          name: input.getAttribute('name'),
          autocomplete: input.getAttribute('autocomplete'),
          placeholder: input.getAttribute('placeholder'),
        }))),
      });
    }
    console.error('Stripe field diagnostics:', JSON.stringify(diagnostics));
    throw new Error(`Required Stripe field not found: ${selectors.join(', ')}`);
  }
  return false;
}

async function completeStripeCheckout(page, checkoutUrl) {
  if (!checkoutUrl.includes('cs_test_')) {
    throw new Error(`Refusing non-test Stripe Checkout URL: ${checkoutUrl}`);
  }

  await page.goto(checkoutUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await fillIfPresent(
    page,
    ['#cardNumber', 'input[name="cardNumber"]', 'input[name="number"]', 'input[autocomplete="cc-number"]'],
    '4242424242424242',
    true,
  );
  await fillIfPresent(
    page,
    ['#cardExpiry', 'input[name="cardExpiry"]', 'input[name="expiry"]', 'input[autocomplete="cc-exp"]'],
    '1234',
    true,
  );
  await fillIfPresent(
    page,
    ['#cardCvc', 'input[name="cardCvc"]', 'input[name="cvc"]', 'input[autocomplete="cc-csc"]'],
    '123',
    true,
  );
  await fillIfPresent(
    page,
    ['#billingName', 'input[name="billingName"]', 'input[autocomplete="name"]'],
    'AlphaLens Payment E2E',
    true,
  );
  await fillIfPresent(page, ['#billingAddressLine1', 'input[name="billingAddressLine1"]', 'input[autocomplete="address-line1"]'], '1 Test Street');
  await fillIfPresent(page, ['#billingLocality', 'input[name="billingLocality"]', 'input[autocomplete="address-level2"]'], 'Amsterdam');
  await fillIfPresent(page, ['#billingPostalCode', 'input[name="billingPostalCode"]', 'input[autocomplete="postal-code"]'], '1012 JS');

  await page.locator('button[type="submit"]').last().click();
  try {
    await page.waitForURL(`${siteUrl}/payment-success**`, { timeout: 45_000 });
  } catch (error) {
    console.error('Stripe checkout did not redirect:', {
      url: page.url(),
      title: await page.title(),
      visibleText: (await page.locator('body').innerText()).slice(0, 3000),
    });
    await page.screenshot({ path: 'C:/tmp/alphalens-stripe-checkout-failure.png', fullPage: true });
    throw error;
  }
}

async function cleanup() {
  if (!accessToken) return;
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/delete-own-account`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmation: 'DELETE' }),
    });
    console.log(`${response.ok ? 'PASS' : 'FAIL'} cleanup test account: ${response.status}`);
  } catch (error) {
    console.error('FAIL cleanup test account:', error);
  }
}

try {
  const mailbox = await createTemporaryMailbox();
  console.log(`Created temporary mailbox: ${mailbox.address}`);

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${siteUrl}/auth?intent=free_trial&tab=signup`, { waitUntil: 'domcontentloaded' });
  await page.locator('#signup-fullname').fill('AlphaLens Payment E2E');
  await page.locator('#signup-email').fill(mailbox.address);
  await page.locator('#signup-password').fill(password);
  await page.locator('#signup-confirm-password').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.getByText('Account created successfully!', { exact: true }).waitFor({ timeout: 30_000 });
  console.log('PASS signup submitted');

  const confirmationLink = await waitFor('signup confirmation email', async () => {
    const messages = await jsonRequest('https://api.mail.tm/messages?page=1', {
      headers: { Authorization: `Bearer ${mailbox.token}` },
    });
    for (const summary of messages['hydra:member'] || []) {
      const message = await jsonRequest(`https://api.mail.tm/messages/${summary.id}`, {
        headers: { Authorization: `Bearer ${mailbox.token}` },
      });
      const link = extractConfirmationLink(message);
      if (link) return link;
    }
    return null;
  });

  await page.goto(confirmationLink, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForURL(`${siteUrl}/confirm-success**`, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Go to Login' }).click();
  await page.waitForURL(/\/(payment-success|dashboard)/, { timeout: 60_000 });
  accessToken = await waitFor('browser auth token', () => readBrowserAccessToken(page), 30_000, 500);

  let freeProfile;
  try {
    freeProfile = await waitFor('approved free-trial profile', async () => {
      const rows = await fetchOwnRows('profiles', 'status,user_plan,trial_started_at,trial_used');
      const profile = rows[0];
      return profile?.status === 'approved' && profile?.user_plan === 'free_trial' ? profile : null;
    }, 20_000);
  } catch {
    const currentProfile = (await fetchOwnRows('profiles', 'status,user_plan,trial_started_at,trial_used'))[0];
    const failure = `automatic free-trial onboarding failed: ${JSON.stringify(currentProfile)}`;
    flowFailures.push(failure);
    console.error(`FAIL ${failure}`);

    const activation = await invoke('activate-free-trial');
    console.log('PASS direct free-trial activation fallback:', activation);
    try {
      freeProfile = await waitFor('approved free-trial profile after direct activation', async () => {
        const rows = await fetchOwnRows('profiles', 'status,user_plan,trial_started_at,trial_used');
        const profile = rows[0];
        return profile?.status === 'approved' && profile?.user_plan === 'free_trial' ? profile : null;
      }, 10_000);
    } catch {
      freeProfile = (await fetchOwnRows('profiles', 'status,user_plan,trial_started_at,trial_used'))[0];
      const activationFailure = `free-trial API reported success without activating profile: ${JSON.stringify(freeProfile)}`;
      flowFailures.push(activationFailure);
      console.error(`FAIL ${activationFailure}`);
    }
  }
  const freeCredits = (await fetchOwnRows(
    'user_credits',
    'plan_type,credits_queries_remaining,credits_ideas_remaining,credits_reports_remaining',
  ))[0];
  if (!freeCredits || freeCredits.plan_type !== 'free_trial') {
    const creditsFailure = `free-trial credits were not provisioned: ${JSON.stringify(freeCredits)}`;
    flowFailures.push(creditsFailure);
    console.error(`FAIL ${creditsFailure}`);
  } else {
    console.log('PASS free-trial credits:', freeCredits);
  }
  console.log('Free-trial profile after onboarding:', freeProfile);

  const checkout = await invoke('create-checkout', {
    plan: 'basic',
    success_url: `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/payment-canceled`,
  });
  await completeStripeCheckout(page, checkout.url);
  console.log('PASS Stripe test checkout completed');

  const paidProfile = await waitFor('paid profile provisioning', async () => {
    const rows = await fetchOwnRows('profiles', 'status,user_plan');
    const profile = rows[0];
    return profile?.status === 'approved' && profile?.user_plan === 'basic' ? profile : null;
  });
  const paidCredits = (await fetchOwnRows(
    'user_credits',
    'plan_type,credits_queries_remaining,credits_ideas_remaining,credits_reports_remaining',
  ))[0];
  if (!paidCredits || paidCredits.plan_type !== 'basic') {
    throw new Error(`Paid credits were not provisioned: ${JSON.stringify(paidCredits)}`);
  }
  console.log('PASS paid plan provisioning:', { profile: paidProfile, credits: paidCredits });

  const subscription = await invoke('check-subscription');
  if (!subscription.subscribed || subscription.plan_type !== 'basic') {
    throw new Error(`Subscription check failed: ${JSON.stringify(subscription)}`);
  }
  console.log('PASS subscription status:', subscription);

  const portal = await invoke('customer-portal');
  if (!portal.url?.startsWith('https://billing.stripe.com/')) {
    throw new Error(`Customer portal URL missing: ${JSON.stringify(portal)}`);
  }
  console.log('PASS customer portal created');
} finally {
  await cleanup();
  await browser?.close();
  if (flowFailures.length) {
    console.error('Payment E2E completed with flow failures:', flowFailures);
    process.exitCode = 1;
  }
}
