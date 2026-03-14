import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import {
  areSubscriptionsEnabled,
  isPaidInformationVisible,
  isWebpayEnabled,
} from '@/lib/feature-flags';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  buildWebpayCheckoutSession,
  getWebpayConfig,
  getWebpayMissingConfig,
  isWebpayConfigured,
} from '@/lib/billing/webpay';
import type { Json } from '@/lib/supabase/types';

const checkoutSchema = z.object({
  planId: z.enum(['basic', 'pro', 'max']),
});

export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  const body = checkoutSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  if (!areSubscriptionsEnabled() || !isPaidInformationVisible()) {
    throw new ValidationError({ message: 'Subscriptions are currently unavailable' });
  }

  const { data: plan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, is_public, price_minor, currency, webpay_product_id, webpay_plan_id')
    .eq('id', body.data.planId)
    .maybeSingle();

  if (!plan || !plan.is_public) {
    throw new ValidationError({ message: 'Plan is not available' });
  }

  if (!isWebpayEnabled()) {
    throw new ValidationError({ message: 'WEBPAY billing is not enabled yet' });
  }

  if (!isWebpayConfigured()) {
    throw new ValidationError({
      message: `WEBPAY is missing configuration: ${getWebpayMissingConfig().join(', ')}`,
    });
  }

  if (!plan.webpay_product_id || !plan.webpay_plan_id || plan.price_minor == null) {
    throw new ValidationError({ message: 'This plan is not configured for WEBPAY yet' });
  }

  const { merchantId, callbackUrls } = getWebpayConfig();

  const externalTransactionId = crypto.randomUUID();
  const { data: transaction, error } = await supabaseAdmin
    .from('payment_transactions')
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      provider: 'webpay',
      external_transaction_id: externalTransactionId,
      status: 'pending',
      kind: 'subscription_purchase',
      amount_minor: plan.price_minor,
      currency: plan.currency,
      raw_payload: {
        merchant_id: merchantId,
        webpay_product_id: plan.webpay_product_id,
        webpay_plan_id: plan.webpay_plan_id,
        callback_urls: callbackUrls,
        user_id: user.id,
      } as unknown as Json,
    })
    .select('id')
    .single();

  if (error || !transaction) {
    throw error ?? new Error('Failed to create pending WEBPAY transaction');
  }

  const checkoutSession = buildWebpayCheckoutSession({
    transactionId: transaction.id,
    amountMinor: plan.price_minor,
    currency: plan.currency,
    productId: plan.webpay_product_id,
    planId: plan.webpay_plan_id,
    customerReference: user.id,
  });

  return NextResponse.json({
    ok: true,
    provider: 'webpay',
    transactionId: transaction.id,
    url: checkoutSession.url,
    method: checkoutSession.method,
    fields: checkoutSession.fields,
  });
});
