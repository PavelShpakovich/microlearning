import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Define plan limits here to avoid circular dependencies
const PLAN_LIMITS: Record<string, { cardsPerMonth: number; maxThemes: number; communityThemes: number }> = {
  free: { cardsPerMonth: 50, maxThemes: 3, communityThemes: 0 },
  basic: { cardsPerMonth: 300, maxThemes: 10, communityThemes: 5 },
  pro: { cardsPerMonth: 2000, maxThemes: 50, communityThemes: 10 },
  max: { cardsPerMonth: 5000, maxThemes: 999, communityThemes: 50 },
};

export interface SubscriptionStatus {
  // Plan information
  planId: 'free' | 'basic' | 'pro' | 'max';
  isPaid: boolean;
  expiresAt: string | null;
  inTelegram: boolean;
  
  // Backward compatibility with components expecting nested objects
  plan: {
    planId: 'free' | 'basic' | 'pro' | 'max';
    cardsPerMonth: number;
    themesLimit: number;
    maxThemes: number;
    communityThemes: number;
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
    .select('plan_id, status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subError) {
    console.error('Failed to fetch subscription:', subError);
    // Return default free plan on error
    return defaultFreeResponse();
  }

  const planId = subscription?.plan_id ?? 'free';
  const isPaid = subscription && planId !== 'free' && subscription.status === 'active';
  const limits = PLAN_LIMITS[planId] || PLAN_LIMITS['free'];

  // Fetch current usage period
  const now = new Date();
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
  const periodEnd = usage?.period_end ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch theme count
  const { count: themesUsed, error: themesError } = await supabaseAdmin
    .from('themes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (themesError) {
    console.error('Failed to fetch theme count:', themesError);
  }

  const expiresAt = isPaid ? new Date(subscription!.current_period_end).toISOString() : null;

  return NextResponse.json({
    planId: planId as 'free' | 'basic' | 'pro' | 'max',
    isPaid,
    expiresAt,
    inTelegram: true,
    
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
      periodEnd,
    },
    
    themesUsed: themesUsed ?? 0,
  } as SubscriptionStatus);
});

/**
 * DELETE /api/profile/telegram-subscription
 * 
 * Cancels the user's subscription and reverts them to free plan.
 */
export const DELETE = withApiHandler(async () => {
  const { user } = await requireAuth();

  // Delete subscription
  const { error: deleteError } = await supabaseAdmin
    .from('user_subscriptions')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Failed to delete subscription:', deleteError);
    return NextResponse.json(
      { error: 'Failed to downgrade subscription' },
      { status: 500 }
    );
  }

  // Reset usage if exists
  await supabaseAdmin
    .from('user_usage')
    .delete()
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
});

function defaultFreeResponse(): NextResponse<SubscriptionStatus> {
  return NextResponse.json({
    planId: 'free',
    isPaid: false,
    expiresAt: null,
    inTelegram: true,
    
    plan: {
      planId: 'free',
      cardsPerMonth: 50,
      themesLimit: 3,
      maxThemes: 3,
      communityThemes: 0,
    },
    
    usage: {
      cardsGenerated: 0,
      cardsLimit: 50,
      cardsRemaining: 50,
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    
    themesUsed: 0,
  } as SubscriptionStatus);
}
