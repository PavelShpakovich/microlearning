import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';

const bodySchema = z.object({
  locale: z.enum(['ru', 'en']),
});

export const POST = withApiHandler(async (req) => {
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('NEXT_LOCALE', body.data.locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  return response;
});
