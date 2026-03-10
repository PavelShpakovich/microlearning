import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const bodySchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/forgot-password
 *
 * Sends a password-reset email via Supabase.
 * Always returns { success: true } regardless of whether the email exists
 * to prevent email enumeration.
 *
 * Recovery link → /auth/callback?type=recovery → /auth/set-password
 */
export const POST = withApiHandler(async (req) => {
  // Rate limit: 3 reset requests per IP per 15 minutes
  const ip = getClientIp(req);
  const rl = checkRateLimit(`forgot-password:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.allowed) {
    // Still return success to avoid enumeration of which emails are rate-limited
    return NextResponse.json({ success: true });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({ message: 'A valid email address is required' });
  }

  const { email } = body.data;
  const appUrl = env.NEXTAUTH_URL ?? 'https://clario.app';
  const redirectTo = `${appUrl}/auth/callback?type=recovery`;

  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    // Log but don't surface — prevents enumeration
    logger.warn({ error }, 'forgot-password: resetPasswordForEmail failed');
  } else {
    logger.info({}, 'Password reset email sent');
  }

  return NextResponse.json({ success: true });
});
