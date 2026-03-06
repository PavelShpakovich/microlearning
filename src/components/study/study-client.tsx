'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { InfoCard } from '@/components/info-card';
import { useStudySession } from '@/hooks/use-study-session';
import { useCardFontSize } from '@/hooks/use-card-font-size';
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
import { Lock } from 'lucide-react';

interface StudyClientProps {
  themeId: string;
  isOwner?: boolean;
}

const STUDY_ERROR_KEYS: Record<string, string> = {
  GENERATION_FAILED: 'study.generationFailed',
  LOAD_FAILED: 'study.loadFailed',
};

export function StudyClient({ themeId, isOwner = true }: StudyClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [resumeDismissed, setResumeDismissed] = useState(false);
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
    infiniteMode,
    error,
    cardCount,
    fetchCards,
    markCardSeen,
    generateMore,
    setInfiniteMode,
    setCardCount,
  } = useStudySession(themeId);

  // Disable infinite mode for non-owners (they can't generate)
  useEffect(() => {
    if (!isOwner && infiniteMode) {
      setInfiniteMode(false);
    }
  }, [isOwner, infiniteMode, setInfiniteMode]);

  // Compute resume index: first card after the last seen card in deck order.
  // Kept as a live computation so "Continue" can always scroll to the right card.
  const resumeIndex = (() => {
    if (seenCardIds.length === 0 || cards.length === 0) return 0;
    const seenSet = new Set(seenCardIds);
    let lastSeenIdx = -1;
    for (let i = 0; i < cards.length; i++) {
      if (seenSet.has(cards[i].id)) lastSeenIdx = i;
    }
    return lastSeenIdx + 1;
  })();

  // Freeze resume eligibility ONCE when initial loading completes.
  // New cards arriving from auto-generation must NOT re-trigger this prompt mid-session.
  useEffect(() => {
    if (isInitialLoading || resumeEvaluatedRef.current) return;
    resumeEvaluatedRef.current = true;
    setResumeEligible(
      cards.length > 0 && seenCardIds.length > 0 && resumeIndex > 0 && resumeIndex < cards.length,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoading]); // intentionally only react to loading completion, not card/seen changes

  // Show resume prompt only if it was eligible at initial-load completion and not yet dismissed
  const showResumePrompt = resumeEligible && !resumeDismissed;

  const done =
    !infiniteMode && cards.length > 0 && !isGenerating && !isManualGenerating && session?.id;

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

    const handleScroll = () => {
      const index = Math.floor((main.scrollTop + window.innerHeight / 2) / window.innerHeight);
      // Clamp to [0, cards.length - 1] so that snap-items appended for loading/done
      // screens never push currentCardIndex past the real card count.
      const maxIndex = Math.max(0, cardCountRef.current - 1);
      setCurrentCardIndex(Math.max(0, Math.min(index, maxIndex)));
    };

    main.addEventListener('scroll', handleScroll);
    return () => main.removeEventListener('scroll', handleScroll);
  }, [session?.id]);

  // Auto-scroll to newly generated cards if the user is at the bottom (viewing the loader)
  const prevCardCountRef = useRef(cards.length);
  // Keep a ref to cards.length so the scroll handler can clamp the index
  // without needing cards in its dependency array (which would re-register
  // the listener on every card append).
  const cardCountRef = useRef(cards.length);
  // Update synchronously during render (safe for refs — no re-render triggered)

  cardCountRef.current = cards.length;
  useEffect(() => {
    if (cards.length > prevCardCountRef.current) {
      // If user was viewing the loader (index == prevLength) or further
      if (currentCardIndex >= prevCardCountRef.current - 1) {
        const firstNewCard = cards[prevCardCountRef.current];
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
    prevCardCountRef.current = cards.length;
  }, [cards, currentCardIndex]);

  useEffect(() => {
    if (!infiniteMode || !session?.id || cards.length === 0 || isGenerating || isLimitReached)
      return;

    const cardsLeft = cards.length - currentCardIndex;
    const alreadyTriggeredForBatch = triggerFetchedAtRef.current === cards.length;

    if (cardsLeft <= 2 && !alreadyTriggeredForBatch) {
      triggerFetchedAtRef.current = cards.length;
      void fetchCards({ triggerGeneration: true });
    }
  }, [
    currentCardIndex,
    cards.length,
    infiniteMode,
    session?.id,
    isGenerating,
    isLimitReached,
    fetchCards,
  ]);

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
            {t('study.resumePrompt', { count: seenCardIds.length, total: cards.length })}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setResumeDismissed(true)}>
              {t('study.resumeStartOver')}
            </Button>
            <Button
              onClick={() => {
                setResumeDismissed(true);
                setTimeout(() => {
                  const card = cards[resumeIndex];
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
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 overflow-y-scroll snap-y snap-mandatory bg-background">
      <StudyBottomBar
        totalCards={cards.length}
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
        canGenerate={isOwner && !isLimitReached}
        cardsRemaining={isOwner ? cardsRemaining : null}
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

      {cards.map((card) => (
        <div key={card.id} className="w-full min-h-screen snap-start snap-always">
          <InfoCard card={card} fontSize={fontSize} />
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
