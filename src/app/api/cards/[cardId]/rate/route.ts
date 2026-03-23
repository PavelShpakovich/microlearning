import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/auth';
import { withApiHandler } from '@/lib/api/handler';
import { NotFoundError, ValidationError } from '@/lib/errors';

const bodySchema = z.object({
  rating: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

export const POST = withApiHandler(async (req: Request, ctx?: unknown) => {
  const { user, supabase } = await requireAuth();
  const { params } = (ctx as { params: Promise<Record<string, string>> } | undefined) || {};
  const { cardId } = (await params) || {};

  if (!cardId || typeof cardId !== 'string') {
    throw new ValidationError({ message: 'cardId is required' });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { data: card } = await supabase.from('cards').select('id').eq('id', cardId).maybeSingle();
  if (!card) {
    throw new NotFoundError({ message: 'Card not found' });
  }

  if (body.data.rating === 0) {
    const { error } = await supabase
      .from('card_ratings')
      .delete()
      .eq('user_id', user.id)
      .eq('card_id', cardId);

    if (error) {
      throw new Error('Failed to clear card rating');
    }

    return NextResponse.json({ ok: true, rating: 0 });
  }

  const { error } = await supabase.from('card_ratings').upsert(
    {
      user_id: user.id,
      card_id: cardId,
      rating: body.data.rating,
    },
    { onConflict: 'user_id,card_id' },
  );

  if (error) {
    throw new Error('Failed to save card rating');
  }

  return NextResponse.json({ ok: true, rating: body.data.rating });
});
