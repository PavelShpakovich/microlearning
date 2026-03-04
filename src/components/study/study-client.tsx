'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { InfoCard } from '@/components/info-card';
import { useStudySession } from '@/hooks/use-study-session';
import { StudyBottomBar } from '@/components/study/study-bottom-bar';
import {
  StudyDoneScreen,
  StudyGeneratingScreen,
  StudyInitialLoadingScreen,
  StudyLoadingMoreScreen,
} from '@/components/study/study-state-screens';
import { useTranslations } from 'next-intl';

interface StudyClientProps {
  themeId: string;
  isOwner?: boolean;
}

export function StudyClient({ themeId, isOwner = true }: StudyClientProps) {
  const t = useTranslations();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const triggerFetchedAtRef = useRef<number>(-1);

  const {
    cards,
    session,
    isGenerating,
    isManualGenerating,
    isInitialLoading,
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

  const done = !infiniteMode && cards.length > 0 && !isGenerating && session?.id;

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
    const main = document.querySelector('main');
    if (!main) return;

    const handleScroll = () => {
      const index = Math.floor((main.scrollTop + window.innerHeight / 2) / window.innerHeight);
      setCurrentCardIndex(Math.max(0, index));
    };

    main.addEventListener('scroll', handleScroll);
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to newly generated cards if the user is at the bottom (viewing the loader)
  const prevCardCountRef = useRef(cards.length);
  useEffect(() => {
    if (cards.length > prevCardCountRef.current) {
      // If user was viewing the loader (index == prevLength) or further
      if (currentCardIndex >= prevCardCountRef.current) {
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
    if (!infiniteMode || !session?.id || cards.length === 0 || isGenerating) return;

    const cardsLeft = cards.length - currentCardIndex;
    const alreadyTriggeredForBatch = triggerFetchedAtRef.current === cards.length;

    if (cardsLeft <= 2 && !alreadyTriggeredForBatch) {
      triggerFetchedAtRef.current = cards.length;
      void fetchCards({ triggerGeneration: true });
    }
  }, [currentCardIndex, cards.length, infiniteMode, session?.id, isGenerating, fetchCards]);

  if (error) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <p role="alert" className="mb-4 text-destructive font-semibold">
            {error}
          </p>
          <button
            onClick={() => void fetchCards()}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {t('study.retry')}
          </button>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('study.loadingSession')}</p>
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
        onToggleInfiniteMode={() => setInfiniteMode((prev) => !prev)}
        onGenerateMore={(count) => void generateMore(count)}
        onSetCardCount={setCardCount}
        canGenerate={isOwner}
      />

      {cards.length === 0 && isInitialLoading && <StudyInitialLoadingScreen />}
      {cards.length === 0 && !isInitialLoading && isGenerating && <StudyGeneratingScreen />}

      {cards.map((card) => (
        <div
          key={card.id}
          data-card-id={card.id}
          className="w-full h-screen snap-start snap-always"
        >
          <InfoCard card={card} />
        </div>
      ))}

      {isGenerating && cards.length > 0 && <StudyLoadingMoreScreen />}
      {done && !isGenerating && <StudyDoneScreen />}
    </main>
  );
}
