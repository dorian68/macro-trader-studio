import { expect, test } from '@playwright/test';
import {
  AUTH_STORAGE_KEYS,
  beginOAuthAttempt,
  clearOAuthAttempt,
  hasOAuthCallbackParams,
  hasFreshOAuthAttempt,
  isLikelyNewOAuthUser,
  processPendingAuthIntent,
} from '../src/lib/auth-flow';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test('persists and clears a Google signup attempt with its commercial intent', () => {
  const storage = createStorage();

  beginOAuthAttempt(storage, 'signup', { selectedPlan: 'premium', freeTrial: true }, 1_000);

  expect(hasFreshOAuthAttempt(storage, 2_000)).toBe(true);
  expect(storage.getItem(AUTH_STORAGE_KEYS.pendingPlan)).toBeNull();
  expect(storage.getItem(AUTH_STORAGE_KEYS.pendingFreeTrial)).toBe('true');

  clearOAuthAttempt(storage);
  expect(hasFreshOAuthAttempt(storage, 2_000)).toBe(false);
  expect(storage.getItem(AUTH_STORAGE_KEYS.pendingFreeTrial)).toBe('true');
});

test('keeps plan and free-trial intents mutually exclusive', () => {
  const storage = createStorage();

  beginOAuthAttempt(storage, 'signup', { freeTrial: true });
  beginOAuthAttempt(storage, 'signup', { selectedPlan: 'premium' });

  expect(storage.getItem(AUTH_STORAGE_KEYS.pendingPlan)).toBe('premium');
  expect(storage.getItem(AUTH_STORAGE_KEYS.pendingFreeTrial)).toBeNull();
});

test('distinguishes a fresh signup from a returning Google user', () => {
  const now = Date.parse('2026-06-10T10:00:00Z');
  const fresh = {
    created_at: '2026-06-10T09:59:30Z',
    last_sign_in_at: '2026-06-10T09:59:35Z',
  };
  const returning = {
    created_at: '2025-06-10T09:59:30Z',
    last_sign_in_at: '2026-06-10T09:59:35Z',
  };

  expect(isLikelyNewOAuthUser(fresh, 'signup', now)).toBe(true);
  expect(isLikelyNewOAuthUser(fresh, 'signin', now)).toBe(true);
  expect(isLikelyNewOAuthUser(fresh, null, now)).toBe(false);
  expect(isLikelyNewOAuthUser(returning, 'signup', now)).toBe(false);
});

test('recognizes successful OAuth callback params without treating provider errors as success', () => {
  expect(hasOAuthCallbackParams({ search: '?code=oauth-code', hash: '' })).toBe(true);
  expect(hasOAuthCallbackParams({ search: '', hash: '#access_token=token' })).toBe(true);
  expect(hasOAuthCallbackParams({ search: '?error=access_denied', hash: '' })).toBe(false);
});

test('keeps a pending plan when checkout creation fails', async () => {
  const storage = createStorage();
  storage.setItem(AUTH_STORAGE_KEYS.pendingPlan, 'basic');

  const result = await processPendingAuthIntent({
    storage,
    createCheckout: async () => ({ error: new Error('Stripe unavailable') }),
    activateFreeTrial: async () => ({ error: undefined }),
  });

  expect(result.kind).toBe('error');
  expect(storage.getItem(AUTH_STORAGE_KEYS.pendingPlan)).toBe('basic');
});

test('consumes a pending intent only after successful processing', async () => {
  const checkoutStorage = createStorage();
  checkoutStorage.setItem(AUTH_STORAGE_KEYS.pendingPlan, 'standard');

  const checkout = await processPendingAuthIntent({
    storage: checkoutStorage,
    createCheckout: async () => ({ data: { url: 'https://checkout.example/session' } }),
    activateFreeTrial: async () => ({ error: undefined }),
  });

  expect(checkout).toEqual({ kind: 'checkout', url: 'https://checkout.example/session' });
  expect(checkoutStorage.getItem(AUTH_STORAGE_KEYS.pendingPlan)).toBeNull();

  const trialStorage = createStorage();
  trialStorage.setItem(AUTH_STORAGE_KEYS.pendingFreeTrial, 'true');

  const trial = await processPendingAuthIntent({
    storage: trialStorage,
    createCheckout: async () => ({ data: null }),
    activateFreeTrial: async () => ({ error: undefined }),
  });

  expect(trial.kind).toBe('free_trial');
  expect(trialStorage.getItem(AUTH_STORAGE_KEYS.pendingFreeTrial)).toBeNull();
});
