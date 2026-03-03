import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  cardId: z.string().uuid(),
});

export const POST = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { sessionId, cardId } = body.data;

  // Verify the session belongs to this user
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!session) {
    throw new NotFoundError({ message: 'Session not found' });
  }

  // Upsert — idempotent if called twice for the same card
  await supabase.from('session_cards').upsert(
    { session_id: sessionId, card_id: cardId, seen_at: new Date().toISOString() },
    { onConflict: 'session_id,card_id' },
  );

  return NextResponse.json({ ok: true });
});
