import 'server-only';

import { AuthError, ValidationError } from '@/lib/errors';
import { env } from '@/lib/env';
import type { BillingEnvironment, BillingProvider } from '@/lib/billing/store-purchases';

interface RevenueCatEventLike {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  environment?: string;
  store?: string;
  purchased_at_ms?: number;
  event_timestamp_ms?: number;
  purchased_at?: string;
}

export interface RevenueCatNormalizedPurchaseEvent {
  type: string;
  userId: string;
  productId: string;
  transactionId: string;
  environment: BillingEnvironment;
  provider: BillingProvider;
  purchasedAt: string;
  rawPayload: unknown;
}

export function verifyRevenueCatWebhookAuth(request: Request): void {
  if (!env.REVENUECAT_WEBHOOK_AUTH) return;

  const authHeader = request.headers.get('authorization');
  const expectedBearer = `Bearer ${env.REVENUECAT_WEBHOOK_AUTH}`;

  if (authHeader !== expectedBearer && authHeader !== env.REVENUECAT_WEBHOOK_AUTH) {
    throw new AuthError({ message: 'Invalid RevenueCat webhook auth' });
  }
}

export function normalizeRevenueCatPurchaseEvent(
  payload: unknown,
): RevenueCatNormalizedPurchaseEvent {
  const body = (payload ?? {}) as { event?: RevenueCatEventLike } & RevenueCatEventLike;
  const event = body.event ?? body;

  const userId = event.app_user_id ?? event.original_app_user_id;
  const productId = event.product_id;
  const transactionId = event.transaction_id ?? event.original_transaction_id;

  if (!userId || !productId || !transactionId) {
    throw new ValidationError({
      message: 'RevenueCat event is missing required purchase fields',
      context: { userId, productId, transactionId },
    });
  }

  return {
    type: (event.type ?? 'unknown').toLowerCase(),
    userId,
    productId,
    transactionId,
    environment: normalizeEnvironment(event.environment),
    provider: normalizeProvider(event.store),
    purchasedAt: normalizePurchasedAt(event),
    rawPayload: payload,
  };
}

function normalizeEnvironment(environment?: string): BillingEnvironment {
  return environment?.toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
}

function normalizeProvider(store?: string): BillingProvider {
  const normalized = (store ?? '').toUpperCase();

  if (normalized.includes('PLAY')) return 'google';
  return 'apple';
}

function normalizePurchasedAt(event: RevenueCatEventLike): string {
  if (typeof event.purchased_at_ms === 'number') {
    return new Date(event.purchased_at_ms).toISOString();
  }

  if (typeof event.event_timestamp_ms === 'number') {
    return new Date(event.event_timestamp_ms).toISOString();
  }

  if (event.purchased_at) {
    const parsed = new Date(event.purchased_at);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}
