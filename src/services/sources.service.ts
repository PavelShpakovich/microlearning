import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

type DataSource = Database['public']['Tables']['data_sources']['Row'];
type DataSourceInsert = Database['public']['Tables']['data_sources']['Insert'];

export class SourceService {
  /**
   * Get all sources for a theme
   */
  static async getSources(themeId: string, userId: string): Promise<DataSource[]> {
    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .select('*')
      .eq('theme_id', themeId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch sources:', error);
      throw new Error('Failed to fetch sources');
    }

    return data || [];
  }

  /**
   * Get a single source
   */
  static async getSource(sourceId: string, userId: string): Promise<DataSource> {
    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .select('*')
      .eq('id', sourceId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('Source not found:', error);
      throw new Error('Source not found');
    }

    return data;
  }

  /**
   * Create a text source
   */
  static async createTextSource(
    themeId: string,
    userId: string,
    text: string,
    name: string = 'Text Source',
  ): Promise<DataSource> {
    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .insert({
        theme_id: themeId,
        user_id: userId,
        type: 'text',
        name,
        extracted_text: text,
        status: 'ready',
      } as DataSourceInsert)
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to create text source:', error);
      throw new Error('Failed to create text source');
    }

    return data;
  }

  /**
   * Create a URL source (YouTube or webpage)
   */
  static async createUrlSource(
    themeId: string,
    userId: string,
    url: string,
    name?: string,
  ): Promise<DataSource> {
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .insert({
        theme_id: themeId,
        user_id: userId,
        type: isYouTube ? 'youtube' : 'url',
        name: name || (isYouTube ? 'YouTube Video' : 'Web Page'),
        raw_url: url,
        status: 'processing',
      } as DataSourceInsert)
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to create URL source:', error);
      throw new Error('Failed to create URL source');
    }

    return data;
  }

  /**
   * Create a file source
   */
  static async createFileSource(
    themeId: string,
    userId: string,
    fileName: string,
    fileType: string,
  ): Promise<DataSource> {
    let sourceType: 'pdf' | 'docx' | 'text' = 'text';
    if (fileType === 'application/pdf') {
      sourceType = 'pdf';
    } else if (fileType?.includes('wordprocessingml')) {
      sourceType = 'docx';
    }

    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .insert({
        theme_id: themeId,
        user_id: userId,
        type: sourceType,
        name: fileName,
        status: 'processing',
      } as DataSourceInsert)
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to create file source:', error);
      throw new Error('Failed to create file source');
    }

    return data;
  }

  /**
   * Update source status
   */
  static async updateSourceStatus(
    sourceId: string,
    userId: string,
    status: 'pending' | 'processing' | 'ready' | 'error',
    extractedText?: string,
  ): Promise<DataSource> {
    const updates: Partial<DataSourceInsert> = {
      status,
      ...(extractedText && { extracted_text: extractedText }),
    };

    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .update(updates)
      .eq('id', sourceId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to update source status:', error);
      throw new Error('Failed to update source status');
    }

    return data;
  }

  /**
   * Delete a source
   */
  static async deleteSource(sourceId: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('data_sources')
      .delete()
      .eq('id', sourceId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete source:', error);
      throw new Error('Failed to delete source');
    }
  }
}
