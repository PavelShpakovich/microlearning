/**
 * Study API client — pure fetch wrapper (no React)
 * Centralizes all study session and card loading API calls
 */

import type { Database } from '@/lib/supabase/types';

type Card = Database['public']['Tables']['cards']['Row'];
export type CardRatingValue = -1 | 0 | 1;

export interface BookmarkListItem {
  cardId: string;
  createdAt: string;
  themeId: string;
  themeName: string;
  cardTitle: string;
  cardBody: string;
}

export interface CardsResponse {
  cards: Card[];
  remaining: number;
  generating: boolean;
  generationFailed?: boolean;
  limitReached?: boolean;
  cardsRemaining?: number;
}

export interface RegenerateCardResponse {
  card: Card;
  cardsRemaining: number;
}

export interface CardRatingsResponse {
  ratings: Record<string, CardRatingValue>;
}

interface FetchCardsOptions {
  triggerGeneration?: boolean;
  count?: number;
}

class StudyApi {
  /**
   * Initialize a study session for a theme
   */
  async initSession(
    themeId: string,
    signal?: AbortSignal,
  ): Promise<{ sessionId: string; seenCardIds: string[] }> {
    const res = await fetch('/api/session/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId }),
      signal,
    });

    if (!res.ok) {
      throw new Error('Failed to initialize session');
    }

    return res.json();
  }

  /**
   * Fetch cards for a session
   */
  async fetchCards(
    sessionId: string,
    themeId: string,
    options?: FetchCardsOptions & { signal?: AbortSignal },
  ): Promise<CardsResponse> {
    const params = new URLSearchParams({
      sessionId,
      themeId,
      triggerGeneration: options?.triggerGeneration ? '1' : '0',
    });

    if (options?.count) {
      params.append('count', options.count.toString());
    }

    const res = await fetch(`/api/cards?${params.toString()}`, {
      signal: options?.signal,
    });

    if (!res.ok) {
      throw new Error('Failed to fetch cards');
    }

    return res.json();
  }

  /**
   * Mark a card as seen in the session
   */
  async markCardSeen(sessionId: string, cardId: string, signal?: AbortSignal): Promise<void> {
    const res = await fetch('/api/session/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, cardId }),
      signal,
    });

    if (!res.ok) {
      throw new Error('Failed to mark card as seen');
    }
  }

  async fetchBookmarkedCardIds(signal?: AbortSignal): Promise<string[]> {
    const res = await fetch('/api/bookmarks?idsOnly=1', { signal });

    if (!res.ok) {
      throw new Error('Failed to fetch bookmarks');
    }

    const data = (await res.json()) as { cardIds: string[] };
    return data.cardIds;
  }

  async fetchCardRatings(
    themeId: string,
    signal?: AbortSignal,
  ): Promise<Record<string, CardRatingValue>> {
    const res = await fetch(`/api/cards/ratings?themeId=${encodeURIComponent(themeId)}`, {
      signal,
    });

    if (!res.ok) {
      throw new Error('Failed to fetch card ratings');
    }

    const data = (await res.json()) as CardRatingsResponse;
    return data.ratings;
  }

  async fetchBookmarks(signal?: AbortSignal): Promise<BookmarkListItem[]> {
    const res = await fetch('/api/bookmarks', { signal });

    if (!res.ok) {
      throw new Error('Failed to fetch bookmarks');
    }

    const data = (await res.json()) as { bookmarks: BookmarkListItem[] };
    return data.bookmarks;
  }

  async bookmarkCard(cardId: string, signal?: AbortSignal): Promise<void> {
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId }),
      signal,
    });

    if (!res.ok) {
      throw new Error('Failed to bookmark card');
    }
  }

  async unbookmarkCard(cardId: string, signal?: AbortSignal): Promise<void> {
    const res = await fetch(`/api/bookmarks/${cardId}`, {
      method: 'DELETE',
      signal,
    });

    if (!res.ok) {
      throw new Error('Failed to remove bookmark');
    }
  }

  async regenerateCard(cardId: string, signal?: AbortSignal): Promise<RegenerateCardResponse> {
    const res = await fetch(`/api/cards/${cardId}/regenerate`, {
      method: 'POST',
      signal,
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to regenerate card');
    }

    return (await res.json()) as RegenerateCardResponse;
  }

  async rateCard(
    cardId: string,
    rating: CardRatingValue,
    signal?: AbortSignal,
  ): Promise<CardRatingValue> {
    const res = await fetch(`/api/cards/${cardId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
      signal,
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to rate card');
    }

    const data = (await res.json()) as { rating: CardRatingValue };
    return data.rating;
  }
}

export const studyApi = new StudyApi();
