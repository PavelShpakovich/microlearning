import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export function useBookmark(cardId: string) {
  const { data: session } = useSession();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial bookmark status
  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    async function checkBookmark() {
      try {
        const res = await fetch(`/api/bookmarks?cardId=${cardId}`);
        if (res.ok) {
          const data = (await res.json()) as { bookmarked: boolean };
          setBookmarked(data.bookmarked);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    void checkBookmark();
  }, [cardId, session?.user?.id]);

  // Toggle bookmark
  const toggleBookmark = useCallback(async () => {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId }),
      });

      if (res.ok) {
        const data = (await res.json()) as { bookmarked: boolean };
        setBookmarked(data.bookmarked);
      }
    } catch {
      // Silently fail
    }
  }, [cardId]);

  return { bookmarked, loading, toggleBookmark };
}
