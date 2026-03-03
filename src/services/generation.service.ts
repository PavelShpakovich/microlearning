import { generateCards as llmGenerateCards } from '@/lib/llm';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// In-memory set of themeIds currently being generated
export const generatingThemes = new Set<string>();

// Cooldown after a generation failure
export const failedThemes = new Map<string, number>();
export const GENERATION_FAILURE_COOLDOWN_MS = 60_000; // 1 minute

export class GenerationService {
  /**
   * Trigger card generation for a theme (background task)
   */
  static async triggerGeneration(userId: string, themeId: string): Promise<void> {
    generatingThemes.add(themeId);
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

      logger.info({ themeId, themeName: theme.name }, 'Generating cards for theme');
      const cards = await llmGenerateCards({
        theme: theme.name,
        count: 5,
      });

      logger.info({ themeId, cardCount: cards.length }, 'LLM returned cards');

      if (cards.length === 0) {
        logger.warn({ themeId }, 'LLM returned empty array');
        return;
      }

      // Insert cards with actual user_id
      await supabaseAdmin.from('cards').insert(
        cards.map((c) => ({
          user_id: userId,
          theme_id: themeId,
          source_id: null,
          title: c.title,
          body: c.body,
          topic: theme.name,
        })),
      );

      logger.info({ themeId, count: cards.length }, 'Card generation complete');

      // Clear failure cooldown on success
      failedThemes.delete(themeId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ themeId, errMsg }, 'Card generation failed');

      // Start cooldown to avoid rapid retries
      failedThemes.set(themeId, Date.now());

      throw err;
    } finally {
      generatingThemes.delete(themeId);
    }
  }

  /**
   * Check if generation should be triggered and do it in background
   */
  static maybeStartGeneration(
    userId: string,
    themeId: string,
    unseenCount: number,
    threshold: number,
  ): boolean {
    const isGenerating = generatingThemes.has(themeId);
    const lastFailureAt = failedThemes.get(themeId);
    const inCooldown =
      lastFailureAt !== undefined &&
      Date.now() - lastFailureAt < GENERATION_FAILURE_COOLDOWN_MS;

    // Only trigger if: below threshold, not already running, not in failure cooldown
    if (unseenCount < threshold && !isGenerating && !inCooldown) {
      logger.info({ themeId }, 'Triggering card generation in background');
      this.triggerGeneration(userId, themeId).catch(() => {
        // Silently fail background generation
      });
      return true;
    }

    return isGenerating;
  }

  /**
   * Check if currently generating
   */
  static isGenerating(themeId: string): boolean {
    return generatingThemes.has(themeId);
  }

  /**
   * Clear state (testing only)
   */
  static clearState(): void {
    generatingThemes.clear();
    failedThemes.clear();
  }
}
