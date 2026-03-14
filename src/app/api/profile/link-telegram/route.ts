import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { env } from '@/lib/env';
import { createTelegramLinkToken, buildTelegramStartParam } from '@/lib/auth/telegram-link';
import { getTelegramIdForUser } from '@/lib/auth/account-identities';

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
