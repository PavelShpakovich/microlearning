/**
 * Workspace usage policy.
 *
 * The active product does not use subscriptions. Runtime limits exist only as
 * a temporary operating policy until paid report purchases are introduced.
 */

export interface UsagePolicy {
  chartsPerPeriod: number;
  savedChartsLimit: number | null;
  priceMinor: number | null;
  currency: string;
}

const DEFAULT_USAGE_POLICY: UsagePolicy = {
  chartsPerPeriod: 1,
  savedChartsLimit: 1,
  priceMinor: null,
  currency: 'BYN',
};

export async function getUsagePolicy(): Promise<UsagePolicy> {
  return DEFAULT_USAGE_POLICY;
}

/**
 * Compatibility no-op retained temporarily while runtime policy stays static.
 */
export function invalidateUsagePolicyCache(): void {
  // no-op
}
