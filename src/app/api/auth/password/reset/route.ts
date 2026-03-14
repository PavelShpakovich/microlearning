import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';
import { env } from '@/lib/env';
import { createSupabaseAuthClient } from '@/lib/supabase/auth-client';

const bodySchema = z.object({
  email: z.string().email(),
  locale: z.enum(['en', 'ru']).default('en'),
});

export const POST = withApiHandler(async (req) => {
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const authClient = createSupabaseAuthClient();
  const resetPath = body.data.locale === 'ru' ? '/ru/set-password' : '/set-password';
  const redirectTo = `${env.NEXT_PUBLIC_APP_URL}${resetPath}`;

  const { error } = await authClient.auth.resetPasswordForEmail(body.data.email, {
    redirectTo,
  });

  if (error) {
    throw new ValidationError({ message: error.message });
  }

  return NextResponse.json({ success: true });
});
