/**
 * Workspace limits service.
 *
 * The paid plan model has been removed from the active product, so the runtime
 * now operates with a single direct usage policy.
 */

export interface PlanLimits {
  chartsPerPeriod: number;
  savedChartsLimit: number | null; // null = unlimited
  priceMinor: number | null;
  currency: string;
}

const DEFAULT_LIMITS: PlanLimits = {
  chartsPerPeriod: 1,
  savedChartsLimit: 1,
  priceMinor: null,
  currency: 'BYN',
};

export async function getPlanLimits(planId: string): Promise<PlanLimits> {
  void planId;
  return DEFAULT_LIMITS;
}

/**
 * Compatibility no-op retained temporarily while the runtime is being simplified.
 */
export function invalidatePlanCache(planId?: string): void {
  void planId;
}
