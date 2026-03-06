import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHmac } from 'crypto';
import { withApiHandler } from '@/lib/api/handler';
import { AuthError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const bodySchema = z.object({
  initData: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
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
    throw new AuthError({ message: 'Missing user in Telegram initData' });
  }

  return JSON.parse(userParam) as TelegramUser;
}

/**
 * POST /api/profile/upgrade-stub
 *
 * Upgrades a Telegram-first "stub" account to a full account with email + password.
 * Because the stub and the final account share the same user ID, all themes/cards
 * stay in place — only the auth credentials change.
 *
 * Body: { initData: string, email: string, password: string }
 *
 * Flow:
 *  1. Validate Telegram HMAC → get telegramId
 *  2. Find the stub profile that owns this telegramId
 *  3. Confirm it is actually a stub (email starts with telegram_)
 *  4. Check the target email is not already taken by another account
 *  5. Update the stub's email + password in Supabase Auth (same userId — no migration!)
 *  6. Return success; client prompts user to check email for verification
 */
export const POST = withApiHandler(async (req) => {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new AuthError({ message: 'Telegram auth is not configured on this server' });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: 'initData, email, and password (min 6 chars) are required',
    });
  }

  const { initData, email, password } = body.data;

  const telegramUser = validateTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
  const telegramId = String(telegramUser.id);

  // ── 1. Find the profile that holds this telegramId ───────────────────────
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!profile) {
    // Should never happen (user is authenticated), but guard anyway.
    throw new AuthError({ message: 'No profile found for this Telegram account' });
  }

  // ── 2. Fetch the auth user to confirm it's a stub ────────────────────────
  const { data: authLookup } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  const currentEmail = authLookup.user?.email ?? '';
  const isStub = currentEmail.startsWith('telegram_') && currentEmail.includes('@noreply');

  if (!isStub) {
    logger.warn({ userId: profile.id, currentEmail }, 'upgrade-stub called on a non-stub account');
    throw new AuthError({ message: 'This account already has email credentials set up' });
  }

  // ── 3. In-place upgrade: update email + password (same userId, no migration!) ──
  logger.info({ userId: profile.id, telegramId, newEmail: email }, 'Upgrading stub account');

  const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    email,
    password,
    email_confirm: false, // require the user to verify their email
  });

  if (error) {
    logger.error({ userId: profile.id, error: error.message }, 'Failed to upgrade stub');
    // Surface a friendly message for the most common failure — email already in use.
    const msg = error.message.toLowerCase().includes('already')
      ? 'This email address is already registered'
      : error.message;
    throw new AuthError({ message: msg });
  }

  return NextResponse.json({ success: true });
});
