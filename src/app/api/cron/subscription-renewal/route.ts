import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * GET /api/cron/subscription-renewal
 *
 * Called daily by Vercel Cron.
 * Expires subscriptions whose current_period_end has passed and clears stale usage.
 *
 * Secured with Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────
  const secret = env.CRON_SECRET;
  if (!secret) {
    // CRON_SECRET must always be set — an unprotected cron endpoint is a security risk.
    logger.error('CRON_SECRET is not configured — rejecting request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // ── A: Expire overdue subscriptions ──────────────────────────────────
  // For auto_renew=true subscriptions, allow a 3-day grace period after
  // current_period_end in case a provider renewal callback is delayed.
  // For auto_renew=false (cancelled), expire as soon as the period ends.

  // A1: Expire subscriptions where auto-renewal was disabled (no grace period)
  const { data: expiredCancelled, error: cancelledError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'expired' })
    .in('status', ['active', 'cancelled'])
    .eq('auto_renew', false)
    .lt('current_period_end', now.toISOString())
    .select('user_id');

  if (cancelledError) {
    logger.error({ error: cancelledError }, 'Cron: failed to expire non-renewing subscriptions');
  }

  // A2: Expire auto-renew subscriptions that are 3+ days overdue (payment failed)
  const gracePeriodEnd = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const { data: expiredAutoRenew, error: autoRenewError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'expired', auto_renew: false })
    .eq('status', 'active')
    .eq('auto_renew', true)
    .lt('current_period_end', gracePeriodEnd.toISOString())
    .select('user_id');

  if (autoRenewError) {
    logger.error({ error: autoRenewError }, 'Cron: failed to expire overdue auto-renew subs');
  }

  const expiredUserIds = [
    ...(expiredCancelled ?? []).map((r) => r.user_id),
    ...(expiredAutoRenew ?? []).map((r) => r.user_id),
  ];
  let usageDeleted = 0;

  if (expiredUserIds.length > 0) {
    // Delete usage rows so the next generation period starts fresh on re-subscribe
    const { error: usageError } = await supabaseAdmin
      .from('user_usage')
      .delete()
      .in('user_id', expiredUserIds);

    if (usageError) {
      logger.error({ error: usageError }, 'Cron: failed to delete expired user_usage rows');
    } else {
      usageDeleted = expiredUserIds.length;
    }
  }

  logger.info(
    { expired: expiredUserIds.length, usageDeleted },
    'Cron: subscription expiry job done',
  );

  return NextResponse.json({ expired: expiredUserIds.length, reminded: 0, overdueAutoRenew: 0 });
}
