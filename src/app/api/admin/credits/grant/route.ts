import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { addCredits } from '@/lib/credits/service';
import { ADMIN_CREDIT_ADJUSTMENT_MAX } from '@/lib/constants';

const grantSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().min(1).max(ADMIN_CREDIT_ADJUSTMENT_MAX),
  note: z.string().max(500).optional(),
});

export const POST = withApiHandler(async (req: Request) => {
  await requireAdmin();

  const parsed = grantSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 422 },
    );
  }

  const { userId, amount, note } = parsed.data;
  const result = await addCredits(userId, amount, 'admin_grant', { note: note ?? undefined });

  return NextResponse.json({
    success: true,
    newBalance: result.newBalance,
    transactionId: result.transactionId,
  });
});
