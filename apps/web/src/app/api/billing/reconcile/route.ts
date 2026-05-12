import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { grantStorePurchase, recordStorePurchaseEvent } from '@/lib/billing/store-purchases';

const reconcileSchema = z.object({
  provider: z.enum(['apple', 'google']),
  externalTransactionId: z.string().min(1),
  externalProductId: z.string().min(1),
  environment: z.enum(['sandbox', 'production']).default('production'),
  purchasedAt: z.string().datetime().optional(),
  revenuecatAppUserId: z.string().min(1).optional(),
  rawPayload: z.unknown().optional(),
});

export const POST = withApiHandler(async (req: Request) => {
  const { user } = await requireAuth();

  const parsed = reconcileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    throw new ValidationError({
      message: 'Invalid reconcile payload',
      context: parsed.error.flatten(),
    });
  }

  if (parsed.data.revenuecatAppUserId && parsed.data.revenuecatAppUserId !== user.id) {
    throw new ValidationError({
      message: 'RevenueCat user does not match authenticated user',
      context: {
        revenuecatAppUserId: parsed.data.revenuecatAppUserId,
        userId: user.id,
      },
    });
  }

  const result = await grantStorePurchase({
    userId: user.id,
    provider: parsed.data.provider,
    externalTransactionId: parsed.data.externalTransactionId,
    externalProductId: parsed.data.externalProductId,
    environment: parsed.data.environment,
    purchasedAt: parsed.data.purchasedAt ?? new Date().toISOString(),
    rawPayload: parsed.data.rawPayload,
    revenuecatAppUserId: parsed.data.revenuecatAppUserId ?? user.id,
  });

  await recordStorePurchaseEvent({
    provider: parsed.data.provider,
    eventType: 'client_reconcile',
    externalTransactionId: parsed.data.externalTransactionId,
    purchaseId: result.purchaseId,
    rawPayload: parsed.data.rawPayload,
  });

  return NextResponse.json({
    status: 'credited',
    purchaseId: result.purchaseId,
    transactionId: result.transactionId,
    newBalance: result.newBalance,
    alreadyCredited: result.alreadyCredited,
    packId: result.pack.id,
    creditsGranted: result.pack.credits,
  });
});
