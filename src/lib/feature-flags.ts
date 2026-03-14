/**
 * Feature flags — code-based toggles for enabling/disabling features.
 *
 * Single flag: NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS
 * When true: billing UI, plan pricing, and Webpay checkout are all visible and active.
 * Set it to "true" (or "1") once Webpay integration is live and legalised.
 */
function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

export const FLAGS = {
  subscriptionsEnabled: parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS, false),
} as const;

export function areSubscriptionsEnabled(): boolean {
  return FLAGS.subscriptionsEnabled;
}

/** Delegated to areSubscriptionsEnabled — Webpay is the only billing provider. */
export function isWebpayEnabled(): boolean {
  return areSubscriptionsEnabled();
}

/** Delegated to areSubscriptionsEnabled — pricing/plan info is shown iff billing is active. */
export function isPaidInformationVisible(): boolean {
  return areSubscriptionsEnabled();
}

export function getEffectivePlanId<TPlanId extends string>(
  planId: TPlanId,
  fallback: TPlanId,
): TPlanId {
  return areSubscriptionsEnabled() ? planId : fallback;
}
