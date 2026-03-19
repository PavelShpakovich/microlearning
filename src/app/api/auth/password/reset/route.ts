import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import {
  renderResetPasswordHtml,
  RESET_PASSWORD_SUBJECTS,
} from '@/lib/email/templates/reset-password';
import { logger } from '@/lib/logger';

const bodySchema = z.object({
  email: z.string().email(),
  locale: z.enum(['en', 'ru']).default('ru'),
});

export const POST = withApiHandler(async (req) => {
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { email, locale } = body.data;

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/set-password`,
    },
  });

  if (error || !data?.properties?.action_link) {
    // Log internally but return success to the client — never reveal whether
    // an email address is registered.
    logger.error({ error, email }, 'Failed to generate password reset link');
    return NextResponse.json({ success: true });
  }

  await sendEmail({
    to: email,
    subject: RESET_PASSWORD_SUBJECTS[locale],
    html: renderResetPasswordHtml({ resetUrl: data.properties.action_link, locale }),
  });

  return NextResponse.json({ success: true });
});
