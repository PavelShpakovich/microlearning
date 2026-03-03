import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

type Theme = Database['public']['Tables']['themes']['Row'];
type ThemeInsert = Database['public']['Tables']['themes']['Insert'];

export class ThemeService {
  /**
   * Get all themes for the current user
   */
  static async getThemes(userId: string): Promise<Theme[]> {
    const { data, error } = await supabaseAdmin
      .from('themes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch themes:', error);
      throw new Error('Failed to fetch themes');
    }

    return data || [];
  }

  /**
   * Get a single theme by ID
   */
  static async getTheme(themeId: string, userId: string): Promise<Theme> {
    const { data, error } = await supabaseAdmin
      .from('themes')
      .select('*')
      .eq('id', themeId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('Theme not found:', error);
      throw new Error('Theme not found');
    }

    return data;
  }

  /**
   * Create a new theme
   */
  static async createTheme(
    userId: string,
    input: { name: string; description?: string },
  ): Promise<Theme> {
    const { data, error } = await supabaseAdmin
      .from('themes')
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description || null,
      } as ThemeInsert)
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to create theme:', error);
      throw new Error('Failed to create theme');
    }

    return data;
  }

  /**
   * Update a theme
   */
  static async updateTheme(
    themeId: string,
    userId: string,
    input: { name?: string; description?: string },
  ): Promise<Theme> {
    const { data, error } = await supabaseAdmin
      .from('themes')
      .update(input as Partial<ThemeInsert>)
      .eq('id', themeId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to update theme:', error);
      throw new Error('Failed to update theme');
    }

    return data;
  }

  /**
   * Delete a theme
   */
  static async deleteTheme(themeId: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('themes')
      .delete()
      .eq('id', themeId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete theme:', error);
      throw new Error('Failed to delete theme');
    }
  }

  /**
   * Get theme statistics
   */
  static async getThemeStats(
    themeId: string,
    userId: string,
  ): Promise<{
    totalCards: number;
    unseenCards: number;
    masteredCards: number;
  }> {
    // Verify user owns this theme
    await this.getTheme(themeId, userId);

    const { data: cards } = await supabaseAdmin
      .from('cards')
      .select('id')
      .eq('theme_id', themeId)
      .eq('user_id', userId);

    const { data: seen } = await supabaseAdmin
      .from('session_cards')
      .select('card_id', { count: 'exact' })
      .in('card_id', cards?.map((c) => c.id) || []);

    return {
      totalCards: cards?.length || 0,
      unseenCards: (cards?.length || 0) - (seen?.length || 0),
      masteredCards: seen?.length || 0,
    };
  }
}
