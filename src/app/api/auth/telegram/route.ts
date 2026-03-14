import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHmac } from 'crypto';
import { withApiHandler } from '@/lib/api/handler';
import { AuthError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import {
  ensureSupabaseIdentityLink,
  ensureTelegramIdentityLink,
  resolveUserIdByTelegramId,
} from '@/lib/auth/account-identities';
import { consumeTelegramLinkToken, parseTelegramStartParam } from '@/lib/auth/telegram-link';

const bodySchema = z.object({
  initData: z.string().min(1),
  startParam: z.string().optional(),
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
  const linkToken = parseTelegramStartParam(body.data.startParam);

  let userId: string;
  const existingUserId = await resolveUserIdByTelegramId(telegramId);

  if (existingUserId) {
    userId = existingUserId;
  } else if (linkToken) {
    const linkedUserId = await consumeTelegramLinkToken(linkToken);
    if (!linkedUserId) {
      throw new AuthError({ message: 'Telegram linking link is invalid or expired' });
    }

    userId = linkedUserId;

    const { error: upsertErr } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        telegram_id: telegramId,
      },
      { onConflict: 'id' },
    );

    if (upsertErr) {
      throw new AuthError({ message: 'Failed to update linked profile', cause: upsertErr });
    }
  } else {
    // No profile row yet — the user might still exist in auth.users if the
    // profiles table was reset while auth.users was preserved.
    const email = `telegram_${telegramId}@noreply.clario.app`;

    // ── Step 1: probe auth.users by email ──────────────────────────────────
    // We scan in pages of 1 000 (well within Supabase's max) until we either
    // find the email or exhaust the list.  This avoids relying on createUser's
    // error message / status code for "already exists" detection.
    let existingAuthUserId: string | null = null;

    let page = 1;
    paginate: for (;;) {
      const { data: listPage, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (listErr) {
        logger.warn({ listErr, telegramId }, 'telegram-auth: listUsers error during email probe');
        break;
      }

      const users = listPage?.users ?? [];
      for (const u of users) {
        if (u.email === email) {
          existingAuthUserId = u.id;
          break paginate;
        }
      }

      // Supabase returns the total count in nextPage/lastPage helpers; if the
      // page we just received is smaller than perPage we've seen everything.
      if (users.length < 1000) break;
      page++;
    }

    // ── Step 2: create or reuse the auth user ──────────────────────────────
    if (existingAuthUserId) {
      logger.info(
        { telegramId, existingAuthUserId },
        'telegram-auth: recovered existing auth user — restoring profile',
      );
      userId = existingAuthUserId;
    } else {
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { telegram_id: telegramId, source: 'telegram' },
      });

      if (createErr || !newUser?.user) {
        logger.error({ createErr, telegramId }, 'telegram-auth: failed to create auth user');
        throw new AuthError({ message: 'Failed to create user account', cause: createErr });
      }

      userId = newUser.user.id;
      logger.info({ telegramId, userId }, 'telegram-auth: created new auth user');
    }

    await ensureSupabaseIdentityLink(userId, email);

    // ── Step 3: ensure the profile row exists ──────────────────────────────
    const { error: upsertErr } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        telegram_id: telegramId,
        display_name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' '),
      },
      { onConflict: 'id' },
    );

    if (upsertErr) {
      logger.error({ upsertErr, userId, telegramId }, 'telegram-auth: profile upsert failed');
      throw new AuthError({ message: 'Failed to initialise user profile', cause: upsertErr });
    }
  }

  try {
    await ensureTelegramIdentityLink(
      userId,
      telegramId,
      [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' '),
    );
  } catch (error) {
    logger.error({ error, userId, telegramId }, 'telegram-auth: failed to sync telegram identity');
    throw new AuthError({ message: 'Failed to initialise Telegram identity link', cause: error });
  }

  // Fetch display name for the NextAuth session
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single();

  const displayName =
    profile?.display_name ||
    [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') ||
    'Telegram User';

  const exp = Date.now() + 2 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, displayName, exp, isStub: false })).toString(
    'base64url',
  );
  const secret = env.NEXTAUTH_SECRET;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');

  return NextResponse.json({ sessionToken: `${payload}.${sig}`, needsEmail: false });
});
