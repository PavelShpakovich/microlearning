'use client';

import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { AvailablePlan } from '@/app/api/profile/telegram-subscription/route';

/**
 * Telegram Stars subscription status hook.
 *
 * All consumers share a single SubscriptionProvider context.
 * A refetch() from any component (e.g. after a successful payment)
 * instantly updates UsageCard, UsageBanner, PlansCard, etc.
 */

export interface SubscriptionStatus {
  // Plan information
  planId: 'free' | 'basic' | 'pro' | 'max';
  isPaid: boolean;
  expiresAt: string | null;
  inTelegram: boolean;
  autoRenew: boolean;
  subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'none';

  // Backward compatibility with components expecting nested objects
  plan: {
    planId: 'free' | 'basic' | 'pro' | 'max';
    cardsPerMonth: number;
    themesLimit: number | null;
    maxThemes: number | null;
    communityThemes: boolean;
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

  // All available plans for display (from DB + env Stars prices)
  availablePlans: AvailablePlan[];
}

interface SubscriptionResponse {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionResponse | null>(null);

function useFetchSubscription(): SubscriptionResponse {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchSubscription = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile/telegram-subscription');
      if (!response.ok) {
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }
      const data = (await response.json()) as SubscriptionStatus;
      if (mountedRef.current) {
        setStatus(data);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus(null);
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  return { status, isLoading, error, refetch: fetchSubscription };
}

/**
 * Wrap the authenticated layout with this provider.
 * All useSubscription() calls inside will share the same state and refetch().
 */
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const value = useFetchSubscription();
  return createElement(SubscriptionContext.Provider, { value }, children);
}

/**
 * Returns shared subscription state from the nearest SubscriptionProvider.
 * Must be used inside <SubscriptionProvider> for shared state.
 */
export function useSubscription(): SubscriptionResponse {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return ctx;
}
