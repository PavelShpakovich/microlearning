'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Database } from '@/lib/supabase/types';

type Card = Database['public']['Tables']['cards']['Row'];

interface CardsResponse {
  cards: Card[];
  remaining: number;
  generating: boolean;
}

/**
 * Hook to manage study session state and card fetching
 * Handles:
 * - Initial card loading
 * - Infinite polling while generating
 * - Infinite mode toggle
 * - Marking cards seen
 *
 * @example
 * const { cards, isGenerating, infiniteMode, fetchCards, markSeen } = useStudySession(themeId);
 * return (
 *   <>
 *     {cards.map(card => <Card key={card.id} onVisible={() => markSeen(card.id)} />)}
 *     <InfiniteToggle active={infiniteMode} onChange={(v) => setInfiniteMode(v)} />
 *   </>
 * );
 */
export function useStudySession(themeId: string) {
  const { data: session } = useSession();

  const [cards, setCards] = useState<Card[]>([]);
  const [studySession, setStudySession] = useState<{ id: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [infiniteMode, setInfiniteMode] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isPollingRef = useRef<boolean>(false);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await fetch('/api/session/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId }),
        });

        if (!res.ok) throw new Error('Failed to initialize session');

        const data = await res.json();
        setStudySession(data);
      } catch (err) {
        console.error('Failed to create session:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize session');
      }
    };

    if (session?.user?.id) {
      initSession();
    }
  }, [themeId, session?.user?.id]);

  // Main card fetching function
  const fetchCards = useCallback(async () => {
    if (!studySession?.id) return;

    try {
      const res = await fetch(`/api/cards?sessionId=${studySession.id}&themeId=${themeId}`);
      if (!res.ok) throw new Error('Failed to fetch cards');

      const data: CardsResponse = await res.json();

      setCards((prev) => {
        // Avoid duplicates
        const existing = new Set(prev.map((c) => c.id));
        const toAdd = data.cards.filter((c) => !existing.has(c.id));
        return [...prev, ...toAdd];
      });

      setIsGenerating(data.generating);

      // If infinite mode is enabled and generation is running, poll again in 3s
      if (infiniteMode && data.generating) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = setTimeout(() => {
          void fetchCards();
        }, 3000);
      } else if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = undefined;
      }
    } catch (err) {
      console.error('Failed to fetch cards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cards');
    }
  }, [studySession?.id, themeId, infiniteMode]);

  // Initial load
  useEffect(() => {
    if (studySession?.id && cards.length === 0) {
      void fetchCards();
    }
  }, [studySession?.id, cards.length, fetchCards]);

  // Polling logic
  useEffect(() => {
    if (!infiniteMode) {
      // Clear polling when infinite mode is disabled
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = undefined;
      }
      isPollingRef.current = false;
      return;
    }

    if (!isPollingRef.current && studySession?.id) {
      isPollingRef.current = true;
      void fetchCards();
    }
  }, [infiniteMode, studySession?.id, fetchCards]);

  const markCardSeen = useCallback(
    async (cardId: string) => {
      if (!studySession?.id) return;

      try {
        await fetch('/api/session/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: studySession.id, cardId }),
        });
        console.log(`Marked card ${cardId} as seen`);
      } catch (err) {
        console.error('Failed to mark card seen:', err);
      }
    },
    [studySession?.id],
  );

  return {
    cards,
    session: studySession,
    isGenerating,
    infiniteMode,
    error,
    fetchCards,
    markCardSeen,
    setInfiniteMode,
  };
}
