import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHmac, randomUUID } from 'crypto';
import { withApiHandler } from '@/lib/api/handler';
import { AuthError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { sendVerificationEmail } from '@/lib/email';
import { FLAGS } from '@/lib/feature-flags';

const bodySchema = z.object({
  initData: z.string().min(1),
  locale: z.enum(['en', 'ru']).default('en'),
});

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

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

/**
 * POST /api/profile/resend-verification
 *
 * Re-sends the verification email for a pending email upgrade.
 * Generates a fresh UUID token with a new 24-hour expiry.
 *
 * Body: { initData: string, locale: 'en' | 'ru' }
 */
export const POST = withApiHandler(async (req) => {
  if (!FLAGS.EMAIL_UPGRADE_ENABLED) {
    return NextResponse.json({ error: 'Email upgrade is not enabled' }, { status: 410 });
  }

  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new AuthError({ message: 'Telegram auth is not configured on this server' });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({ message: 'initData is required' });
  }

  const { initData, locale } = body.data;

  const telegramUser = validateTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
  const telegramId = String(telegramUser.id);

  // Find profile with a pending email
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, pending_email')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new AuthError({ message: 'No profile found for this Telegram account' });
  }

  if (!profile.pending_email) {
    throw new ValidationError({ message: 'No pending email to resend verification for' });
  }

  // Generate fresh token + 24h expiry
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      email_verification_token: token,
      email_verification_token_expires_at: expiresAt,
    })
    .eq('id', profile.id);

  if (updateError) {
    logger.error({ updateError, userId: profile.id }, 'resend-verification: failed to update token');
    throw new AuthError({ message: 'Failed to generate new verification token' });
  }

  await sendVerificationEmail(profile.pending_email, verifyUrl, locale);

  logger.info({ userId: profile.id, email: profile.pending_email, locale }, 'Resent verification email');
  return NextResponse.json({ success: true });
});
