import { NextResponse } from 'next/server';
import { isWebpayEnabled } from '@/lib/feature-flags';
import { logger } from '@/lib/logger';
import {
  getWebpayMissingConfig,
  isWebpayConfigured,
  parseWebpayOrderReference,
  resolveWebpayStatus,
  verifyWebpaySignature,
} from '@/lib/billing/webpay';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';

export async function POST(req: Request) {
  const payload = await req.text();

  logger.info(
    { enabled: isWebpayEnabled(), payloadLength: payload.length },
    'WEBPAY webhook received',
  );

  if (!isWebpayEnabled()) {
    return NextResponse.json({ ok: false, error: 'WEBPAY is disabled' }, { status: 503 });
  }

  if (!isWebpayConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: `WEBPAY is missing configuration: ${getWebpayMissingConfig().join(', ')}`,
      },
      { status: 503 },
    );
  }

  const signature = req.headers.get('x-webpay-signature');
  if (!verifyWebpaySignature(payload, signature)) {
    return NextResponse.json({ ok: false, error: 'Invalid WEBPAY signature' }, { status: 401 });
  }

  let data: Record<string, any>;
  try {
    data = JSON.parse(payload) as Record<string, any>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  const metadata = (data.metadata ?? {}) as Record<string, any>;
  const transactionId =
    (metadata.transactionId as string | undefined) ??
    parseWebpayOrderReference(
      (data.order_reference as string | undefined) ?? (data.orderReference as string | undefined),
    ) ??
    undefined;
  const externalTransactionId =
    (data.transaction_id as string | undefined) ??
    (data.payment_id as string | undefined) ??
    transactionId;

  if (!transactionId || !externalTransactionId) {
    return NextResponse.json({ ok: false, error: 'Missing transaction metadata' }, { status: 400 });
  }

  const { data: storedTransaction } = await supabaseAdmin
    .from('payment_transactions')
    .select('id, user_id, plan_id, subscription_id')
    .eq('id', transactionId)
    .eq('provider', 'webpay')
    .maybeSingle();

  if (!storedTransaction) {
    return NextResponse.json({ ok: false, error: 'Transaction not found' }, { status: 404 });
  }

  const status = resolveWebpayStatus(
    (data.status as string | undefined) ?? (data.payment_status as string | undefined),
  );

  const resolvedUserId = (metadata.userId as string | undefined) ?? storedTransaction.user_id;
  const resolvedPlanId =
    (metadata.planId as string | undefined) ?? storedTransaction.plan_id ?? 'free';
  const amountMinor = Number(data.amount_minor ?? metadata.amountMinor ?? 0);
  const currency = String(data.currency ?? metadata.currency ?? 'BYN');

  const { error: paymentError } = await supabaseAdmin
    .from('payment_transactions')
    .update({
      external_transaction_id: externalTransactionId,
      external_customer_id: (data.customer_id as string | undefined) ?? null,
      external_subscription_id: (data.subscription_id as string | undefined) ?? null,
      status,
      amount_minor: amountMinor,
      currency,
      raw_payload: data as Json,
    })
    .eq('id', transactionId)
    .eq('provider', 'webpay');

  if (paymentError) {
    logger.error({ paymentError, transactionId }, 'Failed to update WEBPAY transaction');
    return NextResponse.json({ ok: false, error: 'Transaction update failed' }, { status: 500 });
  }

  if (status === 'paid') {
    const periodStart = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: existingSubscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', resolvedUserId)
      .maybeSingle();

    const subscriptionPayload = {
      user_id: resolvedUserId,
      plan_id: resolvedPlanId,
      billing_provider: 'webpay',
      billing_customer_id: (data.customer_id as string | undefined) ?? null,
      billing_subscription_id: (data.subscription_id as string | undefined) ?? externalTransactionId,
      status: 'active',
      auto_renew: true,
      current_period_start: periodStart,
      current_period_end: periodEnd,
    };

    const { data: savedSubscription, error: subscriptionError } = existingSubscription?.id
      ? await supabaseAdmin
          .from('user_subscriptions')
          .update(subscriptionPayload)
          .eq('id', existingSubscription.id)
          .select('id')
          .single()
      : await supabaseAdmin
          .from('user_subscriptions')
          .insert(subscriptionPayload)
          .select('id')
          .single();

    if (subscriptionError || !savedSubscription) {
      logger.error(
        { subscriptionError, userId: resolvedUserId },
        'Failed to persist WEBPAY subscription',
      );
      return NextResponse.json({ ok: false, error: 'Subscription update failed' }, { status: 500 });
    }

    await supabaseAdmin
      .from('payment_transactions')
      .update({ subscription_id: savedSubscription.id })
      .eq('id', transactionId)
      .eq('provider', 'webpay');
  }

  if (status === 'failed' || status === 'cancelled' || status === 'refunded') {
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: status === 'refunded' ? 'expired' : 'cancelled',
        auto_renew: false,
      })
      .eq('user_id', resolvedUserId)
      .eq('billing_provider', 'webpay');
  }

  return NextResponse.json({ ok: true });
}
