import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { MAX_CARDS_PER_SESSION_FETCH } from '@/lib/constants';
import { GenerationService } from '@/services/generation.service';
import { getSubscriptionStatus } from '@/lib/subscription-utils';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  sessionId: z.string().uuid(),
  themeId: z.string().uuid(),
  triggerGeneration: z.enum(['0', '1']).optional(),
  count: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const GET = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const { searchParams } = new URL(req.url);
  const query = querySchema.safeParse({
    sessionId: searchParams.get('sessionId'),
    themeId: searchParams.get('themeId'),
    triggerGeneration: searchParams.get('triggerGeneration') ?? undefined,
    count: searchParams.get('count') ?? undefined,
  });

  if (!query.success) {
    throw new ValidationError({
      message: query.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { sessionId, themeId, triggerGeneration, count } = query.data;

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
  let limitReached = false;

  if (shouldTriggerGeneration) {
    // Client-triggered generation: the user has scrolled near the end of their deck.
    // We only need to guard against an already-in-progress generation and quota.
    // We intentionally bypass the server-side threshold (checkShouldGenerate) here —
    // that guard is designed for automatic background triggers, not explicit requests.
    const [dbIsAlreadyGenerating, isFailed, subscription] = await Promise.all([
      GenerationService.isGenerating(themeId),
      GenerationService.isGenerationFailed(themeId),
      getSubscriptionStatus(user.id),
    ]);

    const canGenerate = subscription.cardsRemaining > 0;
    const cardsRemaining = subscription.cardsRemaining;

    if (isFailed) {
      await GenerationService.clearFailureFlag(themeId);
      generationFailed = false;
    } else {
      generationFailed = false;
    }

    if (dbIsAlreadyGenerating) {
      // Already generating — just tell the client to keep polling
      isGenerating = true;
      logger.info({ themeId }, 'Generation already in progress, client should poll');
    } else if (!canGenerate) {
      isGenerating = false;
      limitReached = true;
      logger.info(
        { themeId, userId: user.id },
        'Skipping client-triggered generation — user has reached their monthly card limit',
      );
    } else {
      // Start generation
      await GenerationService.markGenerationStarted(themeId);
      isGenerating = true;

      after(async () => {
        await GenerationService.doGenerate(user.id, themeId, count).catch((err: unknown) => {
          logger.error({ themeId, err }, 'Background generation failed');
        });
      });

      logger.info({ themeId }, 'Triggering card generation in background (client-requested)');
    }

    return NextResponse.json(
      {
        cards: cards ?? [],
        remaining,
        generating: isGenerating,
        generationFailed,
        limitReached,
        cardsRemaining,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    );
  } else {
    const [dbIsGenerating, isFailed, subscription] = await Promise.all([
      GenerationService.isGenerating(themeId),
      GenerationService.isGenerationFailed(themeId),
      getSubscriptionStatus(user.id),
    ]);

    const cardsRemaining = subscription.cardsRemaining;

    generationFailed = isFailed;

    // If the DB flag says generating but the user has no quota, it's a stale flag
    // (doGenerate would have returned early without clearing it). Clear it now so
    // the client polling loop doesn't get stuck on generating=true forever.
    if (subscription.cardsRemaining === 0) {
      if (dbIsGenerating) {
        await GenerationService.clearState(themeId);
      }
      isGenerating = false;
      limitReached = true;
      logger.info({ themeId, userId: user.id }, 'Non-trigger fetch: user has no quota remaining');
    } else {
      isGenerating = dbIsGenerating;
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
        limitReached,
        cardsRemaining,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    );
  }
});
