import 'server-only';

import { env } from '@/lib/env';
import { sendEmail } from '@/lib/email/resend';
import { renderVerifyEmailHtml, VERIFY_EMAIL_SUBJECTS } from '@/lib/email/templates/verify-email';
import { issueEmailVerificationToken } from '@/lib/auth/email-verification';
import type { Locale } from '@/i18n/config';

/**
 * Generate an application-managed email verification token and send the
 * confirmation link via Resend.
 */
export async function sendVerificationEmail({
  userId,
  email,
  locale = 'ru',
}: {
  userId: string;
  email: string;
  locale?: Locale;
}): Promise<void> {
  const token = await issueEmailVerificationToken({ userId, email });
  const confirmUrl = `${env.NEXT_PUBLIC_APP_URL}/api/auth/confirm?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to: email,
    subject: VERIFY_EMAIL_SUBJECTS[locale],
    html: renderVerifyEmailHtml({ confirmUrl, locale }),
  });
}
