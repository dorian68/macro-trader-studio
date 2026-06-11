export type OAuthFlow = 'signin' | 'signup';

interface SignupUser {
  identities?: unknown[] | null;
}

export const AUTH_STORAGE_KEYS = {
  oauthFlow: 'oauth_flow',
  oauthStartedAt: 'oauth_started_at',
  pendingPlan: 'alphalens_pending_plan',
  pendingFreeTrial: 'alphalens_pending_free_trial',
} as const;

const OAUTH_MAX_AGE_MS = 5 * 60 * 1000;
const NEW_USER_MAX_AGE_MS = 10 * 60 * 1000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface OAuthUserTimestamps {
  created_at?: string;
  last_sign_in_at?: string;
}

interface PendingIntentDependencies {
  storage: StorageLike;
  createCheckout: (plan: string) => Promise<{ data?: { url?: string } | null; error?: unknown }>;
  activateFreeTrial: () => Promise<{ error?: unknown }>;
}

export function isExistingSignupResponse(user: SignupUser | null | undefined) {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

export type PendingIntentResult =
  | { kind: 'checkout'; url: string }
  | { kind: 'free_trial' }
  | { kind: 'none' }
  | { kind: 'error'; error: unknown };

export function beginOAuthAttempt(
  storage: StorageLike,
  flow: OAuthFlow,
  options: { selectedPlan?: string | null; freeTrial?: boolean } = {},
  now = Date.now(),
) {
  storage.setItem(AUTH_STORAGE_KEYS.oauthFlow, flow);
  storage.setItem(AUTH_STORAGE_KEYS.oauthStartedAt, String(now));

  if (options.selectedPlan) {
    storage.removeItem(AUTH_STORAGE_KEYS.pendingFreeTrial);
    storage.setItem(AUTH_STORAGE_KEYS.pendingPlan, options.selectedPlan);
  }

  if (options.freeTrial) {
    storage.removeItem(AUTH_STORAGE_KEYS.pendingPlan);
    storage.setItem(AUTH_STORAGE_KEYS.pendingFreeTrial, 'true');
  }
}

export function clearOAuthAttempt(storage: StorageLike) {
  storage.removeItem(AUTH_STORAGE_KEYS.oauthFlow);
  storage.removeItem(AUTH_STORAGE_KEYS.oauthStartedAt);
}

export function getOAuthFlow(storage: StorageLike): OAuthFlow | null {
  const flow = storage.getItem(AUTH_STORAGE_KEYS.oauthFlow);
  return flow === 'signin' || flow === 'signup' ? flow : null;
}

export function hasFreshOAuthAttempt(storage: StorageLike, now = Date.now()) {
  const flow = getOAuthFlow(storage);
  const startedAt = Number(storage.getItem(AUTH_STORAGE_KEYS.oauthStartedAt));
  return !!flow && Number.isFinite(startedAt) && now - startedAt < OAUTH_MAX_AGE_MS;
}

export function hasOAuthCallbackParams(location: Pick<Location, 'search' | 'hash'>) {
  const params = new URLSearchParams(location.search);
  return params.has('code') || location.hash.includes('access_token');
}

export function isLikelyNewOAuthUser(
  user: OAuthUserTimestamps,
  flow: OAuthFlow | null,
  now = Date.now(),
) {
  if (!flow || !user.created_at) return false;

  const createdAt = Date.parse(user.created_at);
  if (!Number.isFinite(createdAt) || now - createdAt > NEW_USER_MAX_AGE_MS) return false;

  if (!user.last_sign_in_at) return true;
  const lastSignInAt = Date.parse(user.last_sign_in_at);
  return Number.isFinite(lastSignInAt) && Math.abs(lastSignInAt - createdAt) < NEW_USER_MAX_AGE_MS;
}

export async function processPendingAuthIntent({
  storage,
  createCheckout,
  activateFreeTrial,
}: PendingIntentDependencies): Promise<PendingIntentResult> {
  const pendingPlan = storage.getItem(AUTH_STORAGE_KEYS.pendingPlan);
  if (pendingPlan) {
    try {
      const { data, error } = await createCheckout(pendingPlan);
      if (error || !data?.url) {
        return { kind: 'error', error: error || new Error('No checkout URL received') };
      }

      storage.removeItem(AUTH_STORAGE_KEYS.pendingPlan);
      return { kind: 'checkout', url: data.url };
    } catch (error) {
      return { kind: 'error', error };
    }
  }

  if (storage.getItem(AUTH_STORAGE_KEYS.pendingFreeTrial)) {
    try {
      const { error } = await activateFreeTrial();
      if (error) return { kind: 'error', error };

      storage.removeItem(AUTH_STORAGE_KEYS.pendingFreeTrial);
      return { kind: 'free_trial' };
    } catch (error) {
      return { kind: 'error', error };
    }
  }

  return { kind: 'none' };
}
