import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { clearEmailVerificationTokensForUser } from '@/lib/auth/email-verification';
import { ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/auth/password/confirm-reset
 *
 * Called by SetPasswordForm immediately after a successful password update via
 * the recovery flow. Confirms the user's email if it wasn't already confirmed,
 * since completing the password reset proves the user has access to their inbox.
 *
 * Secured by verifying the Supabase access token passed in the Authorization
 * header — no service-role trust is extended beyond what the token proves.
 */
export const POST = withApiHandler(async (req) => {
  const authHeader = req.headers.get('authorization') ?? '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!accessToken) {
    throw new ValidationError({ message: 'Missing access token' });
  }

  // Verify the token is legitimately issued by Supabase (not forged).
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userData.user) {
    throw new ValidationError({ message: 'Invalid or expired access token' });
  }

  const userId = userData.user.id;

  // Only confirm if not already confirmed — idempotent.
  if (!userData.user.email_confirmed_at) {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (updateError) {
      throw new ValidationError({ message: 'Failed to confirm email' });
    }
  }

  await clearEmailVerificationTokensForUser(userId);

  return NextResponse.json({ success: true });
});
