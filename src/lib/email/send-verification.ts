import 'server-only';

import { nanoid } from 'nanoid';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { sendEmail } from '@/lib/email/resend';
import { renderVerifyEmailHtml, VERIFY_EMAIL_SUBJECTS } from '@/lib/email/templates/verify-email';
import { logger } from '@/lib/logger';
import type { Locale } from '@/i18n/config';

/**
 * Generate a Supabase signup verification token for `email` and send the
 * confirmation link via Resend.
 *
 * For brand-new users pass `password` so Supabase can create the user if it
 * does not yet exist. For existing unconfirmed users the password field is
 * ignored by Supabase (it does not update the stored password) — in that case
 * a random placeholder is supplied to satisfy the API.
 */
export async function sendVerificationEmail({
  email,
  password,
  locale = 'ru',
}: {
  email: string;
  password?: string;
  locale?: Locale;
}): Promise<void> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
    // For existing unconfirmed users Supabase ignores this value and does NOT
    // update the password. We pass a random string to satisfy the required field.
    password: password ?? nanoid(32),
  });

  if (error || !data?.properties?.hashed_token) {
    logger.error({ error, email }, 'Failed to generate email verification link');
    throw new Error('Failed to generate verification link');
  }

  const tokenHash = data.properties.hashed_token;
  const confirmUrl = `${env.NEXT_PUBLIC_APP_URL}/api/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=signup`;

  await sendEmail({
    to: email,
    subject: VERIFY_EMAIL_SUBJECTS[locale],
    html: renderVerifyEmailHtml({ confirmUrl, locale }),
  });
}
