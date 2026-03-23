import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';

export const GET = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();
  const { searchParams } = new URL(req.url);
  const themeId = searchParams.get('themeId');

  if (!themeId) {
    throw new ValidationError({ message: 'themeId is required' });
  }

  const { data, error } = await supabase
    .from('card_ratings')
    .select('card_id, rating, cards!inner(theme_id)')
    .eq('user_id', user.id)
    .eq('cards.theme_id', themeId);

  if (error) {
    throw new Error('Failed to load card ratings');
  }

  const ratings = Object.fromEntries((data ?? []).map((row) => [row.card_id, row.rating]));
  return NextResponse.json({ ratings });
});
