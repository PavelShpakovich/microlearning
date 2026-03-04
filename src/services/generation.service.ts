import { generateCards as llmGenerateCards } from '@/lib/llm';
import { chunkSourceText, distributeCount } from '@/lib/llm/chunking';
import { LlmError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { MAX_CARDS_PER_BATCH } from '@/lib/constants';
import type { CardsOutput } from '@/lib/llm/schema';

/** Retry LLM generation up to maxAttempts times on schema/parse failures */
export async function generateWithRetry(
  input: Parameters<typeof llmGenerateCards>[0],
  maxAttempts = 3,
): Promise<CardsOutput> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await llmGenerateCards(input);
    } catch (err) {
      lastErr = err;
      const isLlmErr =
        err instanceof LlmError ||
        (err instanceof Error && err.message.includes('schema validation'));
      if (!isLlmErr) throw err; // non-recoverable, rethrow immediately
      logger.warn(
        { attempt, maxAttempts, errMsg: err instanceof Error ? err.message : String(err) },
        'LLM generation failed, retrying',
      );
    }
  }
  throw lastErr;
}

/**
 * Generate cards with optional source text chunking for long documents.
 * If source is > 8000 chars, splits into chunks and distributes card generation.
 * Merges and deduplicates results by title.
 */
export async function generateWithSourceChunking(
  input: Parameters<typeof llmGenerateCards>[0],
  existingTitles: string[] = [],
  onProgress?: (cards: CardsOutput) => Promise<void>,
): Promise<CardsOutput> {
  const sourceText = input.sourceText;
  const CHUNK_THRESHOLD = 8000;
  // Use small internal batches for short text to show progress quickly
  const MINI_BATCH_SIZE = 4;

  const allCards: CardsOutput = [];
  const seenTitles = new Set(existingTitles.map((t) => t.toLowerCase()));

  // If source is short or missing, break into mini-batches
  if (!sourceText || sourceText.length <= CHUNK_THRESHOLD) {
    // If request is small, do it in one go
    if (input.count <= MINI_BATCH_SIZE) {
      const cards = await generateWithRetry(input, 3);
      if (onProgress) await onProgress(cards);
      return cards;
    }

    // Split into mini-batches
    const batchCount = Math.ceil(input.count / MINI_BATCH_SIZE);
    const counts = distributeCount(input.count, batchCount);

    logger.info(
      { total: input.count, batchCount },
      'Splitting short-text generation into mini-batches',
    );

    for (const batchSize of counts) {
      if (batchSize === 0) continue;

      try {
        const batchCards = await generateWithRetry(
          {
            ...input,
            count: batchSize,
            topicsToAvoid: [...(input.topicsToAvoid || []), ...Array.from(seenTitles)],
          },
          3,
        );

        const newCards: CardsOutput = [];
        for (const card of batchCards) {
          const normalizedTitle = card.title.toLowerCase();
          if (!seenTitles.has(normalizedTitle)) {
            newCards.push(card);
            allCards.push(card);
            seenTitles.add(normalizedTitle);
          }
        }

        if (newCards.length > 0 && onProgress) {
          await onProgress(newCards);
        }
      } catch (err) {
        logger.warn(
          { error: err instanceof Error ? err.message : String(err) },
          'Mini-batch generation failed, continuing',
        );
      }
    }

    if (allCards.length === 0) {
      throw new Error('No cards generated from any batch');
    }

    return allCards;
  }

  // Source is long → chunk it and distribute generation
  logger.info(
    { sourceLength: sourceText.length, count: input.count },
    'Source text is long, chunking for distributed generation',
  );

  const chunks = chunkSourceText(sourceText, 6000, 500);
  logger.info({ chunkCount: chunks.length, totalChars: sourceText.length }, 'Created text chunks');

  // Distribute card count across chunks (ensure each chunk gets at least 1)
  const countsPerChunk = distributeCount(input.count, chunks.length);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const cardsForThisChunk = countsPerChunk[i];

    if (cardsForThisChunk === 0) continue; // Skip if no cards allocated to this chunk

    logger.info(
      { chunkIndex: i, chunkSize: chunk.text.length, cardsToGenerate: cardsForThisChunk },
      'Generating cards from chunk',
    );

    try {
      const chunkCards = await generateWithRetry(
        {
          theme: input.theme,
          sourceText: chunk.text,
          count: cardsForThisChunk,
          topicsToAvoid: input.topicsToAvoid,
          language: input.language,
        },
        3,
      );

      // Deduplicate by title before adding
      const newCards: CardsOutput = [];
      for (const card of chunkCards) {
        const normalizedTitle = card.title.toLowerCase();
        if (!seenTitles.has(normalizedTitle)) {
          newCards.push(card);
          allCards.push(card);
          seenTitles.add(normalizedTitle);
        } else {
          logger.debug({ title: card.title }, 'Skipping duplicate card title from chunk');
        }
      }

      if (newCards.length > 0 && onProgress) {
        await onProgress(newCards);
      }
    } catch (err) {
      logger.warn(
        { chunkIndex: i, error: err instanceof Error ? err.message : String(err) },
        'Failed to generate from chunk, continuing with other chunks',
      );
      // Continue with next chunk on failure
    }
  }

  if (allCards.length === 0) {
    throw new Error('No cards generated from any chunk');
  }

  logger.info(
    { totalGenerated: allCards.length, requestedCount: input.count },
    'Completed chunked generation',
  );

  return allCards;
}

// In-memory set of themeIds currently being generated
export const generatingThemes = new Set<string>();

// Cooldown after a generation failure
export const failedThemes = new Map<string, number>();
export const GENERATION_FAILURE_COOLDOWN_MS = 60_000; // 1 minute

export class GenerationService {
  /**
   * Generate cards for a theme. Assumes generation_started_at has already been
   * written to the DB (so polls from other instances see generating=true).
   * Clears the DB flag on success or failure.
   */
  static async doGenerate(userId: string, themeId: string): Promise<void> {
    logger.info({ themeId }, 'Starting card generation');
    try {
      const { data: theme } = await supabaseAdmin
        .from('themes')
        .select('name, description')
        .eq('id', themeId)
        .single();

      if (!theme) {
        logger.warn({ themeId }, 'Theme not found during generation');
        return;
      }

      // Fetch source text if any source is ready
      const { data: sources } = await supabaseAdmin
        .from('data_sources')
        .select('id, extracted_text')
        .eq('theme_id', themeId)
        .eq('status', 'ready')
        .limit(1);

      const sourceText = sources?.[0]?.extracted_text ?? undefined;
      const sourceId = sources?.[0]?.id ?? null;

      // Fetch existing card titles to avoid duplication
      const { data: existingCards } = await supabaseAdmin
        .from('cards')
        .select('title')
        .eq('theme_id', themeId);

      const topicsToAvoid = existingCards?.map((c) => c.title) ?? [];

      logger.info(
        { themeId, themeName: theme.name, existingTopics: topicsToAvoid.length },
        'Generating cards for theme',
      );

      const cards = await generateWithSourceChunking(
        {
          theme: theme.name,
          sourceText,
          count: MAX_CARDS_PER_BATCH,
          topicsToAvoid: topicsToAvoid.length > 0 ? topicsToAvoid : undefined,
        },
        topicsToAvoid,
        async (newCards) => {
          if (newCards.length === 0) return;

          await supabaseAdmin.from('cards').insert(
            newCards.map((c) => ({
              user_id: userId,
              theme_id: themeId,
              source_id: sourceId,
              title: c.title,
              body: c.body,
              topic: theme.name,
            })),
          );

          logger.info(
            { themeId, batchCount: newCards.length },
            'Inserted streaming batch of cards',
          );
        },
      );

      logger.info({ themeId, totalCount: cards.length }, 'Card generation complete');

      // Clear generating flag on success
      await supabaseAdmin
        .from('themes')
        .update({ generation_started_at: null, generation_failed_at: null })
        .eq('id', themeId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ themeId, errMsg }, 'Card generation failed');

      // Record failure timestamp and clear generating flag
      await supabaseAdmin
        .from('themes')
        .update({
          generation_started_at: null,
          generation_failed_at: new Date().toISOString(),
        })
        .eq('id', themeId);

      throw err;
    }
  }

  /**
   * Full entry point: marks generation started in DB, then generates.
   * Used for fire-and-forget callers that manage their own after() scope.
   */
  static async triggerGeneration(userId: string, themeId: string): Promise<void> {
    await this.markGenerationStarted(themeId);
    await this.doGenerate(userId, themeId);
  }

  /**
   * Write generation_started_at to DB so all instances see generating=true
   * immediately, before the actual LLM work begins.
   */
  static async markGenerationStarted(themeId: string): Promise<void> {
    await supabaseAdmin
      .from('themes')
      .update({ generation_started_at: new Date().toISOString(), generation_failed_at: null })
      .eq('id', themeId);
  }

  /**
   * Returns true if this theme is currently generating.
   * Uses DB state — works correctly across serverless instances.
   * Treats locks older than 10 min as stale (self-healing).
   */
  static async isGenerating(themeId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('themes')
      .select('generation_started_at')
      .eq('id', themeId)
      .maybeSingle();

    if (!data?.generation_started_at) return false;
    const ageMs = Date.now() - new Date(data.generation_started_at).getTime();
    return ageMs < 10 * 60 * 1000; // stale lock protection after 10 min
  }

  /**
   * Returns true if generation failed recently (within the cooldown window).
   * Uses DB state — works correctly across serverless instances.
   */
  static async isGenerationFailed(themeId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('themes')
      .select('generation_failed_at')
      .eq('id', themeId)
      .maybeSingle();

    if (!data?.generation_failed_at) return false;
    const ageMs = Date.now() - new Date(data.generation_failed_at).getTime();
    return ageMs < GENERATION_FAILURE_COOLDOWN_MS;
  }

  /**
   * Checks whether generation should be started for this theme.
   * Returns whether the caller should trigger generation and the current state.
   * Does NOT start generation — caller must call markGenerationStarted + doGenerate.
   */
  static async checkShouldGenerate(
    themeId: string,
    unseenCount: number,
    threshold: number,
  ): Promise<{ shouldGenerate: boolean; isGenerating: boolean }> {
    const [isGenerating, isFailed] = await Promise.all([
      this.isGenerating(themeId),
      this.isGenerationFailed(themeId),
    ]);

    const shouldGenerate = unseenCount < threshold && !isGenerating && !isFailed;
    return { shouldGenerate, isGenerating: isGenerating || shouldGenerate };
  }

  /**
   * Clear state (testing only)
   */
  static async clearState(themeId?: string): Promise<void> {
    generatingThemes.clear();
    failedThemes.clear();
    if (themeId) {
      await supabaseAdmin
        .from('themes')
        .update({ generation_started_at: null, generation_failed_at: null })
        .eq('id', themeId);
    }
  }
}
