import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHmac } from 'crypto';
import { withApiHandler } from '@/lib/api/handler';
import { AuthError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { getUserPlan } from '@/lib/subscription-utils';

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

  const stubUserId = profile.id;

  // ── 3. Try in-place upgrade: set email + password on the stub user ─────────
  logger.info({ userId: stubUserId, telegramId, newEmail: email }, 'Attempting stub upgrade');

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(stubUserId, {
    email,
    password,
    email_confirm: true, // auto-confirm — matches registration behaviour
  });

  if (!updateError) {
    // Email wasn't taken — stub has been upgraded in-place. Ready to log in.
    logger.info({ userId: stubUserId, newEmail: email }, 'Stub successfully upgraded');
    return NextResponse.json({ success: true });
  }

  // ── 4. Email already taken → attempt to sign in and merge —————————————
  const isEmailTaken = updateError.message.toLowerCase().includes('already');
  if (!isEmailTaken) {
    throw new AuthError({ message: updateError.message });
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

  // ── 5. Merge stub → web account ———————————————————————————————————
  logger.info({ stubUserId, webUserId }, 'Merging stub into web account');

  // Move themes (cards + sources cascade via theme_id FK, not user_id)
  await supabaseAdmin.from('themes').update({ user_id: webUserId }).eq('user_id', stubUserId);

  // Move bookmarks, ignoring conflicts
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

  // Stamp telegram_id on the web account
  await supabaseAdmin.from('profiles').update({ telegram_id: telegramId }).eq('id', webUserId);

  // Check combined theme count vs plan limit
  const [{ count: finalThemeCount }, planInfo] = await Promise.all([
    supabaseAdmin
      .from('themes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', webUserId),
    getUserPlan(webUserId),
  ]);
  const overLimit = planInfo.maxThemes !== null && (finalThemeCount ?? 0) > planInfo.maxThemes;

  // Delete the stub (cascade removes its subscription/usage records)
  await supabaseAdmin.auth.admin.deleteUser(stubUserId);

  // ── 6. Issue a signed session token for the web account ——————————————
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
