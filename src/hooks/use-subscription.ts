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
import { useSession } from 'next-auth/react';
import type { AvailablePlan, SubscriptionStatusResponse } from '@/lib/billing/subscription-types';

/**
 * Shared subscription status hook.
 *
 * All consumers share a single SubscriptionProvider context.
 * A refetch() from any component instantly updates UsageCard,
 * UsageBanner, PlansCard, etc.
 */

export interface SubscriptionStatus extends SubscriptionStatusResponse {
  availablePlans: AvailablePlan[];
}

interface SubscriptionResponse {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<SubscriptionStatus | null>;
}

const SubscriptionContext = createContext<SubscriptionResponse | null>(null);

function useFetchSubscription(): SubscriptionResponse {
  const { status: authStatus } = useSession();
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

  const fetchSubscription = useCallback(async (): Promise<SubscriptionStatus | null> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile/subscription');
      if (!response.ok) {
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }
      const data = (await response.json()) as SubscriptionStatus;
      if (mountedRef.current) {
        setStatus(data);
        setError(null);
      }
      return data;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus(null);
      }
      return null;
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      setIsLoading(false);
      return;
    }
    void fetchSubscription();
  }, [fetchSubscription, authStatus]);

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
