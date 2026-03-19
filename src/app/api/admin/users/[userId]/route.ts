import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * DELETE /api/admin/users/[userId]
 * Permanently deletes a user account and all dependent data.
 */
export const DELETE = withApiHandler(async (_req: Request, ctx?: unknown) => {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;
  const { user: adminUser } = adminCheck;

  const { params } = (ctx as { params: Promise<Record<string, string>> } | undefined) || {};
  const { userId } = (await params) || {};

  if (!userId || typeof userId !== 'string') {
    throw new ValidationError({ message: 'userId is required' });
  }

  if (userId === adminUser.id) {
    throw new ValidationError({ message: 'Use account settings to delete your own account' });
  }

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteError) {
    logger.error({ error: deleteError, adminId: adminUser.id, userId }, 'Failed to delete user');
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }

  logger.info({ adminId: adminUser.id, userId }, 'Admin deleted user');

  return NextResponse.json({
    success: true,
    message: 'User deleted successfully',
    userId,
  });
});
