import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUserPlan, getUserUsage } from '@/lib/subscription-utils';
import { logger } from '@/lib/logger';
import { isTelegramStubEmail } from '@/lib/auth/user-accounts';

/**
 * GET /api/admin/users
 * Paginated list of all users with their subscription info
 * Query params:
 *  - page: page number (default 1, 1-indexed)
 *  - perPage: items per page (default 20, max 100)
 */
export const GET = withApiHandler(async (req: Request) => {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  const url = new URL(req.url);
  const pageStr = url.searchParams.get('page') ?? '1';
  const perPageStr = url.searchParams.get('perPage') ?? '20';

  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(perPageStr, 10) || 20));

  try {
    // Fetch all users using Supabase admin API
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      perPage,
      page,
    });

    if (usersError || !usersData) {
      logger.error({ error: usersError }, 'Failed to list users');
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Enrich each user with subscription and profile data
    const enrichedUsers = await Promise.all(
      usersData.users.map(async (authUser) => {
        try {
          const email = isTelegramStubEmail(authUser.email) ? null : (authUser.email ?? null);

          // Get profile and subscription info
          const [profileRes, planRes, usageRes] = await Promise.all([
            supabaseAdmin
              .from('profiles')
              .select('display_name, is_admin, telegram_id')
              .eq('id', authUser.id)
              .single(),
            getUserPlan(authUser.id),
            getUserUsage(authUser.id),
          ]);

          return {
            id: authUser.id,
            email,
            telegramId: profileRes.data?.telegram_id ?? null,
            displayName: profileRes.data?.display_name || 'Unknown',
            isAdmin: profileRes.data?.is_admin || false,
            isEmailVerified: Boolean(authUser.email_confirmed_at),
            plan: planRes.planId,
            cardsPerMonth: planRes.cardsPerMonth,
            cardsUsed: usageRes.cardsGenerated,
            cardsRemaining: usageRes.cardsRemaining,
            createdAt: authUser.created_at,
          };
        } catch (error) {
          logger.error({ error, userId: authUser.id }, 'Failed to enrich user data');
          return {
            id: authUser.id,
            email: isTelegramStubEmail(authUser.email) ? null : (authUser.email ?? null),
            displayName: 'Error',
            isAdmin: false,
            isEmailVerified: Boolean(authUser.email_confirmed_at),
            plan: 'error',
            cardsPerMonth: 0,
            cardsUsed: 0,
            cardsRemaining: 0,
            createdAt: authUser.created_at,
          };
        }
      }),
    );

    return NextResponse.json({
      users: enrichedUsers,
      pagination: {
        page,
        perPage,
        total: usersData.users.length, // Note: Supabase listUsers returns exact page results, not total count
      },
    });
  } catch (error) {
    logger.error({ error }, 'Admin users endpoint error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
