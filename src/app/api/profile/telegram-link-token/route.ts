import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { AuthError } from '@/lib/errors';
import { env } from '@/lib/env';

/**
 * POST /api/profile/telegram-link-token
 *
 * Generates a short-lived signed link token for the currently logged-in
 * web user. The token is passed as `start_param` to the Telegram bot so
 * the Mini App can call POST /api/profile/link-telegram on their behalf
 * without them needing a second login.
 *
 * Token format: base64url(JSON({ userId, exp })).<HMAC-SHA256>
 * Expiry: 10 minutes.
 */
export const POST = withApiHandler(async () => {
  const { user } = await requireAuth();

  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new AuthError({ message: 'Telegram is not configured on this server' });
  }

  const exp = Date.now() + 10 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId: user.id, exp })).toString('base64url');
  const secret = env.NEXTAUTH_SECRET ?? env.SUPABASE_SERVICE_KEY;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');

  return NextResponse.json({ token: `${payload}.${sig}` });
});
