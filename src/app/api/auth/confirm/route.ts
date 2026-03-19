import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import {
  consumeEmailVerificationToken,
  clearEmailVerificationTokensForUser,
} from '@/lib/auth/email-verification';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/auth/confirm?token=...
 *
 * Called when a user clicks the email verification link we send via Resend.
 * Validates the application-managed token, confirms the auth user, and
 * redirects to the login page.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  const appUrl = env.NEXT_PUBLIC_APP_URL;

  if (!token) {
    return NextResponse.redirect(new URL('/login?verified=error', appUrl));
  }

  const payload = await consumeEmailVerificationToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login?verified=error', appUrl));
  }

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(payload.userId);
  if (error || !data.user || data.user.email?.toLowerCase() !== payload.email.toLowerCase()) {
    return NextResponse.redirect(new URL('/login?verified=error', appUrl));
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(payload.userId, {
    email_confirm: true,
  });

  if (updateError) {
    return NextResponse.redirect(new URL('/login?verified=error', appUrl));
  }

  await clearEmailVerificationTokensForUser(payload.userId);

  return NextResponse.redirect(new URL('/login?verified=true', appUrl));
}
