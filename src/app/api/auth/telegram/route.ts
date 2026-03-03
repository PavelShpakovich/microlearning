import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHmac } from 'crypto';
import { withApiHandler } from '@/lib/api/handler';
import { AuthError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

const bodySchema = z.object({
  initData: z.string().min(1),
});

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

/**
 * Validates Telegram initData HMAC signature.
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateTelegramInitData(initData: string, botToken: string): TelegramUser {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');

  if (!hash) {
    throw new AuthError({ message: 'Missing hash in Telegram initData' });
  }

  params.delete('hash');

  const sortedParams = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = createHmac('sha256', secretKey).update(sortedParams).digest('hex');

  if (expectedHash !== hash) {
    throw new AuthError({ message: 'Telegram initData HMAC verification failed' });
  }

  const userParam = params.get('user');
  if (!userParam) {
    throw new AuthError({ message: 'No user in Telegram initData' });
  }

  return JSON.parse(userParam) as TelegramUser;
}

export const POST = withApiHandler(async (req) => {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new AuthError({ message: 'Telegram auth is not configured on this server' });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({ message: 'initData is required' });
  }

  const telegramUser = validateTelegramInitData(body.data.initData, env.TELEGRAM_BOT_TOKEN);
  const telegramId = String(telegramUser.id);

  // Look up existing user by telegram_id in profiles table
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  let userId: string;

  if (profile) {
    userId = profile.id;
  } else {
    // Create a new Supabase Auth user for this Telegram account
    const email = `telegram_${telegramId}@noreply.microlearning.app`;
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { telegram_id: telegramId, source: 'telegram' },
    });

    if (error ?? !newUser.user) {
      throw new AuthError({ message: 'Failed to create user account', cause: error });
    }

    userId = newUser.user.id;

    await supabaseAdmin.from('profiles').insert({
      id: userId,
      telegram_id: telegramId,
      display_name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' '),
    });
  }

  const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (getUserError ?? !authUser.user?.email) {
    throw new AuthError({ message: 'Failed to retrieve user account', cause: getUserError });
  }

  // Generate a magic link for the user — extract the access/refresh tokens from the URL
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.user.email,
    options: { redirectTo: `${process.env['NEXTAUTH_URL'] ?? 'http://localhost:3000'}/auth/callback` },
  });

  if (linkError ?? !linkData?.properties?.hashed_token) {
    throw new AuthError({ message: 'Failed to create login session', cause: linkError });
  }

  return NextResponse.json({
    hashedToken: linkData.properties.hashed_token,
    email: authUser.user.email,
  });
});
