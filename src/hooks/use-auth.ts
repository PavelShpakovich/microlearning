'use client';

import { useSession } from 'next-auth/react';
import { Session } from 'next-auth';

/**
 * Hook to access the current user session in Client Components
 * Replaces manual Supabase session management
 *
 * @example
 * const { session, status } = useAuth();
 * if (status === 'loading') return <Skeleton />;
 * if (status === 'unauthenticated') return <LoginCTA />;
 * return <Dashboard user={session.user} />;
 */
export function useAuth() {
  const { data: session, status } = useSession();

  return {
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    user: session?.user,
  };
}
