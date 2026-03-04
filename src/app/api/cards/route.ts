import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { CARD_GENERATION_THRESHOLD, MAX_CARDS_PER_SESSION_FETCH } from '@/lib/constants';
import { GenerationService } from '@/services/generation.service';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  sessionId: z.string().uuid(),
  themeId: z.string().uuid(),
  triggerGeneration: z.enum(['0', '1']).optional(),
});

export const GET = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const { searchParams } = new URL(req.url);
  const query = querySchema.safeParse({
    sessionId: searchParams.get('sessionId'),
    themeId: searchParams.get('themeId'),
    triggerGeneration: searchParams.get('triggerGeneration') ?? undefined,
  });

  if (!query.success) {
    throw new ValidationError({
      message: query.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { sessionId, themeId, triggerGeneration } = query.data;

  // Verify session belongs to this user
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .limit(1);

  if (!sessions?.[0]) {
    throw new NotFoundError({ message: 'Session not found' });
  }

  logger.info({ sessionId, themeId }, 'Fetching cards for theme');

  // Fetch ALL cards for this theme — seen status is tracked in session_cards for
  // analytics/streak but must NOT hide cards from the study view.
  // (Previously, seen cards were filtered out, which caused users to see fewer
  //  cards than the theme actually contains when returning to a session same day.)
  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('*')
    .eq('theme_id', themeId)
    .order('created_at', { ascending: true })
    .limit(MAX_CARDS_PER_SESSION_FETCH);

  if (cardsError) {
    logger.error({ cardsError, themeId, sessionId }, 'Failed to fetch cards');
    throw new Error('Failed to fetch cards');
  }

  // remaining = total cards in theme (used to decide whether to trigger generation)
  const { count: remainingCount, error: remainingError } = await supabase
    .from('cards')
    .select('id', { count: 'exact', head: true })
    .eq('theme_id', themeId);

  if (remainingError) {
    logger.error({ remainingError, themeId }, 'Failed to count remaining cards');
    throw new Error('Failed to count remaining cards');
  }

  const remaining = remainingCount ?? 0;

  // Trigger generation only when client explicitly requests it
  const shouldTriggerGeneration = triggerGeneration === '1';

  let isGenerating: boolean;
  let generationFailed: boolean;

  if (shouldTriggerGeneration) {
    const [checkResult, isFailed] = await Promise.all([
      GenerationService.checkShouldGenerate(themeId, remaining, CARD_GENERATION_THRESHOLD),
      GenerationService.isGenerationFailed(themeId),
    ]);

    // For explicit retry attempts, clear the failure cooldown so user can retry
    // immediately without waiting for the 60-second recovery window
    if (isFailed) {
      await GenerationService.clearFailureFlag(themeId);
      generationFailed = false;
    } else {
      generationFailed = isFailed;
    }

    isGenerating = checkResult.isGenerating;

    if (checkResult.shouldGenerate || isFailed) {
      // Write generation_started_at to DB NOW (before response) so every instance
      // sees generating=true on the very next poll.
      await GenerationService.markGenerationStarted(themeId);
      isGenerating = true;

      // Use next/server after() so Vercel keeps the lambda alive for the full
      // generation run even after the HTTP response has been sent.
      after(async () => {
        await GenerationService.doGenerate(user.id, themeId).catch((err: unknown) => {
          logger.error({ themeId, err }, 'Background generation failed');
        });
      });

      logger.info({ themeId }, 'Triggering card generation in background');
    }
  } else {
    [isGenerating, generationFailed] = await Promise.all([
      GenerationService.isGenerating(themeId),
      GenerationService.isGenerationFailed(themeId),
    ]);
  }

  logger.info(
    {
      themeId,
      remaining,
      isGenerating,
      generationFailed,
      cardCount: cards?.length,
      shouldTriggerGeneration,
    },
    'Cards fetched',
  );

  return NextResponse.json(
    {
      cards: cards ?? [],
      remaining,
      generating: isGenerating,
      generationFailed,
    },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  );
});
