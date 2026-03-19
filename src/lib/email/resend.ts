import 'server-only';

import { Resend } from 'resend';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

function getResendClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(env.RESEND_API_KEY);
}

function getFromAddress(): string {
  if (!env.RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL is not configured');
  }
  return env.RESEND_FROM_EMAIL;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = getResendClient();
  const from = getFromAddress();

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    logger.error({ error, from, to, subject }, 'Failed to send email via Resend');
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
