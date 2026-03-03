import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

type Session = Database['public']['Tables']['sessions']['Row'];

export class SessionService {
  /**
   * Create a new study session
   */
  static async createSession(themeId: string, userId: string): Promise<Session> {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert({
        theme_id: themeId,
        user_id: userId,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to create session:', error);
      throw new Error('Failed to create study session');
    }

    return data;
  }

  /**
   * Get the current session for a theme
   */
  static async getCurrentSession(themeId: string, userId: string): Promise<Session | null> {
    const { data } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('theme_id', themeId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data || null;
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(
    sessionId: string,
    userId: string,
  ): Promise<{
    totalCards: number;
    seenCards: number;
  }> {
    // Verify session belongs to user
    const session = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (session.error) {
      throw new Error('Session not found');
    }

    const { data: seenCards } = await supabaseAdmin
      .from('session_cards')
      .select('id', { count: 'exact' })
      .eq('session_id', sessionId);

    return {
      totalCards: 0, // Would need to join with cards/theme
      seenCards: seenCards?.length || 0,
    };
  }

  /**
   * Delete a session (since sessions table only stores creation)
   */
  static async deleteSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete session:', error);
      throw new Error('Failed to delete session');
    }
  }
}
