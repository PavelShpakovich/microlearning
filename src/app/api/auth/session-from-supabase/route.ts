import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { withApiHandler } from '@/lib/api/handler';
import { AuthError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * POST /api/auth/session-from-supabase
 *
 * Bridges a Supabase magic-link / OTP session into a NextAuth JWT session.
 *
 * Called by /auth/callback after supabase.auth.verifyOtp() succeeds.
 * The Supabase session cookie is already set at that point — this route
 * reads it server-side, resolves the profile, and issues the signed
 * NextAuth handoff token that /app/tg/page.tsx uses.
 *
 * No request body needed — the Supabase session is in the cookie.
 */
export const POST = withApiHandler(async () => {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // read-only here — we just need the session
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    logger.warn({ error }, 'session-from-supabase: no active Supabase session');
    throw new AuthError({ message: 'No active Supabase session found' });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';

  // Issue a 2-minute NextAuth handoff token (same format as /api/auth/telegram)
  const exp = Date.now() + 2 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId: user.id, displayName, exp })).toString(
    'base64url',
  );
  const secret = env.NEXTAUTH_SECRET ?? env.SUPABASE_SERVICE_KEY;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');

  logger.info({ userId: user.id }, 'NextAuth session token issued from Supabase OTP session');
  return NextResponse.json({ sessionToken: `${payload}.${sig}` });
});
