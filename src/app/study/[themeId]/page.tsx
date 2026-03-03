'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import { InfoCard } from '@/components/info-card';
import type { CardRow } from '@/lib/supabase/types';

interface StudyPageProps {
  params: Promise<{ themeId: string }>;
}

interface CardsResponse {
  cards: CardRow[];
  remaining: number;
  generating: boolean;
}

export default function StudyPage({ params }: StudyPageProps) {
  const { themeId } = use(params);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infiniteMode, setInfiniteMode] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Track which cards have been marked as seen
  const seenIds = useRef(new Set<string>());

  // Prevent React StrictMode double-mount
  const sessionInitiated = useRef(false);

  // Poll timer for when we're waiting for generation
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IntersectionObserver setup ref
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElementsRef = useRef<Set<Element>>(new Set());

  // Initialize session once
  useEffect(() => {
    if (sessionInitiated.current) return;
    sessionInitiated.current = true;

    async function initSession() {
      try {
        const res = await fetch('/api/session/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId }),
        });
        const data = (await res.json()) as { sessionId: string };
        setSessionId(data.sessionId);
      } catch {
        setError('Failed to start study session');
        setLoading(false);
      }
    }

    void initSession();

    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [themeId]);

  // Mark a card as seen
  const markCardSeen = useCallback(
    async (cardId: string) => {
      if (!sessionId || seenIds.current.has(cardId)) return;
      seenIds.current.add(cardId);

      try {
        await fetch('/api/session/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, cardId }),
        });
      } catch {
        // Silently fail, don't disrupt the user experience
      }
    },
    [sessionId],
  );

  // Fetch the first batch of cards
  const fetchCards = useCallback(async () => {
    if (!sessionId) return;
    setError(null);

    try {
      console.log(`[fetchCards] Fetching for sessionId=${sessionId}, themeId=${themeId}`);
      const res = await fetch(`/api/cards?sessionId=${sessionId}&themeId=${themeId}`);
      const data = (await res.json()) as CardsResponse;

      console.log(
        `[fetchCards] Got ${data.cards.length} cards, remaining=${data.remaining}, generating=${data.generating}`,
      );

      if (data.cards.length > 0) {
        setCards((prev) => [...prev, ...data.cards]);
      }
      setRemaining(data.remaining);
      setGenerating(data.generating);

      // If infinite mode is enabled and generation is running, poll again in 3s
      // This handles: initial generation, or generation after cards are consumed
      if (infiniteMode && data.generating) {
        console.log(`[fetchCards] Infinite mode: generation in progress, polling again in 3s...`);
        if (pollTimer.current) clearTimeout(pollTimer.current);
        pollTimer.current = setTimeout(() => {
          console.log(`[fetchCards] 3s poll timer fired, fetching again`);
          void fetchCards();
        }, 3000);
      } else if (infiniteMode && data.cards.length === 0 && !data.generating) {
        console.log(`[fetchCards] Infinite mode: no cards and generating=false, marking as done`);
        // No cards and not generating = we're done
        setDone(true);
      } else {
        // Either infinite mode disabled or we got cards and generation paused - clear polling
        if (pollTimer.current) {
          clearTimeout(pollTimer.current);
          pollTimer.current = null;
        }
      }

      setLoading(false);
    } catch (err) {
      console.error(`[fetchCards] Error:`, err);
      setError('Failed to load cards');
      setLoading(false);
    }
  }, [sessionId, themeId, infiniteMode]);

  // Fetch first batch when session is ready
  useEffect(() => {
    if (sessionId && cards.length === 0) {
      void fetchCards();
    }
  }, [sessionId, cards.length, fetchCards]);

  // Handle infinite mode toggle
  useEffect(() => {
    if (!infiniteMode) {
      // Clear polling when infinite mode is disabled
      if (pollTimer.current) {
        clearTimeout(pollTimer.current);
        pollTimer.current = null;
      }
      console.log('[Toggle] Infinite mode disabled, cleared polling');
    }
  }, [infiniteMode]);

  // Set up IntersectionObserver to track visible cards and load more on demand
  useEffect(() => {
    if (!sessionId) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Mark card as seen when ≥80% visible
          if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
            const cardId = entry.target.getAttribute('data-card-id');
            if (cardId) {
              void markCardSeen(cardId);
            }
          }

          // Load more cards when the 3rd-from-last card becomes visible
          if (entry.isIntersecting && entry.target.hasAttribute('data-load-more')) {
            void fetchCards();
          }
        }
      },
      { threshold: 0.8 },
    );

    // Observe all current and future info cards
    const observer = observerRef.current;
    const interval = setInterval(() => {
      const cardElements = document.querySelectorAll('[data-card-id]');
      cardElements.forEach((card) => {
        if (!observedElementsRef.current.has(card)) {
          observer.observe(card);
          observedElementsRef.current.add(card);
        }
      });

      // Also observe the load-more sentinel
      const sentinel = document.querySelector('[data-load-more]');
      if (sentinel && !observedElementsRef.current.has(sentinel)) {
        observer.observe(sentinel);
        observedElementsRef.current.add(sentinel);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [sessionId, markCardSeen, fetchCards]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const main = document.querySelector('main');
      if (!main) return;

      switch (e.key.toLowerCase()) {
        case 'arrowright':
          e.preventDefault();
          main.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
          break;
        case 'arrowleft':
          e.preventDefault();
          main.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
          break;
        case 'i':
          e.preventDefault();
          setInfiniteMode((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track scroll position to show current card
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;

    const handleScroll = () => {
      const scrollTop = main.scrollTop;
      const viewport = window.innerHeight;
      const index = Math.floor((scrollTop + viewport / 2) / viewport);
      setCurrentCardIndex(Math.max(0, index));
    };

    main.addEventListener('scroll', handleScroll);
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  if (error) {
    return (
      <main className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-6">
          <p role="alert" className="mb-4 text-red-600 font-semibold">
            {error}
          </p>
          <button
            onClick={() => {
              setError(null);
              void fetchCards();
            }}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-500">Loading your study session…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-y-scroll snap-y snap-mandatory relative bg-gray-50">
      {/* Progress bar and controls */}
      <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-md border border-gray-200 p-4 flex flex-col gap-4 max-w-xs">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-gray-700">
            <span>Progress</span>
            <span className="text-blue-600">{currentCardIndex + 1} / {cards.length + (remaining || 0)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: cards.length + (remaining || 0) > 0 
                  ? `${((currentCardIndex + 1) / (cards.length + (remaining || 0))) * 100}%`
                  : '0%'
              }}
            />
          </div>
        </div>

        {/* Infinite mode toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={infiniteMode}
              onChange={(e) => {
                console.log(`[Toggle] Infinite mode: ${e.target.checked}`);
                setInfiniteMode(e.target.checked);
              }}
              className="w-4 h-4 rounded"
            />
            <span className="font-medium text-gray-700">∞ Infinite</span>
          </label>
        </div>
        
        {/* Keyboard shortcuts hint */}
        <div className="border-t border-gray-200 pt-2 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700 mb-1">Shortcuts:</p>
          <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">→</kbd> Next</p>
          <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">←</kbd> Previous</p>
          <p><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">I</kbd> Infinite</p>
        </div>
      </div>

      {/* Show generating screen on first load if no cards yet */}
      {cards.length === 0 && generating && (
        <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-indigo-600 snap-start snap-always">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">⚙️</div>
            <p className="text-white text-lg font-semibold">Generating your cards…</p>
            <p className="text-white text-sm opacity-80 mt-2">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Render all fetched cards */}
      {cards.map((card) => (
        <div key={card.id} data-card-id={card.id}>
          <InfoCard card={card} themeId={themeId} onVisible={() => markCardSeen(card.id)} />
        </div>
      ))}

      {/* Generating indicator (intercalated if we're loading more) */}
      {generating && cards.length > 0 && (
        <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-gray-400 to-gray-600 snap-start snap-always">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">⚙️</div>
            <p className="text-white text-lg font-semibold">Generating new cards…</p>
          </div>
        </div>
      )}

      {/* Load-more sentinel: show when infinite mode is on */}
      {!done && infiniteMode && (generating || (remaining && remaining > 0)) && (
        <div
          data-load-more="true"
          className="w-full h-24 bg-gray-100 flex items-center justify-center text-gray-400 text-sm snap-start"
        >
          {generating ? 'Generating…' : 'Loading more…'}
        </div>
      )}

      {/* Final "all done" screen */}
      {done && (
        <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-green-400 to-emerald-600 snap-start snap-always">
          <div className="text-center text-white px-6">
            <p className="text-6xl mb-6">🎉</p>
            <h2 className="text-4xl font-bold mb-4">You&apos;ve mastered this topic!</h2>
            <p className="text-lg mb-8 opacity-90">
              You&apos;ve viewed all cards for this session.
            </p>
            <a
              href="/dashboard"
              className="inline-block bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
