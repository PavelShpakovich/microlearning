import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPlanLimits } from '@/lib/plan-limits';

/**
 * Workspace access helpers retained temporarily while the plan/access layer
 * is being simplified around charts and readings.
 */

const db = supabaseAdmin as any;

export type PlanId = 'free';

export interface SubscriptionStatus {
  planId: PlanId;
  chartsLimit: number;
  chartsCreated: number;
  chartsRemaining: number;
  isPaid: boolean;
  canCreateCharts: boolean;
  usage: {
    chartsCreated: number;
    chartsLimit: number;
    chartsRemaining: number;
  };
  plan: {
    planId: PlanId;
    chartsPerPeriod: number;
    savedChartsLimit: number | null;
  };
}

/**
 * Get current workspace access status for a user.
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const now = new Date();
  const planId: PlanId = 'free';
  const limits = await getPlanLimits(planId);

  // Get current usage
  const { data: usage } = await db
    .from('usage_counters')
    .select('charts_created')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gte('period_end', now.toISOString())
    .maybeSingle();

  const chartsCreated = usage?.charts_created ?? 0;
  const chartsRemaining = Math.max(0, limits.chartsPerPeriod - chartsCreated);

  return {
    planId,
    chartsLimit: limits.chartsPerPeriod,
    chartsCreated,
    chartsRemaining,
    isPaid: false,
    canCreateCharts: chartsRemaining > 0,
    usage: {
      chartsCreated,
      chartsLimit: limits.chartsPerPeriod,
      chartsRemaining,
    },
    plan: {
      planId,
      chartsPerPeriod: limits.chartsPerPeriod,
      savedChartsLimit: limits.savedChartsLimit,
    },
  };
}

/**
 * Get the user's current workspace plan snapshot.
 */
export async function getUserPlan(userId: string): Promise<{
  planId: PlanId;
  chartsPerPeriod: number;
  savedChartsLimit: number | null;
}> {
  void userId;
  const planId: PlanId = 'free';
  const limits = await getPlanLimits(planId);

  return {
    planId,
    chartsPerPeriod: limits.chartsPerPeriod,
    savedChartsLimit: limits.savedChartsLimit,
  };
}

/**
 * Get user's current usage for this period
 */
export async function getUserUsage(
  userId: string,
): Promise<{ chartsCreated: number; chartsLimit: number; chartsRemaining: number }> {
  const planId = await getUserPlanId(userId);
  const limits = await getPlanLimits(planId);

  const now = new Date();
  const { data: usage } = await db
    .from('usage_counters')
    .select('charts_created')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gte('period_end', now.toISOString())
    .maybeSingle();

  const chartsCreated = usage?.charts_created ?? 0;
  return {
    chartsCreated,
    chartsLimit: limits.chartsPerPeriod,
    chartsRemaining: Math.max(0, limits.chartsPerPeriod - chartsCreated),
  };
}

/**
 * Get the user's effective plan identifier.
 */
async function getUserPlanId(userId: string): Promise<PlanId> {
  void userId;
  return 'free';
}

/**
 * Reset user's chart and reading usage for current period (admin operation)
 */
export async function resetUsage(userId: string): Promise<void> {
  await db.from('usage_counters').delete().eq('user_id', userId);
}

/**
 * Re-export plan-limit lookup for callers that still depend on this helper module.
 */
export { getPlanLimits } from '@/lib/plan-limits';

/**
 * Increment user's chart creation count
 */
export async function incrementChartCount(userId: string, count: number): Promise<void> {
  const now = new Date();

  // Try to update existing usage record
  const { data: existingUsage, error: fetchError } = await db
    .from('usage_counters')
    .select('id, charts_created')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gte('period_end', now.toISOString())
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existingUsage) {
    // Update existing record
    const newCount = (existingUsage.charts_created ?? 0) + count;
    const { error: updateError } = await db
      .from('usage_counters')
      .update({ charts_created: newCount })
      .eq('id', existingUsage.id);

    if (updateError) throw updateError;
  } else {
    // Create new usage record using the current calendar month.
    let periodStart: Date;
    let periodEnd: Date;

    periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error: insertError } = await db.from('usage_counters').insert({
      user_id: userId,
      charts_created: count,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    });

    if (insertError && insertError.code !== '23505') {
      // Ignore duplicate key
      throw insertError;
    }
  }
}
