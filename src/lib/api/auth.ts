import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthError } from '@/lib/errors';

/**
 * Retrieves and validates the current authenticated user from the request cookies.
 * Throws AuthError if the session is missing or invalid.
 */
export async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError({ message: 'Authentication required', cause: error });
  }

  return { user, supabase };
}
