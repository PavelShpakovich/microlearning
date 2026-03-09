/**
 * Telegram Stars API integration service
 *
 * Handles communication with Telegram Bot API for Stars payments.
 * Reference: https://core.telegram.org/bots/payments-stars
 */

import { env } from '@/lib/env';

interface TelegramInvoiceLink {
  ok: boolean;
  result?: {
    invoice_link: string;
  };
  description?: string;
}

interface TelegramInvoicePayload {
  title: string;
  description: string;
  payload: string;
  provider_token: string; // Must be '' for Telegram Stars (XTR)
  currency: 'XTR'; //Telegram Stars
  prices: Array<{
    label: string;
    amount: number; // In smallest units (Telegram Stars)
  }>;
}

/**
 * Create a Telegram Stars invoice link
 *
 * API Reference: https://core.telegram.org/bots/api#createinvoicelink
 */
export async function createTelegramInvoiceLink(
  userId: string,
  planId: string,
  planName: string,
  planDescription: string,
  starsPrice: number,
): Promise<string> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  const payload: TelegramInvoicePayload = {
    title: `Upgrade to ${planName}`,
    description: planDescription,
    // Telegram payload must be 1-128 ASCII characters.
    // Encode only the essential fields, separated by | to stay well under the limit.
    // Format: "<userId>|<planId>" (UUID=36 + "|" + max 5 = 42 chars)
    payload: `${userId}|${planId}`,
    provider_token: '', // Required to be empty string for Telegram Stars (XTR)
    currency: 'XTR',
    prices: [
      {
        label: planName,
        amount: starsPrice,
      },
    ],
  };

  const apiUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/createInvoiceLink`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let data: TelegramInvoiceLink;
  try {
    data = JSON.parse(rawText) as TelegramInvoiceLink;
  } catch {
    throw new Error(`Telegram API returned non-JSON (HTTP ${response.status}): ${rawText.slice(0, 200)}`);
  }

  if (!response.ok || !data.ok) {
    throw new Error(
      `Telegram API error (HTTP ${response.status}): ${data.description || JSON.stringify(data)}`,
    );
  }

  if (!data.result?.invoice_link) {
    throw new Error(`Telegram invoice link missing in response: ${JSON.stringify(data)}`);
  }

  return data.result.invoice_link;
}

/**
 * Get the Stars price for a plan based on env vars.
 * Prices should be kept in sync with USD exchange rate (~$0.013 per Star).
 */
export function getPlanStarsPrice(planId: 'basic' | 'pro' | 'max'): number {
  const priceMap: Record<'basic' | 'pro' | 'max', string> = {
    basic: env.TELEGRAM_STARS_PRICE_BASIC,
    pro: env.TELEGRAM_STARS_PRICE_PRO,
    max: env.TELEGRAM_STARS_PRICE_MAX,
  };

  const priceStr = priceMap[planId];
  if (!priceStr) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  const price = parseInt(priceStr, 10);
  if (Number.isNaN(price) || price < 1) {
    throw new Error(`Invalid Stars price for plan ${planId}: ${priceStr}`);
  }

  return price;
}

/**
 * Get plan details for Telegram invoice.
 */
export function getPlanDetails(planId: string) {
  const planMap: Record<string, { name: string; description: string; cardsPerMonth: number }> = {
    basic: {
      name: 'Starter',
      description: 'Create 300 cards per month · Start your learning journey',
      cardsPerMonth: 300,
    },
    pro: {
      name: 'Pro',
      description: 'Create 2,000 cards per month · Power up your learning',
      cardsPerMonth: 2000,
    },
    max: {
      name: 'Max',
      description: 'Create 5,000 cards per month · Unlimited learning',
      cardsPerMonth: 5000,
    },
  };

  const plan = planMap[planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }

  return plan;
}
