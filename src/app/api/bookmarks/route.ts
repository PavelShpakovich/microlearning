import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';

const bookmarkSchema = z.object({
  cardId: z.string().uuid(),
});

export const POST = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const body = bookmarkSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { cardId } = body.data;

  // Check if bookmark exists
  const { data: existing } = await (supabase as any)
    .from('bookmarked_cards')
    .select('id')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .maybeSingle();

  if (existing) {
    // Remove bookmark
    const { error } = await (supabase as any)
      .from('bookmarked_cards')
      .delete()
      .eq('user_id', user.id)
      .eq('card_id', cardId);

    if (error) {
      throw new Error('Failed to remove bookmark');
    }

    return NextResponse.json({ bookmarked: false });
  } else {
    // Add bookmark
    const { error } = await (supabase as any)
      .from('bookmarked_cards')
      .insert({ user_id: user.id, card_id: cardId });

    if (error) {
      throw new Error('Failed to add bookmark');
    }

    return NextResponse.json({ bookmarked: true });
  }
});

export const GET = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  // Get card ID from query params
  const url = new URL(req.url);
  const cardId = url.searchParams.get('cardId');

  if (!cardId) {
    throw new ValidationError({ message: 'cardId query parameter is required' });
  }

  const { data: bookmark } = await (supabase as any)
    .from('bookmarked_cards')
    .select('id')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .maybeSingle();

  return NextResponse.json({ bookmarked: !!bookmark });
});
