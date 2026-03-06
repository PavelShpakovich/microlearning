import { generateWithSourceChunking } from '@/lib/llm/chunking-orchestrator';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { MAX_CARDS_PER_BATCH } from '@/lib/constants';
import { SubscriptionService } from '@/lib/subscriptions/service';

export { generateWithRetry, generateWithSourceChunking } from '@/lib/llm/chunking-orchestrator';

/** Cooldown window after a generation failure (1 minute). */
const GENERATION_FAILURE_COOLDOWN_MS = 60_000;

export class GenerationService {
  /**
   * Generate cards for a theme. Assumes generation_started_at has already been
   * written to the DB (so polls from other instances see generating=true).
   * Clears the DB flag on success or failure.
   */
  static async doGenerate(userId: string, themeId: string, customCount?: number): Promise<void> {
    logger.info({ themeId }, 'Starting card generation');
    try {
      // Check subscription quota before doing any work
      const subscription = await SubscriptionService.getSubscriptionStatus(userId);
      if (!subscription.canGenerate) {
        logger.info(
          { themeId, userId, cardsRemaining: subscription.usage.cardsRemaining },
          'Skipping auto-generation — user has reached their monthly card limit',
        );
        return;
      }

      // Cap the requested count to how many cards the user still has left this period
      const effectiveCount = Math.min(
        customCount ?? MAX_CARDS_PER_BATCH,
        subscription.usage.cardsRemaining,
      );

      const { data: theme } = await supabaseAdmin
        .from('themes')
        .select('name, description, language')
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

      let totalInserted = 0;

      const cards = await generateWithSourceChunking(
        {
          theme: theme.name,
          description: theme.description ?? undefined,
          sourceText,
          count: effectiveCount,
          topicsToAvoid: topicsToAvoid.length > 0 ? topicsToAvoid : undefined,
          language: theme.language as 'en' | 'ru' | undefined,
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

          totalInserted += newCards.length;

          logger.info(
            { themeId, batchCount: newCards.length },
            'Inserted streaming batch of cards',
          );
        },
      );

      logger.info({ themeId, totalCount: cards.length }, 'Card generation complete');

      // Track usage for cards inserted via the auto-generation path
      if (totalInserted > 0) {
        await SubscriptionService.incrementCardCount(userId, totalInserted);
        logger.info(
          { userId, themeId, totalInserted, plan: subscription.plan.planId },
          'Updated user card usage after auto-generation',
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ themeId, errMsg }, 'Card generation failed');

      // Record failure timestamp so isGenerationFailed() returns true
      await supabaseAdmin
        .from('themes')
        .update({
          generation_failed_at: new Date().toISOString(),
        })
        .eq('id', themeId);

      throw err;
    } finally {
      // ALWAYS clear generation_started_at — even on Vercel timeout / uncaught error.
      // This prevents the stale-lock problem where users see a stuck spinner.
      await supabaseAdmin.from('themes').update({ generation_started_at: null }).eq('id', themeId);
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
    return ageMs < 3 * 60 * 1000; // stale lock protection after 3 min
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

  /** Clear only the failure flag (used when user explicitly retries). */
  static async clearFailureFlag(themeId: string): Promise<void> {
    await supabaseAdmin.from('themes').update({ generation_failed_at: null }).eq('id', themeId);
  }

  /** @internal Reset DB generation flags (for tests only). */
  static async clearState(themeId: string): Promise<void> {
    await supabaseAdmin
      .from('themes')
      .update({ generation_started_at: null, generation_failed_at: null })
      .eq('id', themeId);
  }
}
