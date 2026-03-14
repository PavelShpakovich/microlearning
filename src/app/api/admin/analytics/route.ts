import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export interface AdminAnalytics {
  totalUsers: number;
  newUsersThisMonth: number;
  activeSubscribers: number;
  cancelledInPeriod: number;
  planDistribution: Record<string, number>;
  totalRevenueMinor: number;
  revenueThisMonthMinor: number;
  revenueCurrency: string;
  cardsGeneratedThisMonth: number;
}

/**
 * GET /api/admin/analytics
 *
 * Returns aggregated platform metrics from existing Supabase tables.
 * Admin-only.
 */
export const GET = withApiHandler(async () => {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Run all aggregation queries in parallel
  const [
    totalUsersRes,
    newUsersRes,
    activeSubsRes,
    cancelledSubsRes,
    planDistRes,
    totalRevenueRes,
    monthRevenueRes,
    cardsRes,
  ] = await Promise.all([
    // Total users
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),

    // New signups this month
    supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart),

    // Active paid subscribers
    supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),

    // Cancelled but still in paid period
    supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gt('current_period_end', now.toISOString()),

    // Plan distribution (active + cancelled-in-period)
    supabaseAdmin
      .from('user_subscriptions')
      .select('plan_id')
      .in('status', ['active', 'cancelled'])
      .gt('current_period_end', now.toISOString()),

    // Total paid revenue all time
    supabaseAdmin
      .from('payment_transactions')
      .select('amount_minor, currency')
      .eq('provider', 'webpay')
      .eq('status', 'paid'),

    // Revenue this month
    supabaseAdmin
      .from('payment_transactions')
      .select('amount_minor, currency')
      .eq('provider', 'webpay')
      .eq('status', 'paid')
      .gte('created_at', monthStart),

    // Cards generated this month (all users)
    supabaseAdmin.from('user_usage').select('cards_generated').gte('period_start', monthStart),
  ]);

  // Log any errors but don't fail the whole response
  const errors = [
    totalUsersRes.error,
    newUsersRes.error,
    activeSubsRes.error,
    cancelledSubsRes.error,
    planDistRes.error,
    totalRevenueRes.error,
    monthRevenueRes.error,
    cardsRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    logger.warn({ errors }, 'Some analytics queries returned errors');
  }

  // Aggregate plan distribution
  const planDistribution: Record<string, number> = {};
  for (const row of planDistRes.data ?? []) {
    const plan = row.plan_id as string;
    planDistribution[plan] = (planDistribution[plan] ?? 0) + 1;
  }

  const analytics: AdminAnalytics = {
    totalUsers: totalUsersRes.count ?? 0,
    newUsersThisMonth: newUsersRes.count ?? 0,
    activeSubscribers: activeSubsRes.count ?? 0,
    cancelledInPeriod: cancelledSubsRes.count ?? 0,
    planDistribution,
    totalRevenueMinor: (totalRevenueRes.data ?? []).reduce(
      (sum, r) => sum + (r.amount_minor ?? 0),
      0,
    ),
    revenueThisMonthMinor: (monthRevenueRes.data ?? []).reduce(
      (sum, r) => sum + (r.amount_minor ?? 0),
      0,
    ),
    revenueCurrency:
      totalRevenueRes.data?.find((row) => typeof row.currency === 'string')?.currency ?? 'BYN',
    cardsGeneratedThisMonth: (cardsRes.data ?? []).reduce(
      (sum, r) => sum + (r.cards_generated ?? 0),
      0,
    ),
  };

  return NextResponse.json(analytics);
});
