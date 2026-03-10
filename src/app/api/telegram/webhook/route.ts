import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { getValidPaidPlanIds } from '@/lib/plan-limits';

/**
 * POST /api/telegram/webhook
 *
 * Handles incoming updates from Telegram Bot API:
 * - pre_checkout_query: User confirmed payment in invoice modal
 * - successful_payment: Payment completed successfully
 * - message: General messages (start command, etc.)
 *
 * Telegram sends updates to this endpoint based on webhook configuration.
 */
export async function POST(req: Request) {
  // Verify the webhook secret token if configured.
  // We log mismatches but do not reject, because the webhook may have been
  // registered before the secret was set. Re-run /api/telegram/setup to fix.
  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const incomingSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (incomingSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
      logger.warn({ incomingSecret: !!incomingSecret }, 'Webhook secret mismatch — check setup');
    }
  }

  try {
    const update = await req.json();

    // Log all incoming updates for debugging
    logger.info({ updateId: update.update_id }, 'Received Telegram webhook update');

    // Extract user ID from various update types
    let userId: string | null = null;
    let updateType = 'unknown';

    // Handle pre_checkout_query (user clicking "Pay")
    if (update.pre_checkout_query) {
      updateType = 'pre_checkout_query';
      userId = update.pre_checkout_query.from.id.toString();
      const preCheckoutQueryId = update.pre_checkout_query.id;
      const payload = update.pre_checkout_query.invoice_payload;

      logger.info(
        {
          preCheckoutQueryId,
          telegramUserId: userId,
        },
        'Pre-checkout query received',
      );

      // Parse invoice payload — format: "<userId>|<planId>"
      let planId: string;
      try {
        const parts = payload.split('|');
        if (parts.length < 2) throw new Error('Invalid format');
        planId = parts[1];
      } catch (err) {
        logger.error({ payload, err }, 'Failed to parse invoice payload');
        // Answer query with error
        await answerPreCheckoutQuery(preCheckoutQueryId, false, 'Invalid invoice data');
        return NextResponse.json({ ok: true });
      }

      // Validate plan against DB
      const validPlans = await getValidPaidPlanIds();
      if (!validPlans.includes(planId)) {
        logger.warn({ planId }, 'Invalid plan in pre-checkout');
        await answerPreCheckoutQuery(preCheckoutQueryId, false, 'Invalid plan');
        return NextResponse.json({ ok: true });
      }

      // Answer pre_checkout_query (confirm we can process payment)
      const answered = await answerPreCheckoutQuery(preCheckoutQueryId, true);
      if (!answered) {
        logger.error({ preCheckoutQueryId }, 'Failed to answer pre-checkout query');
      }

      return NextResponse.json({ ok: true });
    }

    // Handle successful_payment (payment completed)
    if (update.message?.successful_payment) {
      updateType = 'successful_payment';
      userId = update.message.from.id.toString();
      const payment = update.message.successful_payment;
      const payload = payment.invoice_payload;
      const chatId = update.message.chat.id;

      const chargeId: string = payment.telegram_payment_charge_id;
      const isRecurring: boolean = !!payment.is_recurring;
      const isFirstRecurring: boolean = !!payment.is_first_recurring;
      const subscriptionExpirationDate: number | undefined = payment.subscription_expiration_date;

      logger.info(
        {
          telegramUserId: userId,
          telegramPaymentChargeId: chargeId,
          totalAmount: payment.total_amount,
          currency: payment.currency,
          isRecurring,
          isFirstRecurring,
          subscriptionExpirationDate,
        },
        'Successful payment received',
      );

      // ── Idempotency guard: skip if this charge was already processed ──
      const { data: existingPayment } = await supabaseAdmin
        .from('payment_history')
        .select('id')
        .eq('telegram_payment_charge_id', chargeId)
        .maybeSingle();

      if (existingPayment) {
        logger.info({ chargeId }, 'Duplicate payment webhook — already processed, skipping');
        return NextResponse.json({ ok: true });
      }

      // Parse invoice payload — format: "<userId>|<planId>"
      let planId: string;
      try {
        const parts = payload.split('|');
        if (parts.length < 2) throw new Error('Invalid format');
        planId = parts[1];
      } catch (err) {
        logger.error({ payload, err }, 'Failed to parse payment payload');
        return NextResponse.json({ ok: true });
      }

      const planName = planId.charAt(0).toUpperCase() + planId.slice(1);

      // Find user by telegram_id
      if (!userId) {
        logger.error('No userId available for profile lookup');
        return NextResponse.json({ ok: true });
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('telegram_id', userId)
        .maybeSingle();

      if (profileError) {
        logger.error({ err: profileError, telegramUserId: userId }, 'Failed to fetch profile');
        return NextResponse.json({ ok: true });
      }

      if (!profile) {
        logger.error(
          { telegramUserId: userId },
          'No profile found for telegram user (user may not have linked account yet)',
        );
        return NextResponse.json({ ok: true });
      }

      const dbUserId = profile.id;

      // Calculate period end — prefer Telegram's subscription_expiration_date
      const now = new Date();
      const periodEnd = subscriptionExpirationDate
        ? new Date(subscriptionExpirationDate * 1000)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // ── Record payment in history (idempotency + audit trail) ─────────
      const { error: historyError } = await supabaseAdmin.from('payment_history').insert({
        user_id: dbUserId,
        telegram_payment_charge_id: chargeId,
        plan_id: planId,
        amount: payment.total_amount,
        currency: payment.currency || 'XTR',
        is_first_recurring: isFirstRecurring,
        is_recurring: isRecurring,
        subscription_expiration_date: periodEnd.toISOString(),
      });

      if (historyError) {
        // Unique constraint violation = duplicate — safe to skip
        if (historyError.code === '23505') {
          logger.info({ chargeId }, 'Duplicate charge_id insert — skipping');
          return NextResponse.json({ ok: true });
        }
        logger.error({ err: historyError }, 'Failed to insert payment_history');
      }

      // ── Update subscription ───────────────────────────────────────────
      // For first payment or non-recurring: store the charge_id on the subscription
      // (needed for editUserStarSubscription cancel/re-enable).
      // For renewals: extend the period without overwriting the first charge_id.
      if (isRecurring && !isFirstRecurring) {
        // Renewal: extend existing subscription period
        const { error: updateError } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_id: planId,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            auto_renew: true,
            updated_at: now.toISOString(),
          })
          .eq('user_id', dbUserId);

        if (updateError) {
          logger.error(
            { err: updateError, userId: dbUserId, planId },
            'Failed to extend subscription on renewal',
          );
          return NextResponse.json({ ok: true });
        }
      } else {
        // First payment (or first recurring): upsert with charge_id
        const { error: upsertError } = await supabaseAdmin.from('user_subscriptions').upsert(
          {
            user_id: dbUserId,
            plan_id: planId,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            auto_renew: true,
            telegram_payment_charge_id: chargeId,
            updated_at: now.toISOString(),
          },
          { onConflict: 'user_id' },
        );

        if (upsertError) {
          logger.error(
            { err: upsertError, userId: dbUserId, planId },
            'Failed to upsert subscription after payment',
          );
          return NextResponse.json({ ok: true });
        }
      }

      // Reset usage for the new billing period (only on first payment, not renewals)
      if (!isRecurring || isFirstRecurring) {
        const { error: deleteUsageError } = await supabaseAdmin
          .from('user_usage')
          .delete()
          .eq('user_id', dbUserId);

        if (deleteUsageError) {
          logger.warn(
            { err: deleteUsageError, userId: dbUserId },
            'Failed to reset usage (non-critical)',
          );
        }
      }

      logger.info(
        {
          userId: dbUserId,
          planId,
          currentPeriodEnd: periodEnd.toISOString(),
          isRecurring,
          isFirstRecurring,
          chargeId,
        },
        'Subscription updated successfully after payment',
      );

      // Send confirmation message to user in Telegram
      try {
        const message =
          isRecurring && !isFirstRecurring
            ? `Your ${planName} subscription has been renewed. Next renewal: ${periodEnd.toLocaleDateString()}.`
            : `Payment successful! Your plan has been upgraded to ${planName}. You now have access to all premium features.`;
        await sendTelegramMessage(chatId, message);
      } catch (err) {
        logger.warn({ err, chatId }, 'Failed to send confirmation message');
      }

      return NextResponse.json({ ok: true });
    }

    // Handle /start command and general messages
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      logger.debug({ chatId, text }, 'Telegram message received');

      if (text?.startsWith('/start')) {
        try {
          const appUrl = env.NEXT_PUBLIC_APP_URL || 'https://yourapp.com';
          const entryUrl = `${appUrl}/tg`;

          await sendTelegramMessage(
            chatId,
            'Welcome to Clario!\n\nTransform long content into bite-sized flashcards and study them right here in Telegram.',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Launch App',
                      web_app: { url: entryUrl },
                    },
                  ],
                ],
              },
            },
          );
        } catch (err) {
          logger.error({ err, chatId }, 'Failed to send start message');
        }
      } else if (text?.startsWith('/paysupport')) {
        // Required by Telegram ToS §6.2.1 — respond to payment support requests
        try {
          const supportEmail = process.env.SUPPORT_EMAIL ?? 'support@example.com';
          await sendTelegramMessage(
            chatId,
            `Payment Support\n\nIf you have any issues with your subscription or payment, please contact us: ${supportEmail}\n\nWe will review your case and issue a refund if needed.`,
          );
        } catch (err) {
          logger.error({ err, chatId }, 'Failed to send paysupport message');
        }
      }

      return NextResponse.json({ ok: true });
    }

    // Log unhandled update types
    if (update.update_id) {
      logger.debug({ updateType, updateId: update.update_id }, 'Unhandled update type');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error }, 'Webhook handler error');
    // Always return 200 to Telegram to prevent retry spam
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

/**
 * Answer a pre_checkout_query (user clicking "Pay" in invoice modal)
 * Either approve or decline the payment
 */
async function answerPreCheckoutQuery(
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string,
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
    };

    if (!ok && errorMessage) {
      body.error_message = errorMessage;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error({ error, preCheckoutQueryId }, 'Failed to answer pre-checkout query');
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ error, preCheckoutQueryId }, 'Error answering pre-checkout query');
    return false;
  }
}

/**
 * Send a message to a Telegram chat
 */
async function sendTelegramMessage(
  chatId: number,
  text: string,
  extra?: Record<string, unknown>,
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...extra,
    };

    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      logger.error({ error, chatId }, 'Failed to send Telegram message');
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ error, chatId }, 'Error sending Telegram message');
    return false;
  }
}

/**
 * GET health check (for monitoring/debugging)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram webhook endpoint is active',
  });
}
