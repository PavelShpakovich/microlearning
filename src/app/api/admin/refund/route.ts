import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { refundStarPayment } from '@/lib/telegram-stars';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const refundSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  telegramPaymentChargeId: z.string().min(1, 'telegramPaymentChargeId is required'),
});

/**
 * POST /api/admin/refund
 *
 * Admin-only endpoint to refund a Telegram Stars payment.
 * Calls refundStarPayment via Telegram Bot API.
 */
export const POST = withApiHandler(async (req) => {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;
  const { user } = adminCheck;
  const body = refundSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((i) => i.message).join(', '),
    });
  }

  const { userId, telegramPaymentChargeId } = body.data;

  // Look up the user's telegram_id
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('telegram_id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile?.telegram_id) {
    return NextResponse.json({ error: 'User not found or has no Telegram ID' }, { status: 404 });
  }

  const telegramId = Number(profile.telegram_id);
  if (isNaN(telegramId)) {
    return NextResponse.json({ error: 'Invalid Telegram ID in profile' }, { status: 400 });
  }

  // Issue refund via Telegram Bot API
  try {
    await refundStarPayment(telegramId, telegramPaymentChargeId);
  } catch (err) {
    logger.error({ err, userId, telegramPaymentChargeId }, 'Refund API call failed');
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Refund failed' },
      { status: 502 },
    );
  }

  // Mark the matching subscription as expired if this charge is the active one
  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('telegram_payment_charge_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (subscription?.telegram_payment_charge_id === telegramPaymentChargeId) {
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'expired',
        auto_renew: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Clear usage so user is back to free limits
    await supabaseAdmin.from('user_usage').delete().eq('user_id', userId);
  }

  logger.info({ userId, telegramPaymentChargeId, adminId: user.id }, 'Refund issued successfully');

  return NextResponse.json({ success: true, refunded: telegramPaymentChargeId });
});
