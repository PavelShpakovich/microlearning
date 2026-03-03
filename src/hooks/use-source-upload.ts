'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Database } from '@/lib/supabase/types';

type DataSource = Database['public']['Tables']['data_sources']['Row'];

/**
 * Hook to manage data source uploads and processing status
 *
 * @example
 * const { sources, uploadText, uploadUrl, uploadFile, isUploading } = useSourceUpload(themeId);
 * return (
 *   <>
 *     {sources.map(source => (
 *       <SourceItem key={source.id} source={source} />
 *     ))}
 *     <UploadForm onUpload={uploadText} />
 *   </>
 * );
 */
export function useSourceUpload(themeId: string) {
  const { data: session } = useSession();

  const [sources, setSources] = useState<DataSource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing sources on mount
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch(`/api/sources?themeId=${themeId}`);
        if (!res.ok) throw new Error('Failed to fetch sources');

        const data = await res.json();
        setSources(data.sources || []);
      } catch (err) {
        console.error('Failed to fetch sources:', err);
      }
    };

    if (session?.user?.id) {
      fetchSources();
    }
  }, [themeId, session?.user?.id]);

  const uploadText = useCallback(
    async (text: string, name?: string) => {
      try {
        setIsUploading(true);
        setError(null);

        const res = await fetch('/api/sources/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId, text, name }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to upload text');
        }

        const data = await res.json();
        setSources((prev) => [...prev, data.source]);
        return data.source;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload text';
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [themeId],
  );

  const uploadUrl = useCallback(
    async (url: string, name?: string) => {
      try {
        setIsUploading(true);
        setError(null);

        const res = await fetch('/api/sources/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId, url, name }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to add URL source');
        }

        const data = await res.json();
        setSources((prev) => [...prev, data.source]);
        return data.source;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add URL source';
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [themeId],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      try {
        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('themeId', themeId);
        formData.append('file', file);

        const res = await fetch('/api/sources/file', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to upload file');
        }

        const data = await res.json();
        setSources((prev) => [...prev, data.source]);
        return data.source;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload file';
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [themeId],
  );

  const deleteSource = useCallback(async (sourceId: string) => {
    try {
      const res = await fetch(`/api/sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete source');
      }

      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete source';
      setError(message);
      throw err;
    }
  }, []);

  return {
    sources,
    isUploading,
    error,
    uploadText,
    uploadUrl,
    uploadFile,
    deleteSource,
  };
}
