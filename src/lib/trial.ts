const DEFAULT_TRIAL_DURATION_DAYS = 7;

export function isFreeTrialExpired(
  userPlan: string | null | undefined,
  trialStartedAt: string | null | undefined,
  trialDurationDays: number | null | undefined,
  now = Date.now(),
) {
  if (userPlan !== 'free_trial' || !trialStartedAt) return false;

  const startedAt = Date.parse(trialStartedAt);
  const durationDays = Number.isFinite(trialDurationDays)
    ? Number(trialDurationDays)
    : DEFAULT_TRIAL_DURATION_DAYS;

  if (!Number.isFinite(startedAt) || durationDays < 0) return true;
  return startedAt + durationDays * 24 * 60 * 60 * 1000 <= now;
}
