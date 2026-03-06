import { generateCards as llmGenerateCards } from '@/lib/llm';
import { chunkSourceText, distributeCount } from '@/lib/llm/chunking';
import { LlmError } from '@/lib/errors';
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
  // Match batch size to generation batch so we never split into multiple LLM calls
  // for a single generation trigger. Splitting causes timeout issues with slower providers
  // (e.g. QWEN) on Vercel Hobby's 60-second limit.
  const MINI_BATCH_SIZE = MAX_CARDS_PER_BATCH;

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
        logger.error(
          { error: err instanceof Error ? err.message : String(err) },
          'Mini-batch generation failed, aborting remaining batches',
        );
        // If we already produced some cards, return what we have.
        // Otherwise rethrow so the caller sees a hard failure.
        if (allCards.length > 0) {
          logger.info(
            { generatedSoFar: allCards.length, requested: input.count },
            'Returning partial results after batch failure',
          );
          return allCards;
        }
        throw err;
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
      logger.error(
        { chunkIndex: i, error: err instanceof Error ? err.message : String(err) },
        'Failed to generate from chunk, aborting remaining chunks',
      );
      if (allCards.length > 0) {
        logger.info(
          { generatedSoFar: allCards.length, requested: input.count },
          'Returning partial results after chunk failure',
        );
        return allCards;
      }
      throw err;
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
