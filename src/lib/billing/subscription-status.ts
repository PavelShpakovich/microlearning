import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPlanLimits } from '@/lib/plan-limits';
import { areSubscriptionsEnabled, isWebpayEnabled } from '@/lib/feature-flags';
import type {
  AvailablePlan,
  PlanId,
  SubscriptionStatusResponse,
} from '@/lib/billing/subscription-types';

const DEFAULT_PLAN_ID: PlanId = 'free';

export async function getSubscriptionStatusResponse(
  userId: string,
): Promise<SubscriptionStatusResponse> {
  const subscriptionsEnabled = areSubscriptionsEnabled();
  const now = new Date();

  const [{ data: subscription }, { data: usage }, { count: themesUsed }, { data: allPlans }] =
    await Promise.all([
      supabaseAdmin
        .from('user_subscriptions')
        .select('plan_id, status, current_period_end, auto_renew, billing_provider')
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('user_usage')
        .select('cards_generated, cards_limit, period_start, period_end')
        .eq('user_id', userId)
        .lte('period_start', now.toISOString())
        .gte('period_end', now.toISOString())
        .maybeSingle(),
      supabaseAdmin
        .from('themes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabaseAdmin
        .from('subscription_plans')
        .select(
          'id, name, cards_per_month, max_themes, price_minor, currency, is_public, sort_order, webpay_product_id, webpay_plan_id',
        )
        .eq('is_public', true)
        .order('sort_order', { ascending: true }),
    ]);

  const subscriptionPeriodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const isPeriodActive = subscriptionPeriodEnd != null && subscriptionPeriodEnd > now;
  const rawIsActive =
    subscription != null &&
    (subscription.status === 'active' || subscription.status === 'cancelled') &&
    isPeriodActive;

  const effectivePlanId = subscriptionsEnabled
    ? ((rawIsActive ? (subscription?.plan_id ?? DEFAULT_PLAN_ID) : DEFAULT_PLAN_ID) as PlanId)
    : DEFAULT_PLAN_ID;
  const limits = await getPlanLimits(effectivePlanId);

  const cardsGenerated = usage?.cards_generated ?? 0;
  const cardsLimit = usage?.cards_limit ?? limits.cardsPerMonth;
  const cardsRemaining = Math.max(0, cardsLimit - cardsGenerated);
  const periodStart = usage?.period_start ?? new Date().toISOString();
  const periodEnd =
    usage?.period_end ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const isPaid = subscriptionsEnabled && rawIsActive && effectivePlanId !== 'free';
  const autoRenew =
    subscriptionsEnabled && isPeriodActive ? (subscription?.auto_renew ?? false) : false;
  const subscriptionStatus: SubscriptionStatusResponse['subscriptionStatus'] = !subscription
    ? 'none'
    : !rawIsActive || !subscriptionsEnabled
      ? 'expired'
      : autoRenew
        ? 'active'
        : 'cancelled';

  const availablePlans: AvailablePlan[] = subscriptionsEnabled
    ? ((allPlans ?? []).map((plan) => ({
        id: plan.id as PlanId,
        name: plan.name,
        cardsPerMonth: plan.cards_per_month,
        maxThemes: plan.max_themes,
        priceMinor: plan.price_minor,
        currency: plan.currency,
        isPublic: plan.is_public,
        checkoutEnabled:
          isWebpayEnabled() &&
          plan.id !== 'free' &&
          plan.price_minor != null &&
          plan.webpay_product_id != null &&
          plan.webpay_plan_id != null,
      })) as AvailablePlan[])
    : [
        {
          id: 'free',
          name: 'Free',
          cardsPerMonth: limits.cardsPerMonth,
          maxThemes: limits.maxThemes,
          priceMinor: 0,
          currency: 'BYN',
          isPublic: true,
          checkoutEnabled: false,
        },
      ];

  return {
    planId: effectivePlanId,
    isPaid,
    expiresAt: isPaid && subscription?.current_period_end ? subscription.current_period_end : null,
    inTelegram: false,
    autoRenew,
    subscriptionStatus,
    billingEnabled: subscriptionsEnabled,
    paidInfoVisible: subscriptionsEnabled,
    billingProvider: subscriptionsEnabled ? (subscription?.billing_provider ?? null) : null,
    plan: {
      planId: effectivePlanId,
      cardsPerMonth: limits.cardsPerMonth,
      themesLimit: limits.maxThemes,
      maxThemes: limits.maxThemes,
      communityThemes: limits.communityThemes,
    },
    usage: {
      cardsGenerated,
      cardsLimit,
      cardsRemaining,
      periodStart,
      periodEnd,
    },
    themesUsed: themesUsed ?? 0,
    availablePlans,
  };
}
