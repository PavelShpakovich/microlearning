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
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  let userId: string;

  if (existingProfile) {
    userId = existingProfile.id;
  } else {
    // Create a new Supabase Auth user for this Telegram account
    const email = `telegram_${telegramId}@noreply.clario.app`;
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { telegram_id: telegramId, source: 'telegram' },
    });

    if (error || !newUser?.user) {
      // The user might already exist in auth.users (e.g. after the profiles table
      // was reset while auth.users was preserved).  Try to recover their account.
      const isAlreadyExists =
        error?.status === 422 ||
        error?.message?.toLowerCase().includes('already') ||
        error?.message?.toLowerCase().includes('registered');

      if (!isAlreadyExists) {
        throw new AuthError({ message: 'Failed to create user account', cause: error });
      }

      // Paginate through auth users to find the one with this email.
      let recovered: string | null = null;
      let page = 1;
      outer: while (page <= 20) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 50,
        });
        if (!listData?.users?.length) break;
        for (const u of listData.users) {
          if (u.email === email) {
            recovered = u.id;
            break outer;
          }
        }
        if (listData.users.length < 50) break;
        page++;
      }

      if (!recovered) {
        throw new AuthError({ message: 'Failed to create user account', cause: error });
      }

      userId = recovered;
    } else {
      userId = newUser.user.id;
    }

    // Upsert profile — covers both fresh creation and recovery after a table reset.
    await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        telegram_id: telegramId,
        display_name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' '),
      },
      { onConflict: 'id' },
    );
  }

  // Fetch display name + auth email for the NextAuth session
  const [{ data: profile }, { data: authLookup }] = await Promise.all([
    supabaseAdmin.from('profiles').select('display_name').eq('id', userId).single(),
    supabaseAdmin.auth.admin.getUserById(userId),
  ]);

  const displayName =
    profile?.display_name ||
    [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') ||
    'Telegram User';

  // needsEmail = true when the account is still a stub (no real email set yet)
  const currentEmail = authLookup.user?.email ?? '';
  const needsEmail = currentEmail.startsWith('telegram_') && currentEmail.includes('@noreply');

  // Issue a short-lived signed handoff token so the browser can open a
  // NextAuth session without ever touching the Supabase browser client.
  // Valid for 2 minutes — enough to survive any network latency.
  const exp = Date.now() + 2 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, displayName, exp })).toString('base64url');
  const secret = env.NEXTAUTH_SECRET ?? env.SUPABASE_SERVICE_KEY;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');

  return NextResponse.json({ sessionToken: `${payload}.${sig}`, needsEmail });
});
