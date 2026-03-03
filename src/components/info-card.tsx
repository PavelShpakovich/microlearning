'use client';

import { useEffect, useState } from 'react';
import type { CardRow } from '@/lib/supabase/types';
import { useBookmark } from '@/hooks/use-bookmark';
import { Heart } from 'lucide-react';

/**
 * Deterministic gradient palette derived from themeId.
 * Each theme gets a consistent, visually appealing gradient.
 */
const GRADIENTS = [
  'from-orange-400 to-red-500', // warm orange
  'from-purple-400 to-indigo-600', // indigo-purple
  'from-teal-400 to-cyan-600', // teal
  'from-pink-400 to-rose-500', // rose
  'from-blue-400 to-purple-500', // blue-purple
  'from-green-400 to-emerald-600', // emerald
  'from-yellow-400 to-orange-500', // golden
  'from-red-400 to-pink-500', // coral
];

/**
 * Deterministic hash function to pick a gradient for a given themeId.
 */
function gradientFromThemeId(themeId: string): string {
  let hash = 0;
  for (let i = 0; i < themeId.length; i++) {
    const char = themeId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

interface InfoCardProps {
  card: Pick<CardRow, 'id' | 'title' | 'body'>;
  themeId: string;
  onVisible?: () => void; // Called when card becomes ≥80% visible (for marking seen)
}

export function InfoCard({ card, themeId, onVisible }: InfoCardProps) {
  const [hasCalledVisible, setHasCalledVisible] = useState(false);
  const { bookmarked, loading: bookmarkLoading, toggleBookmark } = useBookmark(card.id);

  useEffect(() => {
    if (hasCalledVisible || !onVisible) return;

    // IntersectionObserver will be set up by the parent (study page)
    // This component just renders the card; the parent handles intersection
  }, [hasCalledVisible, onVisible]);

  const gradient = gradientFromThemeId(themeId);

  return (
    <div
      className={`w-full h-screen flex items-center justify-center bg-gradient-to-br ${gradient} px-6 py-12 snap-start snap-always relative`}
      data-card-id={card.id}
      data-threshold="0.8"
    >
      {/* Bookmark button */}
      <button
        onClick={() => toggleBookmark()}
        disabled={bookmarkLoading}
        className="absolute top-6 right-6 p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition text-white disabled:opacity-50"
        title={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
      >
        <Heart
          className={`w-6 h-6 transition-all ${
            bookmarked ? 'fill-red-400 text-red-400' : 'text-white hover:text-red-300'
          }`}
        />
      </button>

      <div className="max-w-2xl text-white text-center">
        {/* Title */}
        <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight drop-shadow-lg">
          {card.title}
        </h2>

        {/* Body */}
        <p className="text-lg md:text-xl font-light leading-relaxed drop-shadow-md">{card.body}</p>

        {/* Subtle scroll indicator */}
        <div className="mt-12 flex justify-center animate-bounce opacity-70">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
