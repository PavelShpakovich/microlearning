import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { env } from '@/lib/env';
import { createTelegramLinkToken, buildTelegramStartParam } from '@/lib/auth/telegram-link';
import { getTelegramIdForUser } from '@/lib/auth/account-identities';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/profile/link-telegram?token=<raw-token>
 * Public — called from the Telegram Mini App before the user confirms linking.
 * Returns the email of the web account tied to the token.
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const raw = req.nextUrl.searchParams.get('token');
  if (!raw) throw new ValidationError({ message: 'Missing token' });

  const { data } = await supabaseAdmin
    .from('telegram_link_tokens')
    .select('user_id, expires_at, consumed_at')
    .eq('token', raw)
    .maybeSingle();

  if (!data || data.consumed_at || new Date(data.expires_at).getTime() < Date.now()) {
    throw new ValidationError({ message: 'Link token is invalid or expired' });
  }

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
  return NextResponse.json({ email: authUser.user?.email ?? null });
});

export const POST = withApiHandler(async () => {
  const { user } = await requireAuth();

  if (!env.NEXT_PUBLIC_TELEGRAM_BOT_URL) {
    throw new ValidationError({ message: 'Telegram bot URL is not configured' });
  }

  const telegramId = await getTelegramIdForUser(user.id);
  if (telegramId) {
    return NextResponse.json({ success: true, alreadyLinked: true, telegramId });
  }

  const token = await createTelegramLinkToken(user.id);
  const deepLink = new URL(env.NEXT_PUBLIC_TELEGRAM_BOT_URL);
  deepLink.searchParams.set('startapp', buildTelegramStartParam(token));

  return NextResponse.json({
    success: true,
    alreadyLinked: false,
    deepLink: deepLink.toString(),
  });
});
