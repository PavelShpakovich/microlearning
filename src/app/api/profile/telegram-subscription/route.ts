import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPlanLimits } from '@/lib/plan-limits';
import { editTelegramSubscription } from '@/lib/telegram-stars';
import { logger } from '@/lib/logger';

export interface SubscriptionStatus {
  // Plan information
  planId: 'free' | 'basic' | 'pro' | 'max';
  isPaid: boolean;
  expiresAt: string | null;
  inTelegram: boolean;

  // Subscription state
  autoRenew: boolean;
  subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'none';

  // Backward compatibility with components expecting nested objects
  plan: {
    planId: 'free' | 'basic' | 'pro' | 'max';
    cardsPerMonth: number;
    themesLimit: number | null;
    maxThemes: number | null;
    communityThemes: boolean;
  };

  // Usage tracking
  usage: {
    cardsGenerated: number;
    cardsLimit: number;
    cardsRemaining: number;
    periodStart: string;
    periodEnd: string;
  };

  // Theme usage
  themesUsed: number;

  // All available plans for display
  availablePlans: AvailablePlan[];
}

export interface AvailablePlan {
  id: 'free' | 'basic' | 'pro' | 'max';
  name: string;
  cardsPerMonth: number;
  maxThemes: number | null;
  starsPrice: number;
}

/**
 * GET /api/profile/telegram-subscription
 *
 * Returns the user's subscription status including usage stats.
 * Combines data from user_subscriptions, user_usage, and themes tables.
 */
export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();

  // Fetch user's subscription from database
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('user_subscriptions')
    .select('plan_id, status, current_period_end, auto_renew')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subError) {
    console.error('Failed to fetch subscription:', subError);
    // Return default free plan on error
    return defaultFreeResponse();
  }

  const now = new Date();

  // Determine effective plan: a subscription counts if it's active OR
  // cancelled-but-not-yet-expired (user keeps access until period end).
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const isPeriodActive = periodEnd != null && periodEnd > now;
  const isActive =
    subscription != null &&
    (subscription.status === 'active' || subscription.status === 'cancelled') &&
    isPeriodActive;

  const planId = (isActive ? (subscription?.plan_id ?? 'free') : 'free') as
    | 'free'
    | 'basic'
    | 'pro'
    | 'max';
  const isPaid = isActive && planId !== 'free';
  const autoRenew = subscription?.auto_renew ?? false;
  const subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'none' = !subscription
    ? 'none'
    : (subscription.status as 'active' | 'cancelled' | 'expired');
  const limits = await getPlanLimits(planId);

  // Fetch current usage period
  const { data: usage, error: usageError } = await supabaseAdmin
    .from('user_usage')
    .select('cards_generated, cards_limit, period_start, period_end')
    .eq('user_id', user.id)
    .lte('period_start', now.toISOString())
    .gte('period_end', now.toISOString())
    .maybeSingle();

  if (usageError && usageError.code !== 'PGRST116') {
    console.error('Failed to fetch usage:', usageError);
  }

  const cardsGenerated = usage?.cards_generated ?? 0;
  const cardsLimit = usage?.cards_limit ?? limits.cardsPerMonth;
  const cardsRemaining = Math.max(0, cardsLimit - cardsGenerated);
  const periodStart = usage?.period_start ?? new Date().toISOString();
  const periodEnd =
    usage?.period_end ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch theme count
  const { count: themesUsed, error: themesError } = await supabaseAdmin
    .from('themes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (themesError) {
    console.error('Failed to fetch theme count:', themesError);
  }

  const expiresAt = isPaid ? new Date(subscription!.current_period_end).toISOString() : null;

  // Fetch all plans from DB for display
  const { data: allPlans } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, name, cards_per_month, max_themes, stars_price')
    .order('stars_price', { ascending: true });

  const availablePlans: AvailablePlan[] = (allPlans ?? []).map((p) => ({
    id: p.id as AvailablePlan['id'],
    name: p.name,
    cardsPerMonth: p.cards_per_month,
    maxThemes: p.max_themes,
    starsPrice: p.stars_price,
  }));

  return NextResponse.json({
    planId: planId as 'free' | 'basic' | 'pro' | 'max',
    isPaid,
    expiresAt,
    inTelegram: true,
    autoRenew,
    subscriptionStatus,

    plan: {
      planId: planId as 'free' | 'basic' | 'pro' | 'max',
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
      periodEnd: periodEndStr,
    },

    themesUsed: themesUsed ?? 0,
    availablePlans,
  } as SubscriptionStatus);
});

/**
 * DELETE /api/profile/telegram-subscription
 *
 * Cancels the user's subscription renewal.
 * The subscription stays active until current_period_end, then expires.
 * If a Telegram charge ID is stored, calls editUserStarSubscription to stop
 * Telegram from auto-charging the user.
 */
export const DELETE = withApiHandler(async () => {
  const { user } = await requireAuth();

  // Fetch current subscription to get charge_id + telegram_id
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('user_subscriptions')
    .select('telegram_payment_charge_id, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subError) {
    console.error('Failed to fetch subscription:', subError);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }

  if (!subscription || subscription.status !== 'active') {
    return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 });
  }

  // Cancel auto-renewal in Telegram if we have the charge ID
  if (subscription.telegram_payment_charge_id) {
    // Look up the user's telegram_id from profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('telegram_id')
      .eq('id', user.id)
      .maybeSingle();

    const telegramId = profile?.telegram_id ? Number(profile.telegram_id) : null;

    if (telegramId && !isNaN(telegramId)) {
      try {
        await editTelegramSubscription(
          telegramId,
          subscription.telegram_payment_charge_id,
          true, // is_canceled = true
        );
        logger.info(
          { userId: user.id, telegramId },
          'Telegram subscription cancellation sent via editUserStarSubscription',
        );
      } catch (err) {
        // Log but don't block — still mark as cancelled in our DB
        logger.error(
          { err, userId: user.id },
          'Failed to cancel Telegram subscription via API (will still mark as cancelled locally)',
        );
      }
    }
  }

  // Mark subscription as cancelled (keeps access until current_period_end)
  const { error: updateError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      auto_renew: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Failed to cancel subscription:', updateError);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});

function defaultFreeResponse(): NextResponse<SubscriptionStatus> {
  return NextResponse.json({
    planId: 'free',
    isPaid: false,
    expiresAt: null,
    inTelegram: true,
    autoRenew: false,
    subscriptionStatus: 'none',

    plan: {
      planId: 'free',
      cardsPerMonth: 50,
      themesLimit: 3,
      maxThemes: 3,
      communityThemes: false,
    },

    usage: {
      cardsGenerated: 0,
      cardsLimit: 50,
      cardsRemaining: 50,
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },

    themesUsed: 0,
    availablePlans: [],
  } as SubscriptionStatus);
}
