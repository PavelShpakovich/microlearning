'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Database } from '@/lib/supabase/types';

type Theme = Database['public']['Tables']['themes']['Row'];

/**
 * Hook to manage user's themes collection
 * Handles fetching, creating, updating, deleting themes
 *
 * @example
 * const { themes, isLoading, error, createTheme, deleteTheme } = useThemes();
 * if (isLoading) return <Skeleton />;
 * return <ThemeList themes={themes} onDelete={deleteTheme} />;
 */
export function useThemes() {
  const { data: session } = useSession();

  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all themes on mount
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/themes');

        if (!res.ok) {
          throw new Error('Failed to fetch themes');
        }

        const data = await res.json();
        setThemes(data.themes || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch themes');
        setThemes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThemes();
  }, [session]);

  const createTheme = useCallback(async (input: { name: string; description?: string }) => {
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create theme');
      }

      const data = await res.json();
      const theme = data.theme;
      setThemes((prev) => [theme, ...prev]);
      return theme;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create theme';
      setError(message);
      throw err;
    }
  }, []);

  const updateTheme = useCallback(
    async (themeId: string, input: { name?: string; description?: string }) => {
      try {
        const res = await fetch(`/api/themes/${themeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to update theme');
        }

        const data = await res.json();
        const theme = data.theme;
        setThemes((prev) => prev.map((t) => (t.id === themeId ? theme : t)));
        return theme;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update theme';
        setError(message);
        throw err;
      }
    },
    [],
  );

  const deleteTheme = useCallback(async (themeId: string) => {
    try {
      const res = await fetch(`/api/themes/${themeId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete theme');
      }

      setThemes((prev) => prev.filter((t) => t.id !== themeId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete theme';
      setError(message);
      throw err;
    }
  }, []);

  return {
    themes,
    isLoading,
    error,
    createTheme,
    updateTheme,
    deleteTheme,
  };
}
