import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUserAccessPolicy, getUserUsage } from '@/lib/access-utils';
import { logger } from '@/lib/logger';
import { isTelegramStubEmail } from '@/lib/auth/user-accounts';

/**
 * GET /api/admin/users
 * Paginated list of all users with their current workspace usage info.
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
      return NextResponse.json({ error: 'Не удалось загрузить пользователей' }, { status: 500 });
    }

    // Enrich each user with profile and workspace usage data.
    const enrichedUsers = await Promise.all(
      usersData.users.map(async (authUser) => {
        try {
          const email = isTelegramStubEmail(authUser.email) ? null : (authUser.email ?? null);

          // Get profile and current workspace access info
          const [profileRes, accessPolicyRes, usageRes] = await Promise.all([
            supabaseAdmin
              .from('profiles')
              .select('display_name, is_admin')
              .eq('id', authUser.id)
              .single(),
            getUserAccessPolicy(authUser.id),
            getUserUsage(authUser.id),
          ]);

          return {
            id: authUser.id,
            email,
            telegramId: null,
            displayName: profileRes.data?.display_name || 'Unknown',
            isAdmin: profileRes.data?.is_admin || false,
            isEmailVerified: Boolean(authUser.email_confirmed_at),
            accessMode: accessPolicyRes.accessMode,
            chartsLimit: accessPolicyRes.chartsLimit,
            chartsUsed: usageRes.chartsCreated,
            chartsRemaining: usageRes.chartsRemaining,
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
            accessMode: 'direct',
            chartsLimit: 0,
            chartsUsed: 0,
            chartsRemaining: 0,
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
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
});
