import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/auth';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email/resend';
import { withApiHandler } from '@/lib/api/handler';

const FEEDBACK_TO = 'pavelekname@gmail.com';

const bodySchema = z.object({
  message: z.string().min(5, 'Too short').max(2000, 'Too long'),
});

export const POST = withApiHandler(async (req: Request) => {
  const { user } = await requireAuth();

  const rl = checkRateLimit(`feedback:${user.id}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { message } = parsed.data;
  const userEmail = (user as { email?: string }).email ?? 'unknown';
  const userName =
    (user as { name?: string; user_metadata?: { full_name?: string; name?: string } }).name ??
    (user as { user_metadata?: { full_name?: string; name?: string } }).user_metadata?.full_name ??
    userEmail;

  try {
    await sendEmail({
      to: FEEDBACK_TO,
      subject: `Clario Astrology: отзыв от ${userName}`,
      html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <h2 style="margin:0 0 16px;font-size:18px;">Новый отзыв из Clario Astrology</h2>
        <table style="font-size:13px;color:#555;border-collapse:collapse;width:100%;margin-bottom:20px;">
          <tr><td style="padding:4px 12px 4px 0;white-space:nowrap;font-weight:600;">От</td><td>${userName} &lt;${userEmail}&gt;</td></tr>
          <tr><td style="padding:4px 12px 4px 0;white-space:nowrap;font-weight:600;">Дата</td><td>${new Date().toLocaleString('ru')}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;" />
        <p style="white-space:pre-wrap;font-size:15px;line-height:1.7;margin:0;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
    `,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Email send failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
