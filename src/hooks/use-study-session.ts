'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';
import { useSubscription } from '@/hooks/use-subscription';
import { studyApi } from '@/services/study-api';
import type { CardRatingValue } from '@/services/study-api';
import { themeApi } from '@/services/theme-api';
import { sourcesApi } from '@/services/sources-api';
import { LOW_CARDS_THRESHOLD } from '@/lib/constants';

type Card = Database['public']['Tables']['cards']['Row'];

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
  const t = useTranslations();
  const { refetch: refetchSubscription } = useSubscription();
  const searchParams = useSearchParams();
  const initialCountParam = searchParams.get('count');

  const [cards, setCards] = useState<Card[]>([]);
  const [studySession, setStudySession] = useState<{ id: string } | null>(null);
  const [seenCardIds, setSeenCardIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isManualGenerating, setIsManualGenerating] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [cardsRemaining, setCardsRemaining] = useState<number | null>(null);
  const [bookmarkedCardIds, setBookmarkedCardIds] = useState<string[]>([]);
  const [cardRatings, setCardRatings] = useState<Record<string, CardRatingValue>>({});
  const [infiniteMode, setInfiniteMode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState(
    initialCountParam ? parseInt(initialCountParam, 10) : 10,
  );
  const [sourceIds, setSourceIds] = useState<string[]>([]);

  const pollTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isPollingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevLimitReachedRef = useRef(false);

  // Toast when limit is reached for the first time during this session
  useEffect(() => {
    if (isLimitReached && !prevLimitReachedRef.current) {
      toast.error(t('messages.generationLimitReached'));
    }
    prevLimitReachedRef.current = isLimitReached;
  }, [isLimitReached, t]);

  interface FetchCardsOptions {
    triggerGeneration?: boolean;
    count?: number;
    signal?: AbortSignal;
  }

  const fetchCardsForSession = useCallback(
    async (sessionId: string, options?: FetchCardsOptions) => {
      setError(null);
      try {
        const data = await studyApi.fetchCards(sessionId, themeId, options);

        console.log('[fetchCardsForSession] API returned', data.cards.length, 'cards');

        setCards((prev) => {
          const existing = new Set(prev.map((c) => c.id));
          const toAdd = data.cards.filter((c) => !existing.has(c.id));
          console.log(
            '[fetchCardsForSession] Adding',
            toAdd.length,
            'new cards, total now:',
            prev.length + toAdd.length,
          );
          return [...prev, ...toAdd];
        });

        setIsGenerating(data.generating);

        // Always sync limit / remaining from server — both true and false — so
        // stale state from a previous theme never bleeds into the new one.
        setIsLimitReached(!!data.limitReached);
        if (data.cardsRemaining !== undefined) {
          setCardsRemaining(data.cardsRemaining);
        }

        if (data.generationFailed) {
          setError('GENERATION_FAILED');
        } else {
          setError(null);
        }

        // NOTE: setIsInitialLoading(false) is intentionally NOT called here.
        // It is called once at the end of initSession so the 2-step init
        // (non-trigger fetch → trigger fetch) never shows a blank render between steps.
        return data;
      } catch (err) {
        // Ignore abort errors (user navigated away)
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }
        setIsInitialLoading(false);
        setError(err instanceof Error ? err.message : 'LOAD_FAILED');
        return null;
      }
    },
    [themeId],
  );

  // Initialize session and first fetch
  useEffect(() => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const initSession = async () => {
      try {
        setCards([]);
        setError(null);
        setIsGenerating(false);
        setIsInitialLoading(true);
        setIsLimitReached(false);
        setCardsRemaining(null);
        setBookmarkedCardIds([]);
        setCardRatings({});
        setSourceIds([]);

        const data = await studyApi.initSession(themeId, abortController.signal);
        const createdSession = { id: data.sessionId };
        setStudySession(createdSession);
        setSeenCardIds(data.seenCardIds);

        // Fetch all ready sources for this theme to use in generation
        try {
          const allSources = await sourcesApi.list(themeId);
          const readySources = allSources.filter((s) => s.status === 'ready').map((s) => s.id);
          if (readySources.length > 0) {
            setSourceIds(readySources);
          }
        } catch {
          toast.error(t('messages.failedLoadSources'));
        }

        try {
          const bookmarkIds = await studyApi.fetchBookmarkedCardIds(abortController.signal);
          setBookmarkedCardIds(bookmarkIds);
        } catch {
          // Non-blocking: studying should still work if bookmark loading fails.
        }

        try {
          const ratings = await studyApi.fetchCardRatings(themeId, abortController.signal);
          setCardRatings(ratings);
        } catch {
          // Non-blocking: studying should still work if ratings fail to load.
        }

        const initialData = await fetchCardsForSession(data.sessionId, {
          triggerGeneration: false,
          signal: abortController.signal,
        });

        if (
          infiniteMode &&
          initialData &&
          initialData.cards.length === 0 &&
          !initialData.generating &&
          !initialData.limitReached
        ) {
          await fetchCardsForSession(data.sessionId, {
            triggerGeneration: true,
            count: cardCount,
            signal: abortController.signal,
          });
        }

        // Only mark initial loading done once BOTH fetches (non-trigger + trigger)
        // have completed. Moving this out of fetchCardsForSession prevents a blank
        // render between the two fetches when the theme has no cards yet.
        setIsInitialLoading(false);
      } catch (err) {
        // Ignore abort errors (user navigated away)
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setIsInitialLoading(false);
        setError(err instanceof Error ? err.message : 'LOAD_FAILED');
      }
    };

    if (session?.user?.id) {
      void initSession();
    }

    return () => {
      abortController.abort();
      abortControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, session?.user?.id, fetchCardsForSession]);

  // Manual/public fetch
  const fetchCards = useCallback(
    async (options?: FetchCardsOptions) => {
      if (!studySession) return;

      if (options?.triggerGeneration) {
        setIsGenerating(true);
      }

      await fetchCardsForSession(studySession.id, options);
    },
    [studySession, fetchCardsForSession],
  );

  // Poll every 2s ONLY while server is actively generating — picks up new cards as they arrive
  useEffect(() => {
    if (!isGenerating || !studySession) {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = undefined;
      }
      isPollingRef.current = false;
      return;
    }

    if (isPollingRef.current) return;
    isPollingRef.current = true;

    const abortController = new AbortController();

    const poll = async () => {
      try {
        const data = await studyApi.fetchCards(studySession.id, themeId, {
          triggerGeneration: false,
          signal: abortController.signal,
        });
        setCards((prev) => {
          const existing = new Set(prev.map((c) => c.id));
          const toAdd = data.cards.filter((c) => !existing.has(c.id));
          return [...prev, ...toAdd];
        });
        setIsGenerating(data.generating);

        // Always sync limit / remaining from poll responses so quota indicator stays accurate
        if (data.limitReached) {
          setIsLimitReached(true);
        }
        if (data.cardsRemaining !== undefined) {
          setCardsRemaining(data.cardsRemaining);
        }

        if (data.generationFailed) {
          setError('GENERATION_FAILED');
        } else {
          setError(null);
        }

        // Keep polling only while still generating
        if (data.generating) {
          pollTimerRef.current = setTimeout(poll, 2000);
        } else {
          isPollingRef.current = false;
          // One-shot re-fetch 1 s after generation finishes to pick up any
          // final cards that arrived in the last background flush.
          setTimeout(async () => {
            try {
              const finalData = await studyApi.fetchCards(studySession.id, themeId, {
                triggerGeneration: false,
                signal: abortController.signal,
              });
              setCards((prev) => {
                const existing = new Set(prev.map((c) => c.id));
                const toAdd = finalData.cards.filter((c) => !existing.has(c.id));
                return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
              });
            } catch {
              // best-effort, ignore errors
            }
          }, 1000);
        }
      } catch (err) {
        // Ignore abort errors (user navigated away)
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed while polling cards');
        isPollingRef.current = false;
      }
    };

    pollTimerRef.current = setTimeout(poll, 2000);

    return () => {
      abortController.abort();
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = undefined;
      }
      isPollingRef.current = false;
    };
  }, [isGenerating, studySession, themeId]);

  const markCardSeen = useCallback(
    async (cardId: string) => {
      if (!studySession) return;

      try {
        await studyApi.markCardSeen(studySession.id, cardId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark card seen');
      }
    },
    [studySession],
  );

  const toggleBookmark = useCallback(
    async (cardId: string) => {
      const wasBookmarked = bookmarkedCardIds.includes(cardId);

      setBookmarkedCardIds((prev) =>
        wasBookmarked ? prev.filter((id) => id !== cardId) : [...prev, cardId],
      );

      try {
        if (wasBookmarked) {
          await studyApi.unbookmarkCard(cardId);
        } else {
          await studyApi.bookmarkCard(cardId);
        }
      } catch (err) {
        setBookmarkedCardIds((prev) =>
          wasBookmarked ? [...prev, cardId] : prev.filter((id) => id !== cardId),
        );
        toast.error(err instanceof Error ? err.message : t('messages.failedBookmarkUpdate'));
      }
    },
    [bookmarkedCardIds, t],
  );

  const rateCard = useCallback(
    async (cardId: string, rating: Exclude<CardRatingValue, 0>) => {
      const previousRating = cardRatings[cardId] ?? 0;
      const nextRating: CardRatingValue = previousRating === rating ? 0 : rating;

      setCardRatings((prev) => {
        const updated = { ...prev };
        if (nextRating === 0) {
          delete updated[cardId];
        } else {
          updated[cardId] = nextRating;
        }
        return updated;
      });

      try {
        await studyApi.rateCard(cardId, nextRating);
      } catch (err) {
        setCardRatings((prev) => {
          const updated = { ...prev };
          if (previousRating === 0) {
            delete updated[cardId];
          } else {
            updated[cardId] = previousRating;
          }
          return updated;
        });
        toast.error(err instanceof Error ? err.message : t('messages.failedRateCard'));
      }
    },
    [cardRatings, t],
  );

  const replaceCard = useCallback(
    (oldCardId: string, newCard: Card, nextCardsRemaining?: number) => {
      setCards((prev) => prev.map((card) => (card.id === oldCardId ? newCard : card)));
      setSeenCardIds((prev) => prev.map((cardId) => (cardId === oldCardId ? newCard.id : cardId)));
      setBookmarkedCardIds((prev) =>
        prev.map((cardId) => (cardId === oldCardId ? newCard.id : cardId)),
      );
      setCardRatings((prev) => {
        const updated = { ...prev };
        delete updated[oldCardId];
        return updated;
      });

      if (typeof nextCardsRemaining === 'number') {
        setCardsRemaining(nextCardsRemaining);
        setIsLimitReached(nextCardsRemaining <= 0);
      }
    },
    [],
  );

  const generateMore = useCallback(
    async (count = cardCount) => {
      if (isGenerating || isManualGenerating) return;
      // Use a separate flag so the background poller can't clobber this loading state.
      // /api/generate/cards is synchronous — GenerationService never sees it, so
      // isGenerating would immediately be reset to false by the next poll tick.
      setIsManualGenerating(true);
      setError(null);
      try {
        const result = await themeApi.generateCards(themeId, count, sourceIds);

        // Surface limit warnings as toasts so user is informed
        if (result.warningCode === 'PARTIAL_GENERATION' && result.warningMeta) {
          toast.warning(
            t('messages.cardsGeneratedPartial', {
              generated: result.warningMeta.generated,
              requested: result.warningMeta.requested,
            }),
          );
        } else if (result.cardsRemaining === 0) {
          toast.error(t('messages.generationLimitReached'));
        } else if (result.cardsRemaining <= LOW_CARDS_THRESHOLD) {
          toast.info(t('messages.cardsRemainingLow', { count: result.cardsRemaining }));
        }

        // Cards are already in DB when the response returns (synchronous route).
        // Refetch so the new cards appear immediately.
        if (studySession) {
          await fetchCardsForSession(studySession.id, { triggerGeneration: false });
        }

        void refetchSubscription().catch(() => null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'GENERATION_LIMIT_REACHED') {
          setIsLimitReached(true);
          toast.error(t('messages.generationLimitReached'));
          void refetchSubscription().catch(() => null);
        } else {
          setError(msg || 'GENERATION_FAILED');
        }
      } finally {
        setIsManualGenerating(false);
      }
    },
    [
      themeId,
      isGenerating,
      isManualGenerating,
      cardCount,
      studySession,
      fetchCardsForSession,
      sourceIds,
      refetchSubscription,
      t,
    ],
  );

  return {
    cards,
    session: studySession,
    seenCardIds,
    isGenerating,
    isManualGenerating,
    isInitialLoading,
    isLimitReached,
    cardsRemaining,
    bookmarkedCardIds,
    cardRatings,
    infiniteMode,
    error,
    cardCount,
    fetchCards,
    markCardSeen,
    toggleBookmark,
    rateCard,
    replaceCard,
    generateMore,
    setInfiniteMode,
    setCardCount,
  };
}
