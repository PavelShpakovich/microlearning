'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { InfoCard } from '@/components/info-card';
import { useStudySession } from '@/hooks/use-study-session';
import { useCardFontSize } from '@/hooks/use-card-font-size';
import { useSubscription } from '@/hooks/use-subscription';
import { TOAST_DURATION_MS } from '@/lib/constants';
import { StudyBottomBar } from '@/components/study/study-bottom-bar';
import {
  StudyDoneScreen,
  StudyEmptyScreen,
  StudyGeneratingScreen,
  StudyInitialLoadingScreen,
  StudyLimitReachedScreen,
  StudyLoadingMoreScreen,
} from '@/components/study/study-state-screens';
import { useTranslations } from 'next-intl';
import { Lock, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { studyApi } from '@/services/study-api';

interface StudyClientProps {
  themeId: string;
  isOwner?: boolean;
}

const STUDY_ERROR_KEYS: Record<string, string> = {
  GENERATION_FAILED: 'study.generationFailed',
  LOAD_FAILED: 'study.loadFailed',
};

const HIDE_DOWNVOTED_STORAGE_KEY = 'clario-study-hide-downvoted';

export function StudyClient({ themeId, isOwner = true }: StudyClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const { refetch: refetchSubscription } = useSubscription();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isRegeneratingCard, setIsRegeneratingCard] = useState(false);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const [hideDownvotedCards, setHideDownvotedCards] = useState(false);
  // Eligibility is evaluated ONCE when initial loading completes and never re-checked.
  // This prevents newly-generated cards from re-triggering the prompt mid-session.
  const [resumeEligible, setResumeEligible] = useState(false);
  const resumeEvaluatedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const triggerFetchedAtRef = useRef<number>(-1);
  const {
    fontSize,
    increase: increaseFontSize,
    decrease: decreaseFontSize,
    canIncrease: canIncreaseFontSize,
    canDecrease: canDecreaseFontSize,
  } = useCardFontSize();

  const {
    cards,
    session,
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
  } = useStudySession(themeId);

  useEffect(() => {
    const savedPreference = window.localStorage.getItem(HIDE_DOWNVOTED_STORAGE_KEY);
    setHideDownvotedCards(savedPreference === 'true');
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HIDE_DOWNVOTED_STORAGE_KEY, hideDownvotedCards ? 'true' : 'false');
  }, [hideDownvotedCards]);

  const visibleCards = useMemo(
    () => (hideDownvotedCards ? cards.filter((card) => cardRatings[card.id] !== -1) : cards),
    [cards, cardRatings, hideDownvotedCards],
  );

  useEffect(() => {
    if (visibleCards.length === 0) {
      if (currentCardIndex !== 0) {
        setCurrentCardIndex(0);
      }
      return;
    }

    if (currentCardIndex > visibleCards.length - 1) {
      setCurrentCardIndex(visibleCards.length - 1);
    }
  }, [visibleCards.length, currentCardIndex]);

  const currentCardId = visibleCards[currentCardIndex]?.id;
  const isCurrentCardBookmarked =
    currentCardId != null && bookmarkedCardIds.includes(currentCardId);

  const handleRegenerateCard = async (cardId: string) => {
    if (!cardId || !isOwner || isRegeneratingCard || isGenerating || isManualGenerating) {
      return;
    }

    setIsRegeneratingCard(true);
    try {
      const result = await studyApi.regenerateCard(cardId);
      replaceCard(cardId, result.card, result.cardsRemaining);
      void refetchSubscription().catch(() => null);

      if (result.cardsRemaining === 0) {
        toast.error(t('messages.generationLimitReached'));
      }

      const toastId = toast.success(t('messages.cardRegenerated'));
      setTimeout(() => toast.dismiss(toastId), TOAST_DURATION_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'GENERATION_LIMIT_REACHED') {
        void refetchSubscription().catch(() => null);
        toast.error(t('messages.generationLimitReached'));
      } else {
        toast.error(t('messages.failedRegenerateCard'));
      }
    } finally {
      setIsRegeneratingCard(false);
    }
  };

  // Disable infinite mode for non-owners (they can't generate)
  useEffect(() => {
    if (!isOwner && infiniteMode) {
      setInfiniteMode(false);
    }
  }, [isOwner, infiniteMode, setInfiniteMode]);

  // Compute resume index: first card after the last seen card in deck order.
  // Kept as a live computation so "Continue" can always scroll to the right card.
  const resumeIndex = (() => {
    if (seenCardIds.length === 0 || visibleCards.length === 0) return 0;
    const seenSet = new Set(seenCardIds);
    let lastSeenIdx = -1;
    for (let i = 0; i < visibleCards.length; i++) {
      if (seenSet.has(visibleCards[i].id)) lastSeenIdx = i;
    }
    return lastSeenIdx + 1;
  })();

  // Freeze resume eligibility ONCE when initial loading completes.
  // New cards arriving from auto-generation must NOT re-trigger this prompt mid-session.
  useEffect(() => {
    if (isInitialLoading || resumeEvaluatedRef.current) return;
    resumeEvaluatedRef.current = true;
    setResumeEligible(
      visibleCards.length > 0 &&
        seenCardIds.length > 0 &&
        resumeIndex > 0 &&
        resumeIndex < visibleCards.length,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoading]); // intentionally only react to loading completion, not card/seen changes

  // Show resume prompt only if it was eligible at initial-load completion and not yet dismissed
  const showResumePrompt = resumeEligible && !resumeDismissed;

  const done =
    !infiniteMode && visibleCards.length > 0 && !isGenerating && !isManualGenerating && session?.id;

  useEffect(() => {
    if (!session?.id) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
            const cardId = entry.target.getAttribute('data-card-id');
            if (cardId && !seenIdsRef.current.has(cardId)) {
              seenIdsRef.current.add(cardId);
              void markCardSeen(cardId);
            }
          }
        }
      },
      { threshold: 0.8 },
    );

    const interval = setInterval(() => {
      document.querySelectorAll('[data-card-id]').forEach((el) => observer.observe(el));
    }, 500);

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [session?.id, markCardSeen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const main = document.querySelector('main');
      if (!main) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        main.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        main.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!session?.id) return;

    const main = document.querySelector('main');
    if (!main) return;

    const handleScrollEnd = () => {
      // Find the card whose top edge is closest to the viewport top.
      // This works correctly even when cards are taller than the viewport,
      // because snap positions are at each card's offsetTop (not multiples of
      // innerHeight), so dividing scrollTop by innerHeight gives wrong results
      // for tall cards.
      const cardElements = document.querySelectorAll('[data-card-id]');
      let closestIndex = 0;
      let closestDistance = Infinity;
      cardElements.forEach((el, i) => {
        const distance = Math.abs(el.getBoundingClientRect().top);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      });
      const maxIndex = Math.max(0, cardCountRef.current - 1);
      const settled = Math.max(0, Math.min(closestIndex, maxIndex));
      setCurrentCardIndex(settled);

      // Mark the settled card AND the immediately preceding card as seen.
      // The IntersectionObserver can miss cards during fast swipes (the card
      // spends < threshold time at ≥ 80% intersection). Doing it here on
      // scrollend guarantees both are recorded — the settled card is
      // definitively on-screen, and the previous card was just on-screen.
      const indicesToMark = settled > 0 ? [settled - 1, settled] : [settled];
      for (const idx of indicesToMark) {
        const card = cardsRef.current[idx];
        if (card && !seenIdsRef.current.has(card.id)) {
          seenIdsRef.current.add(card.id);
          void markCardSeenRef.current(card.id);
        }
      }
    };

    main.addEventListener('scrollend', handleScrollEnd);
    return () => main.removeEventListener('scrollend', handleScrollEnd);
  }, [session?.id]);

  // Auto-scroll to newly generated cards if the user is at the bottom (viewing the loader)
  const prevCardCountRef = useRef(visibleCards.length);
  // Keep a ref to cards.length so the scroll handler can clamp the index
  // without needing cards in its dependency array (which would re-register
  // the listener on every card append).
  const cardCountRef = useRef(visibleCards.length);
  // Keep a ref to the cards array so the scrollend handler can read card IDs
  // without forming a stale closure.
  const cardsRef = useRef(visibleCards);
  // Keep a ref to markCardSeen so the scrollend handler doesn't need it as a dep.
  const markCardSeenRef = useRef(markCardSeen);
  // Update synchronously during render (safe for refs — no re-render triggered)

  cardCountRef.current = visibleCards.length;
  cardsRef.current = visibleCards;
  markCardSeenRef.current = markCardSeen;
  useEffect(() => {
    if (visibleCards.length > prevCardCountRef.current) {
      // If user was viewing the loader (index == prevLength) or further
      if (currentCardIndex >= prevCardCountRef.current - 1) {
        const firstNewCard = visibleCards[prevCardCountRef.current];
        if (firstNewCard) {
          setTimeout(() => {
            const el = document.querySelector(`[data-card-id="${firstNewCard.id}"]`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      }
    }
    prevCardCountRef.current = visibleCards.length;
  }, [visibleCards, currentCardIndex]);

  useEffect(() => {
    if (
      !infiniteMode ||
      !session?.id ||
      visibleCards.length === 0 ||
      isGenerating ||
      isLimitReached
    )
      return;

    const cardsLeft = visibleCards.length - currentCardIndex;
    const alreadyTriggeredForBatch = triggerFetchedAtRef.current === visibleCards.length;

    if (cardsLeft <= 2 && !alreadyTriggeredForBatch) {
      triggerFetchedAtRef.current = visibleCards.length;
      void fetchCards({ triggerGeneration: true });
    }
  }, [
    currentCardIndex,
    visibleCards.length,
    infiniteMode,
    session?.id,
    isGenerating,
    isLimitReached,
    fetchCards,
  ]);

  const handleToggleHideDownvoted = useCallback(() => {
    setHideDownvotedCards((previous) => !previous);
    setCurrentCardIndex(0);
  }, []);

  if (error) {
    const errorKey = STUDY_ERROR_KEYS[error];
    const errorMessage = errorKey ? t(errorKey) : error;
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center px-6 max-w-sm">
          <p role="alert" className="mb-6 text-destructive font-semibold">
            {errorMessage}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              {t('study.cancel')}
            </Button>
            <Button onClick={() => void fetchCards({ triggerGeneration: true, count: cardCount })}>
              {t('study.retry')}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return <StudyInitialLoadingScreen />;
  }

  if (showResumePrompt) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center px-6 max-w-sm">
          <p className="mb-2 text-lg font-semibold">{t('study.resumeTitle')}</p>
          <p className="mb-6 text-sm text-muted-foreground">
            {t('study.resumePrompt', { count: seenCardIds.length, total: visibleCards.length })}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                setResumeDismissed(true);
                setTimeout(() => {
                  const card = visibleCards[resumeIndex];
                  if (card) {
                    document
                      .querySelector(`[data-card-id="${card.id}"]`)
                      ?.scrollIntoView({ behavior: 'instant' });
                  }
                }, 50);
              }}
            >
              {t('study.resumeContinue', { number: resumeIndex + 1 })}
            </Button>
            <Button variant="outline" onClick={() => setResumeDismissed(true)}>
              {t('study.resumeStartOver')}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (cards.length > 0 && hideDownvotedCards && visibleCards.length === 0) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-sm">
          <ThumbsDown className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 text-lg font-semibold">{t('study.hiddenCardsTitle')}</p>
          <p className="mb-6 text-sm text-muted-foreground">{t('study.hiddenCardsDescription')}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleToggleHideDownvoted}>{t('study.showDownvotedCards')}</Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              {t('navigation.back')}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 overflow-y-scroll snap-y snap-mandatory bg-background">
      <StudyBottomBar
        totalCards={visibleCards.length}
        currentCardIndex={currentCardIndex}
        isGenerating={isGenerating}
        isManualGenerating={isManualGenerating}
        infiniteMode={infiniteMode}
        cardCount={cardCount}
        fontSize={fontSize}
        onToggleInfiniteMode={() => setInfiniteMode((prev) => !prev)}
        onGenerateMore={(count) => void generateMore(count)}
        onSetCardCount={setCardCount}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
        canIncreaseFontSize={canIncreaseFontSize}
        canDecreaseFontSize={canDecreaseFontSize}
        isBookmarked={isCurrentCardBookmarked}
        onToggleBookmark={() => {
          if (currentCardId) {
            void toggleBookmark(currentCardId);
          }
        }}
        hideDownvotedCards={hideDownvotedCards}
        onToggleHideDownvoted={handleToggleHideDownvoted}
        canGenerate={isOwner && !isLimitReached}
        cardsRemaining={isOwner ? cardsRemaining : null}
        onScrollToCard={(index) => {
          const card = cardsRef.current[index];
          if (card) {
            document
              .querySelector(`[data-card-id="${card.id}"]`)
              ?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      {cards.length === 0 && isInitialLoading && <StudyInitialLoadingScreen />}
      {cards.length === 0 && !isInitialLoading && isGenerating && <StudyGeneratingScreen />}
      {cards.length === 0 && !isInitialLoading && !isGenerating && isLimitReached && (
        <StudyLimitReachedScreen />
      )}
      {cards.length === 0 && !isInitialLoading && !isGenerating && !isLimitReached && (
        <StudyEmptyScreen
          canGenerate={isOwner && !isLimitReached}
          onGenerate={() => void generateMore(cardCount)}
          isGenerating={isManualGenerating}
        />
      )}

      {visibleCards.map((card) => (
        <div key={card.id} className="w-full min-h-screen snap-start snap-always">
          <InfoCard
            card={card}
            fontSize={fontSize}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void rateCard(card.id, 1)}
                  title={t('study.rateHelpful')}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    (cardRatings[card.id] ?? 0) === 1
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/20'
                  }`}
                >
                  <ThumbsUp
                    className={`h-3.5 w-3.5 ${(cardRatings[card.id] ?? 0) === 1 ? 'fill-current' : ''}`}
                  />
                  <span>{t('study.rateHelpfulShort')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void rateCard(card.id, -1)}
                  title={t('study.rateNotHelpful')}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    (cardRatings[card.id] ?? 0) === -1
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/20'
                  }`}
                >
                  <ThumbsDown
                    className={`h-3.5 w-3.5 ${(cardRatings[card.id] ?? 0) === -1 ? 'fill-current' : ''}`}
                  />
                  <span>{t('study.rateNotHelpfulShort')}</span>
                </button>

                {isOwner && !isLimitReached ? (
                  <button
                    type="button"
                    onClick={() => void handleRegenerateCard(card.id)}
                    disabled={isRegeneratingCard}
                    title={t('study.regenerateCard')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles
                      className={`h-3.5 w-3.5 ${isRegeneratingCard ? 'animate-pulse' : ''}`}
                    />
                    <span>{t('study.regenerateCard')}</span>
                  </button>
                ) : null}
              </>
            }
          />
        </div>
      ))}

      {(isGenerating || isManualGenerating) && cards.length > 0 && (
        <div className="snap-start snap-always">
          <StudyLoadingMoreScreen />
        </div>
      )}
      {isLimitReached && cards.length > 0 && !isGenerating && !isManualGenerating && (
        <div className="w-full min-h-screen snap-start snap-always flex items-center justify-center bg-background px-6">
          <div className="w-full max-w-xs text-center space-y-6">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto" strokeWidth={1.5} />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                {t('study.limitReachedTitle')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('study.limitReachedDescription')}</p>
            </div>
          </div>
        </div>
      )}
      {done && (
        <div className="snap-start snap-always">
          <StudyDoneScreen />
        </div>
      )}
    </main>
  );
}
