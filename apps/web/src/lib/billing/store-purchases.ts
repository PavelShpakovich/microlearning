import 'server-only';

import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAllCreditPacks, type CreditPack } from '@/lib/credits/pricing';
import type { Json } from '@/lib/supabase/types';

const db = supabaseAdmin;

function toJsonPayload(payload: unknown): Json {
  return ((payload ?? {}) as Json) ?? {};
}

export type BillingProvider = 'apple' | 'google';
export type BillingEnvironment = 'sandbox' | 'production';

export interface StorePurchaseGrantInput {
  userId: string;
  provider: BillingProvider;
  externalTransactionId: string;
  externalProductId: string;
  environment: BillingEnvironment;
  purchasedAt: string;
  rawPayload?: unknown;
  revenuecatAppUserId?: string | null;
}

export interface StorePurchaseGrantResult {
  purchaseId: string;
  transactionId: string | null;
  newBalance: number;
  alreadyCredited: boolean;
  pack: CreditPack;
}

export interface StorePurchaseRevokeInput {
  provider: BillingProvider;
  externalTransactionId: string;
  rawPayload?: unknown;
}

export interface StorePurchaseRevokeResult {
  purchaseId: string;
  transactionId: string | null;
  newBalance: number;
  alreadyReversed: boolean;
  insufficientBalance: boolean;
  status: string;
}

export async function resolveCreditPackByStoreProductId(productId: string): Promise<CreditPack> {
  const packs = await getAllCreditPacks();
  const pack = packs.find(
    (candidate) =>
      candidate.appleProductId === productId || candidate.googleProductId === productId,
  );

  if (!pack) {
    throw new ValidationError({
      message: `Unknown store product: ${productId}`,
      context: { productId },
    });
  }

  return pack;
}

export async function grantStorePurchase(
  input: StorePurchaseGrantInput,
): Promise<StorePurchaseGrantResult> {
  const pack = await resolveCreditPackByStoreProductId(input.externalProductId);

  const { data, error } = await db.rpc('grant_store_purchase_atomic', {
    p_user_id: input.userId,
    p_provider: input.provider,
    p_external_transaction_id: input.externalTransactionId,
    p_external_product_id: input.externalProductId,
    p_pack_id: pack.id,
    p_credits_granted: pack.credits,
    p_environment: input.environment,
    p_purchased_at: input.purchasedAt,
    p_raw_payload: toJsonPayload(input.rawPayload),
    p_revenuecat_app_user_id: input.revenuecatAppUserId ?? undefined,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  logger.info(
    {
      userId: input.userId,
      provider: input.provider,
      externalTransactionId: input.externalTransactionId,
      externalProductId: input.externalProductId,
      purchaseId: row.purchase_id,
      transactionId: row.transaction_id,
      alreadyCredited: row.already_credited,
      newBalance: row.new_balance,
    },
    'Processed store purchase grant',
  );

  return {
    purchaseId: row.purchase_id,
    transactionId: row.transaction_id ?? null,
    newBalance: row.new_balance,
    alreadyCredited: row.already_credited,
    pack,
  };
}

export async function recordStorePurchaseEvent(params: {
  provider: BillingProvider;
  eventType: string;
  externalTransactionId?: string | null;
  purchaseId?: string | null;
  rawPayload?: unknown;
}): Promise<void> {
  const { error } = await db.from('store_purchase_events').insert({
    provider: params.provider,
    event_type: params.eventType,
    external_transaction_id: params.externalTransactionId ?? null,
    purchase_id: params.purchaseId ?? null,
    raw_payload: toJsonPayload(params.rawPayload),
  });

  if (error) throw error;
}

export async function revokeStorePurchase(
  input: StorePurchaseRevokeInput,
): Promise<StorePurchaseRevokeResult> {
  const { data, error } = await db.rpc('revoke_store_purchase_atomic', {
    p_provider: input.provider,
    p_external_transaction_id: input.externalTransactionId,
    p_raw_payload: toJsonPayload(input.rawPayload),
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  logger.info(
    {
      provider: input.provider,
      externalTransactionId: input.externalTransactionId,
      purchaseId: row.purchase_id,
      transactionId: row.transaction_id,
      status: row.status,
      alreadyReversed: row.already_reversed,
      insufficientBalance: row.insufficient_balance,
      newBalance: row.new_balance,
    },
    'Processed store purchase revoke',
  );

  return {
    purchaseId: row.purchase_id,
    transactionId: row.transaction_id ?? null,
    newBalance: row.new_balance,
    alreadyReversed: row.already_reversed,
    insufficientBalance: row.insufficient_balance,
    status: row.status,
  };
}
