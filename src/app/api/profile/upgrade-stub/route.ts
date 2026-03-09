import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHmac, randomUUID } from 'crypto';
import { withApiHandler } from '@/lib/api/handler';
import { AuthError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { getUserPlan } from '@/lib/subscription-utils';
import { sendVerificationEmail } from '@/lib/email';
import { FLAGS } from '@/lib/feature-flags';

const bodySchema = z.object({
  initData: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
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
    throw new AuthError({ message: 'Missing user in Telegram initData' });
  }

  return JSON.parse(userParam) as TelegramUser;
}

/**
 * POST /api/profile/upgrade-stub
 *
 * Allows a Telegram-first "stub" account to add an email address.
 * The real auth email is NOT changed until the user clicks the verification link.
 *
 * Flow (email not taken):
 *  1. Validate Telegram HMAC → get telegramId
 *  2. Find & confirm stub profile
 *  3. Check the target email is not already in auth.users
 *  4. Store pending_email + UUID token + 24h expiry in profiles (stub email unchanged)
 *  5. Send branded verification email pointing to GET /api/auth/verify-email?token=UUID
 *  6. Return { success: true } — client shows "check inbox" screen
 *
 * Flow (email taken — merge):
 *  4b. If password provided, sign in as web user, migrate themes, delete stub, issue session token
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
    throw new ValidationError({ message: 'initData and a valid email are required' });
  }

  const { initData, email, password, locale } = body.data;

  const telegramUser = validateTelegramInitData(initData, env.TELEGRAM_BOT_TOKEN);
  const telegramId = String(telegramUser.id);

  // ── 1. Find the profile that holds this telegramId ───────────────────────
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (!profile) {
    throw new AuthError({ message: 'No profile found for this Telegram account' });
  }

  // ── 2. Confirm it is a stub account ──────────────────────────────────────
  const { data: authLookup } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  const currentEmail = authLookup.user?.email ?? '';
  const isStub = currentEmail.startsWith('telegram_') && currentEmail.includes('@noreply');

  if (!isStub) {
    logger.warn({ userId: profile.id, currentEmail }, 'upgrade-stub called on a non-stub account');
    throw new AuthError({ message: 'This account already has email credentials set up' });
  }

  const stubUserId = profile.id;

  logger.info({ userId: stubUserId, telegramId, newEmail: email }, 'Attempting stub upgrade');

  // ── 3. Check if email is already taken in auth.users ─────────────────────
  let takenUserId: string | null = null;
  let page = 1;
  paginate: for (;;) {
    const { data: listPage, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (listErr) break;
    const users = listPage?.users ?? [];
    for (const u of users) {
      if (u.email === email && u.id !== stubUserId) {
        takenUserId = u.id;
        break paginate;
      }
    }
    if (users.length < 1000) break;
    page++;
  }

  // ── 4a. Email is free — store as pending, send verification link ──────────
  if (!takenUserId) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        pending_email: email,
        email_verification_token: token,
        email_verification_token_expires_at: expiresAt,
        email_unverified: true,
      })
      .eq('id', stubUserId);

    if (profileUpdateError) {
      logger.error({ profileUpdateError, stubUserId }, 'Failed to store pending email');
      throw new AuthError({ message: 'Failed to store verification data' });
    }

    await sendVerificationEmail(email, verifyUrl, locale);
    logger.info({ userId: stubUserId, email, locale }, 'Pending email stored, verification email sent');
    return NextResponse.json({ success: true });
  }

  // ── 4b. Email taken — need password to prove ownership and merge ──────────
  if (!password) {
    logger.info({ stubUserId, email }, 'Email taken — requesting password from client');
    return NextResponse.json({ conflict: true });
  }

  logger.info({ stubUserId, email }, 'Email taken — attempting sign-in for merge');

  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.user) {
    throw new AuthError({
      message: "That email is already registered. If it's yours, check your password.",
    });
  }

  const webUserId = signInData.user.id;

  // Guard: web account must not already be linked to a DIFFERENT Telegram ID
  const { data: webProfile } = await supabaseAdmin
    .from('profiles')
    .select('telegram_id')
    .eq('id', webUserId)
    .maybeSingle();

  if (webProfile?.telegram_id && webProfile.telegram_id !== telegramId) {
    throw new AuthError({
      message: 'That web account is already linked to a different Telegram account',
    });
  }

  // ── 5. Merge stub → web account ──────────────────────────────────────────
  logger.info({ stubUserId, webUserId }, 'Merging stub into web account');

  await supabaseAdmin.from('themes').update({ user_id: webUserId }).eq('user_id', stubUserId);

  const { data: stubBookmarks } = await supabaseAdmin
    .from('bookmarked_cards')
    .select('card_id')
    .eq('user_id', stubUserId);

  if (stubBookmarks?.length) {
    await supabaseAdmin.from('bookmarked_cards').upsert(
      stubBookmarks.map((b) => ({ user_id: webUserId, card_id: b.card_id })),
      { onConflict: 'user_id,card_id', ignoreDuplicates: true },
    );
  }

  await supabaseAdmin.from('profiles').update({ telegram_id: telegramId }).eq('id', webUserId);

  const [{ count: finalThemeCount }, planInfo] = await Promise.all([
    supabaseAdmin
      .from('themes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', webUserId),
    getUserPlan(webUserId),
  ]);
  const overLimit = planInfo.maxThemes !== null && (finalThemeCount ?? 0) > planInfo.maxThemes;

  await supabaseAdmin.auth.admin.deleteUser(stubUserId);

  // ── 6. Issue a signed session token for the web account ──────────────────
  const { data: webProfileData } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', webUserId)
    .single();

  const displayName =
    webProfileData?.display_name || signInData.user.email?.split('@')[0] || 'User';

  const exp = Date.now() + 2 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId: webUserId, displayName, exp })).toString(
    'base64url',
  );
  const secret = env.NEXTAUTH_SECRET ?? env.SUPABASE_SERVICE_KEY;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');

  logger.info({ stubUserId, webUserId, overLimit }, 'Stub merged into web account');
  return NextResponse.json({ sessionToken: `${payload}.${sig}`, overLimit });
});
