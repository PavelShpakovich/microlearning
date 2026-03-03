import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';

/**
 * Get server session - use in Server Components and API routes
 */
export async function auth(): Promise<Session | null> {
  return getServerSession() as Promise<Session | null>;
}
