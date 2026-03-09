import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { FLAGS } from '@/lib/feature-flags';

/**
 * GET /api/auth/verify-email?token=UUID
 *
 * Validates a pending email verification token, updates auth.users with the
 * verified email, clears the pending columns in profiles, and issues a
 * short-lived signed session token so the browser can open a NextAuth session
 * without requiring the user to log in again.
 *
 * On success  → redirect to /auth/callback?email_verified=1&sessionToken=<token>
 * On failure  → redirect to /tg/upgrade?error=token_expired
 */
export async function GET(request: NextRequest) {
  if (!FLAGS.EMAIL_UPGRADE_ENABLED) {
    return NextResponse.json({ error: 'Email upgrade is not enabled' }, { status: 410 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/tg/upgrade?error=token_expired', request.url));
  }

  // Look up the profile with this token that hasn't expired yet
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, pending_email, email_verification_token_expires_at, display_name')
    .eq('email_verification_token', token)
    .maybeSingle();

  if (profileError) {
    logger.error({ profileError, token }, 'verify-email: DB error on token lookup');
    return NextResponse.redirect(new URL('/tg/upgrade?error=token_expired', request.url));
  }

  if (!profile || !profile.pending_email) {
    logger.warn({ token }, 'verify-email: token not found or no pending_email');
    return NextResponse.redirect(new URL('/tg/upgrade?error=token_expired', request.url));
  }

  // Check expiry
  const expiresAt = profile.email_verification_token_expires_at
    ? new Date(profile.email_verification_token_expires_at)
    : null;

  if (!expiresAt || expiresAt < new Date()) {
    logger.warn({ token, userId: profile.id }, 'verify-email: token expired');
    return NextResponse.redirect(new URL('/tg/upgrade?error=token_expired', request.url));
  }

  // ── 1. Set the real email on the auth user ────────────────────────────────
  const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    email: profile.pending_email,
    email_confirm: true,
  });

  if (updateAuthError) {
    logger.error({ updateAuthError, userId: profile.id }, 'verify-email: failed to update auth email');
    return NextResponse.redirect(new URL('/tg/upgrade?error=token_expired', request.url));
  }

  // ── 2. Clear pending columns in profiles ──────────────────────────────────
  const { error: clearError } = await supabaseAdmin
    .from('profiles')
    .update({
      pending_email: null,
      email_verification_token: null,
      email_verification_token_expires_at: null,
      email_unverified: false,
    })
    .eq('id', profile.id);

  if (clearError) {
    logger.error({ clearError, userId: profile.id }, 'verify-email: failed to clear pending fields');
    // Auth email already updated — don't fail the user over a cleanup error
  }

  logger.info({ userId: profile.id, email: profile.pending_email }, 'verify-email: email verified successfully');

  // ── 3. Issue a short-lived session token so NextAuth can log the user in ──
  const displayName = profile.display_name ?? profile.pending_email.split('@')[0];
  const exp = Date.now() + 2 * 60 * 1000; // 2 minutes
  const payload = Buffer.from(
    JSON.stringify({ userId: profile.id, displayName, exp, isStub: false }),
  ).toString('base64url');
  const secret = env.NEXTAUTH_SECRET ?? env.SUPABASE_SERVICE_KEY;
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  const sessionToken = `${payload}.${sig}`;

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const redirectUrl = `${appUrl}/auth/callback?email_verified=1&sessionToken=${encodeURIComponent(sessionToken)}`;

  return NextResponse.redirect(redirectUrl);
}
