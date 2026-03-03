import { auth } from '@/auth';
import { logger } from '@/lib/logger';

/**
 * Get the current user session, throw if not authenticated
 * Use in:
 * - API routes: GET /api/themes
 * - Server Components: getThemes from dashboard
 * - Server Actions: exportCards()
 */
export async function getRequiredSession() {
  const session = await auth();

  if (!session || !session.user) {
    logger.warn('Attempted access without session');
    throw new Error('Unauthorized: Session required');
  }

  return session;
}

/**
 * Get the current user session, return null if not authenticated
 * Use in:
 * - Middleware checks: redirect vs continue
 * - Optional feature evaluation: show/hide premium UI
 */
export async function getOptionalSession() {
  return await auth();
}
