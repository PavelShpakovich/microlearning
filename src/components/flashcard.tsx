'use client';

import { useState } from 'react';
import type { CardRow } from '@/lib/supabase/types';

interface FlashcardProps {
  card: Pick<CardRow, 'title' | 'body'>;
  onNext: () => void;
}

export function Flashcard({ card, onNext }: FlashcardProps) {
  const [revealed, setRevealed] = useState(false);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!revealed) {
        setRevealed(true);
      } else {
        handleNext();
      }
    }
  }

  function handleNext() {
    setRevealed(false);
    onNext();
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="button"
        tabIndex={0}
        aria-label={
          revealed
            ? 'Card body — press Enter or Space for next card'
            : 'Reveal body — press Enter or Space'
        }
        onKeyDown={handleKeyDown}
        className="min-h-48 cursor-pointer rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => !revealed && setRevealed(true)}
      >
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-gray-400">
          {revealed ? 'Info' : 'Title'}
        </p>
        <p className="text-lg font-medium leading-relaxed text-gray-900">
          {revealed ? card.body : card.title}
        </p>
      </div>

      <div className="flex gap-3">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Reveal info
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex-1 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Next card →
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-400">
        Press <kbd className="rounded border border-gray-300 px-1 py-0.5 font-mono">Space</kbd> or{' '}
        <kbd className="rounded border border-gray-300 px-1 py-0.5 font-mono">Enter</kbd> to{' '}
        {revealed ? 'go to next card' : 'reveal info'}
      </p>
    </div>
  );
}
