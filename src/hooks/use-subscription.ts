'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Telegram Stars subscription status hook.
 * 
 * Since we now use Telegram Stars for payments only:
 * - Users must be inside Telegram to see paid features
 * - Subscription status is managed via Telegram in-app purchases
 * - This hook returns the user's tier based on database subscription record
 */

export interface SubscriptionStatus {
  // Plan information
  planId: 'free' | 'basic' | 'pro' | 'max';
  isPaid: boolean;
  expiresAt: string | null;
  inTelegram: boolean;
  
  // Backward compatibility with components expecting nested objects
  plan: {
    planId: 'free' | 'basic' | 'pro' | 'max';
    cardsPerMonth: number;
    themesLimit: number;
    maxThemes: number;
    communityThemes: number;
  };
  
  // Usage tracking
  usage: {
    cardsGenerated: number;
    cardsLimit: number;
    cardsRemaining: number;
    periodStart: string;
    periodEnd: string;
  };
  
  // Theme usage
  themesUsed: number;
}

interface SubscriptionResponse {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): SubscriptionResponse {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile/telegram-subscription');
      if (!response.ok) {
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }
      const data = (await response.json()) as SubscriptionStatus;
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return { status, isLoading, error, refetch: fetchSubscription };
}
