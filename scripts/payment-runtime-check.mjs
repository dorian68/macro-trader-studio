import fs from 'node:fs';

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

const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or public Supabase key in .env');
}

const publicHeaders = { apikey: anonKey, 'Content-Type': 'application/json' };
const checks = [
  {
    name: 'pricing page',
    url: 'https://alphalensai.com/pricing',
    expectedStatus: 200,
  },
  {
    name: 'checkout rejects anonymous callers',
    url: `${supabaseUrl}/functions/v1/create-checkout`,
    options: {
      method: 'POST',
      headers: publicHeaders,
      body: JSON.stringify({ plan: '__auth_probe__' }),
    },
    expectedStatus: 401,
  },
  {
    name: 'free trial rejects anonymous callers',
    url: `${supabaseUrl}/functions/v1/activate-free-trial`,
    options: { method: 'POST', headers: publicHeaders, body: '{}' },
    expectedStatus: 401,
  },
  {
    name: 'subscription check rejects anonymous callers',
    url: `${supabaseUrl}/functions/v1/check-subscription`,
    options: { method: 'POST', headers: publicHeaders, body: '{}' },
    expectedStatus: 401,
  },
  {
    name: 'customer portal rejects anonymous callers',
    url: `${supabaseUrl}/functions/v1/customer-portal`,
    options: { method: 'POST', headers: publicHeaders, body: '{}' },
    expectedStatus: 401,
  },
  {
    name: 'webhook rejects unsigned payloads',
    url: `${supabaseUrl}/functions/v1/stripe-webhook`,
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
    expectedStatus: 400,
  },
];

let failed = false;
for (const check of checks) {
  const response = await fetch(check.url, check.options);
  const passed = response.status === check.expectedStatus;
  failed ||= !passed;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${check.name}: ${response.status} (expected ${check.expectedStatus})`);
}

process.exitCode = failed ? 1 : 0;
