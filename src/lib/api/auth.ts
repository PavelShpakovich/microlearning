import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auth } from '@/auth';
import { AuthError } from '@/lib/errors';
import { env } from '@/lib/env';
import { NextResponse } from 'next/server';

/**
 * Retrieves and validates the current authenticated user from the request cookies.
 * Throws AuthError if the session is missing or invalid.
 */
export async function requireAuth() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user: supabaseUser },
    error: supabaseAuthError,
  } = await supabase.auth.getUser();

  if (supabaseUser) {
    return { user: supabaseUser, supabase };
  }

  const session = await auth();
  const nextAuthUserId = session?.user?.id;

  if (nextAuthUserId) {
    return {
      user: { id: nextAuthUserId, isAdmin: session?.user?.isAdmin ?? false },
      supabase: supabaseAdmin,
    };
  }

  throw new AuthError({ message: 'Authentication required', cause: supabaseAuthError });
}

/**
 * Returns whether the authenticated user has admin privileges.
 *
 * Checks:
 * 1. `user.isAdmin` flag set in the NextAuth JWT (preferred — set from DB + ADMIN_EMAILS).
 * 2. Case-insensitive match against `ADMIN_EMAILS` env var for Supabase session users.
 */
function isAdminUser(user: Awaited<ReturnType<typeof requireAuth>>['user']): boolean {
  if ('isAdmin' in user && user.isAdmin === true) return true;

  if (env.ADMIN_EMAILS && 'email' in user && user.email) {
    const normalizedEmail = user.email.toLowerCase().trim();
    const adminEmails = env.ADMIN_EMAILS.split(',').map((e) => e.toLowerCase().trim());
    return adminEmails.includes(normalizedEmail);
  }

  return false;
}

/**
 * Requires the current user to be authenticated AND have admin privileges.
 * Returns a 403 NextResponse if the check fails (call `return` on the result).
 *
 * @example
 * const adminCheck = await requireAdmin();
 * if (adminCheck instanceof NextResponse) return adminCheck;
 * const { user } = adminCheck;
 */
export async function requireAdmin(): Promise<
  { user: Awaited<ReturnType<typeof requireAuth>>['user'] } | NextResponse
> {
  const { user } = await requireAuth();

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  return { user };
}
