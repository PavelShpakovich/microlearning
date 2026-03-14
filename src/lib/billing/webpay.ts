import crypto from 'crypto';
import { env } from '@/lib/env';

export interface WebpayCallbackUrls {
  successUrl: string;
  cancelUrl: string;
  failUrl: string;
  webhookUrl: string;
}

export interface WebpayConfig {
  apiBaseUrl: string;
  merchantId: string;
  secretKey: string;
  webhookSecret: string;
  callbackUrls: WebpayCallbackUrls;
}

export interface WebpayCheckoutSession {
  url: string;
  method: 'POST';
  fields: Record<string, string>;
}

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path.startsWith('/') ? path : `/${path}`, baseUrl).toString();
}

export function getWebpayCallbackUrls(): WebpayCallbackUrls {
  return {
    successUrl: joinUrl(env.NEXT_PUBLIC_APP_URL, env.WEBPAY_SUCCESS_PATH),
    cancelUrl: joinUrl(env.NEXT_PUBLIC_APP_URL, env.WEBPAY_CANCEL_PATH),
    failUrl: joinUrl(env.NEXT_PUBLIC_APP_URL, env.WEBPAY_FAIL_PATH),
    webhookUrl: joinUrl(env.NEXT_PUBLIC_APP_URL, '/api/webhooks/webpay'),
  };
}

export function getWebpayMissingConfig(): string[] {
  const required: Array<[string, string | undefined]> = [
    ['WEBPAY_API_BASE_URL', env.WEBPAY_API_BASE_URL],
    ['WEBPAY_MERCHANT_ID', env.WEBPAY_MERCHANT_ID],
    ['WEBPAY_SECRET_KEY', env.WEBPAY_SECRET_KEY],
    ['WEBPAY_WEBHOOK_SECRET', env.WEBPAY_WEBHOOK_SECRET],
  ];

  return required.filter(([, value]) => !value).map(([key]) => key);
}

export function isWebpayConfigured(): boolean {
  return getWebpayMissingConfig().length === 0;
}

export function getWebpayConfig(): WebpayConfig {
  const missing = getWebpayMissingConfig();
  if (missing.length > 0) {
    throw new Error(`Missing WEBPAY configuration: ${missing.join(', ')}`);
  }

  return {
    apiBaseUrl: env.WEBPAY_API_BASE_URL!,
    merchantId: env.WEBPAY_MERCHANT_ID!,
    secretKey: env.WEBPAY_SECRET_KEY!,
    webhookSecret: env.WEBPAY_WEBHOOK_SECRET!,
    callbackUrls: getWebpayCallbackUrls(),
  };
}

export function signWebpayPayload(payload: string | Record<string, unknown>): string {
  const { secretKey } = getWebpayConfig();
  const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

  return crypto.createHmac('sha256', secretKey).update(rawPayload).digest('hex');
}

export function verifyWebpaySignature(rawPayload: string, signature: string | null): boolean {
  if (!signature) return false;

  const expected = signWebpayPayload(rawPayload);
  const provided = Buffer.from(signature);
  const actual = Buffer.from(expected);

  if (provided.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, actual);
}

export function buildWebpayOrderReference(transactionId: string): string {
  return `clario-${transactionId}`;
}

export function parseWebpayOrderReference(orderReference: string | undefined): string | null {
  if (!orderReference) return null;
  return orderReference.startsWith('clario-') ? orderReference.slice('clario-'.length) : null;
}

export function buildWebpayCheckoutSession(input: {
  transactionId: string;
  amountMinor: number;
  currency: string;
  productId: string;
  planId: string;
  customerReference: string;
}): WebpayCheckoutSession {
  const { apiBaseUrl, merchantId, callbackUrls } = getWebpayConfig();

  const fields = {
    merchant_id: merchantId,
    order_reference: buildWebpayOrderReference(input.transactionId),
    amount_minor: String(input.amountMinor),
    currency: input.currency,
    product_id: input.productId,
    plan_id: input.planId,
    customer_reference: input.customerReference,
    success_url: callbackUrls.successUrl,
    cancel_url: callbackUrls.cancelUrl,
    fail_url: callbackUrls.failUrl,
    webhook_url: callbackUrls.webhookUrl,
  };

  return {
    url: `${apiBaseUrl.replace(/\/$/, '')}/checkout`,
    method: 'POST',
    fields: {
      ...fields,
      signature: signWebpayPayload(fields),
    },
  };
}

export function resolveWebpayStatus(
  rawStatus: string | undefined,
): 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' {
  const normalized = rawStatus?.toLowerCase();

  switch (normalized) {
    case 'paid':
    case 'success':
    case 'succeeded':
    case 'completed':
      return 'paid';
    case 'refunded':
    case 'refund':
      return 'refunded';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'failed':
    case 'declined':
    case 'error':
      return 'failed';
    default:
      return 'pending';
  }
}
