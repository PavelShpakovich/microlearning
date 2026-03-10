import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, RateLimitError, ValidationError } from '@/lib/errors';
import { generateWithSourceChunking } from '@/services/generation.service';
import { getSubscriptionStatus, incrementCardCount } from '@/lib/subscription-utils';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import {
  RATE_LIMIT_GENERATE_RPM,
  MAX_CARDS_PER_BATCH,
  MAX_USER_CARD_REQUEST,
} from '@/lib/constants';

const bodySchema = z.object({
  themeId: z.string().uuid(),
  sourceIds: z.array(z.string().uuid()).optional(),
  count: z.number().int().min(1).max(MAX_USER_CARD_REQUEST).default(MAX_CARDS_PER_BATCH),
});

/** Simple in-memory rate limiter (per process). For multi-instance, swap for Redis/Vercel KV. */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const windowMs = 60_000;
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= RATE_LIMIT_GENERATE_RPM) {
    throw new RateLimitError({
      message: `Rate limit exceeded: max ${RATE_LIMIT_GENERATE_RPM} generation requests per minute`,
    });
  }

  entry.count += 1;
}

export const POST = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  checkRateLimit(user.id);

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { themeId, sourceIds, count } = body.data;

  // Check usage limits
  const subscription = await getSubscriptionStatus(user.id);
  if (!subscription.canGenerate) {
    return NextResponse.json({ errorCode: 'GENERATION_LIMIT_REACHED' }, { status: 400 });
  }

  // Cap to cardsRemaining if the user requested more than they have left.
  // Return a machine-readable warning code so the client can translate it.
  const effectiveCount = Math.min(count, subscription.cardsRemaining);
  const partialWarning =
    effectiveCount < count
      ? {
          warningCode: 'PARTIAL_GENERATION',
          warningMeta: { generated: effectiveCount, requested: count },
        }
      : null;

  // Verify theme belongs to this user
  const { data: theme } = await supabase
    .from('themes')
    .select('name, description, language')
    .eq('id', themeId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!theme) throw new NotFoundError({ message: 'Theme not found' });

  // Enrich with source text: use the provided sourceIds if given, otherwise fall
  // back to ALL ready sources for this theme (consistent with doGenerate auto-path).
  let sourceText: string | undefined;
  let primarySourceId: string | undefined;
  if (sourceIds && sourceIds.length > 0) {
    const { data: sources } = await supabase
      .from('data_sources')
      .select('id, extracted_text, status')
      .in('id', sourceIds)
      .eq('user_id', user.id);

    if (!sources || sources.length === 0) {
      throw new NotFoundError({ message: 'No sources found' });
    }

    // Verify all sources are ready
    const notReadySources = sources.filter((s) => s.status !== 'ready');
    if (notReadySources.length > 0) {
      throw new ValidationError({
        message: 'One or more sources are not ready yet — please wait for processing',
      });
    }

    // Merge text from all sources with separators
    primarySourceId = sources[0].id;
    sourceText = sources
      .map((s) => s.extracted_text ?? '')
      .filter((t) => t.length > 0)
      .join('\n\n---\n\n');
    if (sourceText.length === 0) {
      sourceText = undefined;
    }
  } else {
    // No specific sourceIds — fall back to all ready sources for the theme
    const { data: allSources } = await supabaseAdmin
      .from('data_sources')
      .select('id, extracted_text')
      .eq('theme_id', themeId)
      .eq('status', 'ready');

    if (allSources && allSources.length > 0) {
      primarySourceId = allSources[0].id;
      const merged = allSources
        .map((s) => s.extracted_text ?? '')
        .filter((t) => t.length > 0)
        .join('\n\n---\n\n');
      if (merged.length > 0) sourceText = merged;
    }
  }

  // Fetch existing card titles for this theme to avoid duplication
  const { data: existingCards } = await supabaseAdmin
    .from('cards')
    .select('title')
    .eq('theme_id', themeId);

  const topicsToAvoid = existingCards?.map((c) => c.title) ?? [];

  const cards = await generateWithSourceChunking(
    {
      theme: theme.name,
      sourceText,
      count: effectiveCount,
      topicsToAvoid: topicsToAvoid.length > 0 ? topicsToAvoid : undefined,
      language: theme.language as 'en' | 'ru' | undefined,
    },
    topicsToAvoid,
  );

  logger.info(
    { themeId, cardCount: cards.length, existingTopics: topicsToAvoid.length },
    'Generated cards',
  );

  // Hard cap before dedup — orchestrator already caps, but be defensive.
  const cappedCards = cards.slice(0, effectiveCount);

  // Deduplicate by normalized title before insert (in case LLM returned similar titles)
  const seenTitles = new Set(topicsToAvoid.map((t) => t.toLowerCase()));
  const uniqueCards = cappedCards.filter((card) => {
    const normalized = card.title.toLowerCase();
    if (seenTitles.has(normalized)) {
      logger.warn({ title: card.title }, 'Skipping duplicate card title');
      return false;
    }
    seenTitles.add(normalized);
    return true;
  });

  if (uniqueCards.length === 0) {
    return NextResponse.json(
      { error: 'No unique cards generated (all duplicates of existing topics)' },
      { status: 400 },
    );
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('cards')
    .insert(
      uniqueCards.map((c) => ({
        user_id: user.id,
        theme_id: themeId,
        source_id: primarySourceId ?? null,
        title: c.title,
        body: c.body,
        topic: theme.name,
      })),
    )
    .select();

  if (error) throw error;

  // Track usage
  if (inserted && inserted.length > 0) {
    await incrementCardCount(user.id, inserted.length);
    logger.info(
      { userId: user.id, cardsGenerated: inserted.length, plan: subscription.planId },
      'Updated user card usage',
    );
  }

  const cardsRemaining = Math.max(0, subscription.cardsRemaining - (inserted?.length ?? 0));

  return NextResponse.json(
    {
      cards: inserted,
      count: inserted?.length ?? 0,
      cardsRemaining,
      ...(partialWarning && partialWarning),
    },
    { status: 201 },
  );
});
