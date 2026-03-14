import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { AuthError } from '@/lib/errors';
import { withApiHandler } from '@/lib/api/handler';
import { env } from '@/lib/env';

/**
 * POST /api/telegram/setup
 *
 * Admin-only: Register the Telegram webhook and verify bot configuration.
 * Call this once after deployment or whenever the webhook URL changes.
 *
 * Sets up the webhook to receive regular bot messages.
 */
export const POST = withApiHandler(async () => {
  const { user } = await requireAuth();
  if (!(user as { isAdmin?: boolean }).isAdmin)
    throw new AuthError({ message: 'Admin access required' });

  if (!env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' },
      { status: 400 },
    );
  }

  const webhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;

  // Register the webhook
  const setWebhookResponse = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: false,
        ...(env.TELEGRAM_WEBHOOK_SECRET ? { secret_token: env.TELEGRAM_WEBHOOK_SECRET } : {}),
      }),
    },
  );

  const setWebhookData = (await setWebhookResponse.json()) as {
    ok: boolean;
    description?: string;
    result?: boolean;
  };

  if (!setWebhookData.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Failed to set webhook: ${setWebhookData.description ?? 'Unknown error'}`,
      },
      { status: 500 },
    );
  }

  // Verify webhook info
  const webhookInfoResponse = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
  );
  const webhookInfo = (await webhookInfoResponse.json()) as {
    ok: boolean;
    result?: {
      url: string;
      has_custom_certificate: boolean;
      pending_update_count: number;
      last_error_date?: number;
      last_error_message?: string;
      allowed_updates?: string[];
    };
  };

  // Verify bot info
  const getMeResponse = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
  const getMeData = (await getMeResponse.json()) as {
    ok: boolean;
    result?: { id: number; first_name: string; username: string; can_join_groups: boolean };
  };

  // Register bot commands so the menu shows only companion actions.
  const setCommandsResponse = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setMyCommands`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Open the Mini App' },
          { command: 'support', description: 'Get support' },
        ],
      }),
    },
  );
  const setCommandsData = (await setCommandsResponse.json()) as {
    ok: boolean;
    description?: string;
  };
  if (!setCommandsData.ok) {
    console.warn('setMyCommands failed:', setCommandsData.description);
  }

  return NextResponse.json({
    ok: true,
    webhook: {
      registered: webhookUrl,
      info: webhookInfo.result,
    },
    bot: getMeData.result,
    commands: setCommandsData.ok ? 'registered' : 'failed',
  });
});

/**
 * GET /api/telegram/setup
 *
 * Admin-only: Check current webhook and bot status without making changes.
 */
export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();
  if (!(user as { isAdmin?: boolean }).isAdmin)
    throw new AuthError({ message: 'Admin access required' });

  if (!env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' },
      { status: 400 },
    );
  }

  const [webhookInfoResponse, getMeResponse] = await Promise.all([
    fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`),
    fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`),
  ]);

  const [webhookInfo, getMeData] = await Promise.all([
    webhookInfoResponse.json() as Promise<{
      ok: boolean;
      result?: {
        url: string;
        has_custom_certificate: boolean;
        pending_update_count: number;
        last_error_date?: number;
        last_error_message?: string;
        allowed_updates?: string[];
      };
    }>,
    getMeResponse.json() as Promise<{
      ok: boolean;
      result?: { id: number; first_name: string; username: string };
    }>,
  ]);

  const expectedWebhookUrl = `${env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;
  const currentUrl = webhookInfo.result?.url ?? '';
  const isRegistered = currentUrl === expectedWebhookUrl;

  return NextResponse.json({
    ok: true,
    isRegistered,
    expectedUrl: expectedWebhookUrl,
    webhook: webhookInfo.result,
    bot: getMeData.result,
  });
});
