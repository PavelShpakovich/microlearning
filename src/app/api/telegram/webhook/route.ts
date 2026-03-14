import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

export async function POST(req: Request) {
  const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('TELEGRAM_WEBHOOK_SECRET is not set — rejecting webhook request');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 401 });
  }

  const incomingSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (incomingSecret !== webhookSecret) {
    logger.warn({ hasSecret: !!incomingSecret }, 'Webhook secret mismatch — rejecting request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const update = await req.json();
    logger.info({ updateId: update.update_id }, 'Received Telegram webhook update');

    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text as string | undefined;

      if (text?.startsWith('/start')) {
        await sendTelegramMessage(
          chatId,
          'Welcome to Clario!\n\nTransform long content into bite-sized flashcards and study them right here in Telegram.',
        );
      } else if (text?.startsWith('/support')) {
        const supportEmail = env.SUPPORT_EMAIL || 'support@example.com';
        await sendTelegramMessage(
          chatId,
          `Support\n\nIf you need help, contact us at: ${supportEmail}`,
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error }, 'Webhook handler error');
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

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

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram webhook endpoint is active',
  });
}
