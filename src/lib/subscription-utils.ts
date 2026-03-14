import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPlanLimits } from '@/lib/plan-limits';
import { areSubscriptionsEnabled, getEffectivePlanId } from '@/lib/feature-flags';

/**
 * Utilities for subscription operations (replaces deleted SubscriptionService)
 */

export type PlanId = 'free' | 'basic' | 'pro' | 'max';

export interface SubscriptionStatus {
  planId: PlanId;
  cardsLimit: number;
  cardsGenerated: number;
  cardsRemaining: number;
  isPaid: boolean;
  canGenerate: boolean;
  usage: {
    cardsGenerated: number;
    cardsLimit: number;
    cardsRemaining: number;
  };
  plan: {
    planId: PlanId;
    cardsPerMonth: number;
    themesLimit: number | null;
    maxThemes: number | null;
    communityThemes: boolean;
  };
}

/**
 * Get subscription status for a user (admin operation)
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('plan_id, status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  const now = new Date();
  const isExpired =
    !subscription ||
    subscription.status !== 'active' ||
    (subscription.current_period_end != null && new Date(subscription.current_period_end) < now);

  const rawPlanId = (isExpired ? 'free' : (subscription?.plan_id ?? 'free')) as PlanId;
  const planId = getEffectivePlanId(rawPlanId, 'free');
  const limits = await getPlanLimits(planId);

  // Get current usage
  const { data: usage } = await supabaseAdmin
    .from('user_usage')
    .select('cards_generated')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gte('period_end', now.toISOString())
    .maybeSingle();

  const cardsGenerated = usage?.cards_generated ?? 0;
  const cardsRemaining = Math.max(0, limits.cardsPerMonth - cardsGenerated);

  return {
    planId,
    cardsLimit: limits.cardsPerMonth,
    cardsGenerated,
    cardsRemaining,
    isPaid: areSubscriptionsEnabled() && !isExpired && planId !== 'free',
    canGenerate: cardsRemaining > 0,
    usage: {
      cardsGenerated,
      cardsLimit: limits.cardsPerMonth,
      cardsRemaining,
    },
    plan: {
      planId,
      cardsPerMonth: limits.cardsPerMonth,
      themesLimit: limits.maxThemes,
      maxThemes: limits.maxThemes,
      communityThemes: limits.communityThemes,
    },
  };
}

/**
 * Get user's plan with all details
 */
export async function getUserPlan(userId: string): Promise<{
  planId: PlanId;
  cardsPerMonth: number;
  maxThemes: number | null;
  communityThemes: boolean;
}> {
  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('plan_id, status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  const isExpired =
    !subscription ||
    subscription.status !== 'active' ||
    (subscription.current_period_end != null &&
      new Date(subscription.current_period_end) < new Date());

  const rawPlanId = (isExpired ? 'free' : (subscription?.plan_id ?? 'free')) as PlanId;
  const planId = getEffectivePlanId(rawPlanId, 'free');
  const limits = await getPlanLimits(planId);

  return {
    planId,
    cardsPerMonth: limits.cardsPerMonth,
    maxThemes: limits.maxThemes,
    communityThemes: limits.communityThemes,
  };
}

/**
 * Get user's current usage for this period
 */
export async function getUserUsage(
  userId: string,
): Promise<{ cardsGenerated: number; cardsLimit: number; cardsRemaining: number }> {
  const planId = await getUserPlanId(userId);
  const limits = await getPlanLimits(planId);

  const now = new Date();
  const { data: usage } = await supabaseAdmin
    .from('user_usage')
    .select('cards_generated')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gte('period_end', now.toISOString())
    .maybeSingle();

  const cardsGenerated = usage?.cards_generated ?? 0;
  return {
    cardsGenerated,
    cardsLimit: limits.cardsPerMonth,
    cardsRemaining: Math.max(0, limits.cardsPerMonth - cardsGenerated),
  };
}

/**
 * Get user's plan ID only
 */
async function getUserPlanId(userId: string): Promise<PlanId> {
  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .maybeSingle();

  return getEffectivePlanId((subscription?.plan_id ?? 'free') as PlanId, 'free');
}

/**
 * Reset user's card usage for current period (admin operation)
 */
export async function resetUsage(userId: string): Promise<void> {
  await supabaseAdmin.from('user_usage').delete().eq('user_id', userId);
}

/**
 * Get plan limits
 */
export { getPlanLimits } from '@/lib/plan-limits';

/**
 * Increment user's card generation count
 */
export async function incrementCardCount(userId: string, count: number): Promise<void> {
  const now = new Date();

  // Try to update existing usage record
  const { data: existingUsage, error: fetchError } = await supabaseAdmin
    .from('user_usage')
    .select('id, cards_generated')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gte('period_end', now.toISOString())
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existingUsage) {
    // Update existing record
    const newCount = (existingUsage.cards_generated ?? 0) + count;
    const { error: updateError } = await supabaseAdmin
      .from('user_usage')
      .update({ cards_generated: newCount })
      .eq('id', existingUsage.id);

    if (updateError) throw updateError;
  } else {
    // Create new usage record — use the subscription's billing period so the
    // window aligns with when they subscribed, not the calendar month start.
    const planId = await getUserPlanId(userId);
    const limits = await getPlanLimits(planId);

    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('current_period_start, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    let periodStart: Date;
    let periodEnd: Date;

    if (subscription?.current_period_start && subscription?.current_period_end) {
      periodStart = new Date(subscription.current_period_start);
      periodEnd = new Date(subscription.current_period_end);
    } else {
      // Free plan / no subscription: fall back to calendar month
      periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const { error: insertError } = await supabaseAdmin.from('user_usage').insert({
      user_id: userId,
      cards_generated: count,
      cards_limit: limits.cardsPerMonth,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    });

    if (insertError && insertError.code !== '23505') {
      // Ignore duplicate key
      throw insertError;
    }
  }
}

/**
 * Change user's subscription plan (admin operation)
 */
export async function changePlan(userId: string, planId: PlanId): Promise<void> {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error: upsertError } = await supabaseAdmin.from('user_subscriptions').upsert(
    {
      user_id: userId,
      plan_id: planId,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (upsertError) throw upsertError;

  // Reset usage when plan changes
  await resetUsage(userId);
}
