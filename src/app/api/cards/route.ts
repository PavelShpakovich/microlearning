import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { CARD_GENERATION_THRESHOLD, MAX_CARDS_PER_BATCH } from '@/lib/constants';
import { GenerationService } from '@/services/generation.service';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  sessionId: z.string().uuid(),
  themeId: z.string().uuid(),
});

export const GET = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const { searchParams } = new URL(req.url);
  const query = querySchema.safeParse({
    sessionId: searchParams.get('sessionId'),
    themeId: searchParams.get('themeId'),
  });

  if (!query.success) {
    throw new ValidationError({
      message: query.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { sessionId, themeId } = query.data;

  // Verify session belongs to this user
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!session) {
    throw new NotFoundError({ message: 'Session not found' });
  }

  // Fetch UP TO 5 unseen cards using LEFT JOIN pattern
  // Order by created_at to ensure we get NEW cards in sequence
  const { data: cards } = await supabase
    .from('cards')
    .select('*, session_cards!left(card_id)')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq('theme_id', themeId)
    .is('session_cards.card_id', null)
    .order('created_at', { ascending: true })
    .limit(5);

  // Count remaining UNSEEN cards in this session
  const { count: remainingCount } = await supabase
    .from('cards')
    .select('*, session_cards!left(card_id)', { count: 'exact', head: true })
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq('theme_id', themeId)
    .is('session_cards.card_id', null);

  const remaining = remainingCount ?? 0;

  // Check generation status and trigger if needed
  const isGenerating = GenerationService.maybeStartGeneration(
    user.id,
    themeId,
    remaining,
    CARD_GENERATION_THRESHOLD,
  );

  logger.info(
    { themeId, remaining, isGenerating, cardCount: cards?.length },
    'Cards fetched',
  );

  return NextResponse.json({ cards: cards ?? [], remaining, generating: isGenerating });
});
