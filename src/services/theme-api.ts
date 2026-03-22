import type { Database } from '@/lib/supabase/types';

type Theme = Database['public']['Tables']['themes']['Row'];

interface CreateThemeInput {
  name: string;
  description?: string;
  language?: 'en' | 'ru';
}

class ThemeApi {
  async createTheme(input: CreateThemeInput): Promise<Theme> {
    const response = await fetch('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = (await response.json()) as { theme?: Theme; error?: string; message?: string };

    if (!response.ok || !data.theme) {
      throw new Error(data.error || data.message || 'Failed to create theme');
    }

    return data.theme;
  }

  async listThemes(): Promise<Theme[]> {
    const res = await fetch('/api/themes', {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to load themes');
    }

    const result = (await res.json()) as { themes: Theme[] };
    return result.themes;
  }

  async getTheme(themeId: string): Promise<Theme> {
    const res = await fetch(`/api/themes/${themeId}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to load theme');
    }

    const result = (await res.json()) as { theme: Theme };
    return result.theme;
  }

  async updateTheme(
    themeId: string,
    updates: Partial<Pick<Theme, 'name' | 'description' | 'is_public'>>,
  ): Promise<Theme> {
    const res = await fetch(`/api/themes/${themeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to update theme');
    }

    const result = (await res.json()) as { theme: Theme };
    return result.theme;
  }

  async togglePrivacy(themeId: string, isPublic: boolean): Promise<Theme> {
    return this.updateTheme(themeId, { is_public: isPublic });
  }

  async generateCards(
    themeId: string,
    count: number,
    sourceIds?: string[],
  ): Promise<{
    count: number;
    cardsRemaining: number;
    warningCode?: string;
    warningMeta?: Record<string, number>;
  }> {
    const response = await fetch('/api/generate/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        themeId,
        count,
        ...(sourceIds && sourceIds.length > 0 && { sourceIds }),
      }),
    });

    if (!response.ok) {
      const data = (await response.json()) as {
        errorCode?: string;
        error?: string;
        message?: string;
      };
      throw new Error(data.errorCode || data.error || data.message || 'Failed to generate cards');
    }

    const data = (await response.json()) as {
      count: number;
      cardsRemaining: number;
      warningCode?: string;
      warningMeta?: Record<string, number>;
    };
    return data;
  }

  async deleteTheme(themeId: string): Promise<void> {
    const response = await fetch(`/api/themes/${themeId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      let message = 'Failed to delete theme';
      try {
        const data = (await response.json()) as { error?: string; message?: string };
        message = data.error || data.message || message;
      } catch {
        // Ignore JSON parsing errors and keep default message
      }
      throw new Error(message);
    }
  }

  async cloneTheme(themeId: string): Promise<{ themeId: string }> {
    const response = await fetch(`/api/themes/${themeId}/clone`, {
      method: 'POST',
    });

    const data = (await response.json()) as {
      themeId?: string;
      error?: string;
      message?: string;
    };

    if (!response.ok || !data.themeId) {
      throw new Error(data.error || data.message || 'Failed to clone theme');
    }

    return { themeId: data.themeId };
  }
}

export const themeApi = new ThemeApi();
