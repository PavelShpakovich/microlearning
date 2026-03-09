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
    payload: JSON.stringify({
      userId,
      planId,
      timestamp: Date.now(),
    }),
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

  if (!response.ok) {
    const errorData = (await response.json()) as {
      ok: boolean;
      description?: string;
    };
    throw new Error(
      `Telegram API error: ${errorData.description || `HTTP ${response.status}`}`,
    );
  }

  const data = (await response.json()) as TelegramInvoiceLink;

  if (!data.ok || !data.result?.invoice_link) {
    throw new Error(`Failed to create Telegram invoice: ${data.description || 'Unknown error'}`);
  }

  return data.result.invoice_link;
}

/**
 * Get the Stars price for a plan based on env vars.
 * Prices should be kept in sync with USD exchange rate (~$0.013 per Star).
 */
export function getPlanStarsPrice(
  planId: 'basic' | 'pro' | 'max',
): number {
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
  const planMap: Record<
    string,
    { name: string; description: string; cardsPerMonth: number }
  > = {
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
