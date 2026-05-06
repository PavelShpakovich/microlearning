import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import {
  grantStorePurchase,
  recordStorePurchaseEvent,
  revokeStorePurchase,
} from '@/lib/billing/store-purchases';
import {
  normalizeRevenueCatPurchaseEvent,
  verifyRevenueCatWebhookAuth,
} from '@/lib/billing/revenuecat';

const CREDITING_EVENT_TYPES = new Set(['initial_purchase', 'non_renewing_purchase']);
const REVOKE_EVENT_TYPES = new Set(['cancellation']);

export const POST = withApiHandler(async (req: Request) => {
  verifyRevenueCatWebhookAuth(req);

  const payload = await req.json().catch(() => ({}));
  const event = normalizeRevenueCatPurchaseEvent(payload);

  const shouldCredit = CREDITING_EVENT_TYPES.has(event.type);
  const shouldRevoke = REVOKE_EVENT_TYPES.has(event.type);

  if (shouldRevoke) {
    const result = await revokeStorePurchase({
      provider: event.provider,
      externalTransactionId: event.transactionId,
      rawPayload: event.rawPayload,
    });

    await recordStorePurchaseEvent({
      provider: event.provider,
      eventType: event.type,
      externalTransactionId: event.transactionId,
      purchaseId: result.purchaseId,
      rawPayload: payload,
    });

    return NextResponse.json({
      ok: true,
      handled: true,
      purchaseId: result.purchaseId,
      status: result.status,
      insufficientBalance: result.insufficientBalance,
    });
  }

  if (!shouldCredit) {
    await recordStorePurchaseEvent({
      provider: event.provider,
      eventType: event.type,
      externalTransactionId: event.transactionId,
      rawPayload: payload,
    });

    return NextResponse.json({ ok: true, handled: false, eventType: event.type });
  }

  const result = await grantStorePurchase({
    userId: event.userId,
    provider: event.provider,
    externalTransactionId: event.transactionId,
    externalProductId: event.productId,
    environment: event.environment,
    purchasedAt: event.purchasedAt,
    rawPayload: event.rawPayload,
    revenuecatAppUserId: event.userId,
  });

  await recordStorePurchaseEvent({
    provider: event.provider,
    eventType: event.type,
    externalTransactionId: event.transactionId,
    purchaseId: result.purchaseId,
    rawPayload: payload,
  });

  return NextResponse.json({
    ok: true,
    handled: true,
    purchaseId: result.purchaseId,
    alreadyCredited: result.alreadyCredited,
  });
});
