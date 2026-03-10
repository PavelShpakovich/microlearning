import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * GET /api/cron/subscription-renewal
 *
 * Called daily by Vercel Cron. Two jobs in sequence:
 *   A) Expire subscriptions whose current_period_end has passed.
 *   B) Remind users whose subscription expires within 3 days (if they have a Telegram ID).
 *
 * Secured with Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──────────────────────────────────────────────────────────────
  const secret = env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();

  // ── A: Expire overdue subscriptions ──────────────────────────────────
  // For auto_renew=true subscriptions, allow a 3-day grace period after
  // current_period_end — Telegram may still be processing the recurring charge.
  // For auto_renew=false (cancelled), expire as soon as the period ends.

  // A1: Expire cancelled subscriptions (no grace period)
  const { data: expiredCancelled, error: cancelledError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'expired' })
    .eq('status', 'cancelled')
    .eq('auto_renew', false)
    .lt('current_period_end', now.toISOString())
    .select('user_id');

  if (cancelledError) {
    logger.error({ error: cancelledError }, 'Cron: failed to expire cancelled subscriptions');
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

  // ── B: Remind users expiring in next 3 days (only non-auto-renewing) ─
  // Auto-renewing users don't need reminders — Telegram charges automatically.
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.info('Cron: TELEGRAM_BOT_TOKEN not set — skipping renewal reminders');
    return NextResponse.json({ expired: expiredUserIds.length, reminded: 0 });
  }

  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: expiringSoon, error: remindError } = await supabaseAdmin
    .from('user_subscriptions')
    .select('user_id, plan_id, current_period_end')
    .in('status', ['active', 'cancelled'])
    .eq('auto_renew', false)
    .gt('current_period_end', now.toISOString())
    .lte('current_period_end', in3Days.toISOString());

  if (remindError) {
    logger.error({ error: remindError }, 'Cron: failed to query expiring subscriptions');
    return NextResponse.json({ expired: expiredUserIds.length, reminded: 0 });
  }

  if (!expiringSoon || expiringSoon.length === 0) {
    return NextResponse.json({ expired: expiredUserIds.length, reminded: 0 });
  }

  const userIds = expiringSoon.map((s) => s.user_id);

  // Fetch Telegram IDs for these users from profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, telegram_id')
    .in('id', userIds)
    .not('telegram_id', 'is', null);

  if (profilesError) {
    logger.error({ error: profilesError }, 'Cron: failed to fetch profiles for reminders');
    return NextResponse.json({ expired: expiredUserIds.length, reminded: 0 });
  }

  const telegramMap = new Map(
    (profiles ?? [])
      .filter((p) => p.telegram_id != null)
      .map((p) => [p.id, p.telegram_id as string]),
  );

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  let reminded = 0;

  for (const sub of expiringSoon) {
    const telegramIdStr = telegramMap.get(sub.user_id);
    if (!telegramIdStr) continue;
    const telegramId = Number(telegramIdStr);
    if (isNaN(telegramId)) continue;

    const expiresAt = new Date(sub.current_period_end);
    const daysLeft = Math.max(
      1,
      Math.round((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const planName = sub.plan_id.charAt(0).toUpperCase() + sub.plan_id.slice(1);

    const text =
      `⭐ Your *${planName}* plan expires in *${daysLeft} day${daysLeft !== 1 ? 's' : ''}*.\n\n` +
      `Open the app to renew and keep your progress going!`;

    try {
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Renew subscription', web_app: { url: `${appUrl}/settings/plan` } }],
            ],
          },
        }),
      });

      if (res.ok) {
        reminded++;
      } else {
        const err = await res.json().catch(() => ({}));
        logger.warn({ err, telegramId }, 'Cron: failed to send reminder message');
      }
    } catch (e) {
      logger.warn({ e, telegramId }, 'Cron: exception sending reminder message');
    }
  }

  logger.info({ expired: expiredUserIds.length, reminded }, 'Cron: renewal reminder job done');

  return NextResponse.json({ expired: expiredUserIds.length, reminded });
}
