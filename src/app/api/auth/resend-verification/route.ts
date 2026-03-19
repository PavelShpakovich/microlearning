import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { findAuthUserByEmail } from '@/lib/auth/user-accounts';
import { sendVerificationEmail } from '@/lib/email/send-verification';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const bodySchema = z.object({
  email: z.string().email(),
});

export const POST = withApiHandler(async (req) => {
  const locale = (await cookies()).get('NEXT_LOCALE')?.value === 'en' ? 'en' : 'ru';
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`resend-verification:${ip}`, 3, 60_000);

  // Always return success — even when rate-limited — to avoid leaking information.
  if (!allowed) {
    return NextResponse.json({ success: true });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    // Return success even on bad input to avoid leaking email existence.
    return NextResponse.json({ success: true });
  }

  const email = body.data.email.trim().toLowerCase();
  const user = await findAuthUserByEmail(email);

  // Only resend if the user exists and has not yet confirmed their email.
  if (user && !user.emailConfirmedAt) {
    await sendVerificationEmail({ userId: user.id, email, locale });
  }

  return NextResponse.json({ success: true });
});
