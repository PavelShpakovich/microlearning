import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, PlanLimitError, ValidationError } from '@/lib/errors';
import { getUserPlan } from '@/lib/subscription-utils';

const updateThemeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  is_public: z.boolean().optional(),
});

export const GET = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const { pathname } = new URL(req.url);
  const themeId = pathname.split('/').pop();

  if (!themeId) {
    throw new ValidationError({ message: 'Invalid theme ID' });
  }

  // User can view their own theme or any public theme
  const { data: theme } = await supabase
    .from('themes')
    .select('*')
    .eq('id', themeId)
    .or(`user_id.eq.${user.id},is_public.eq.true`)
    .maybeSingle();

  if (!theme) {
    throw new NotFoundError({ message: 'Theme not found' });
  }

  return NextResponse.json({ theme });
});

export const PATCH = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const { pathname } = new URL(req.url);
  const themeId = pathname.split('/').pop();

  if (!themeId) {
    throw new ValidationError({ message: 'Invalid theme ID' });
  }

  // Verify ownership before allowing updates
  const { data: existingTheme } = await supabase
    .from('themes')
    .select('user_id')
    .eq('id', themeId)
    .maybeSingle();

  if (!existingTheme) {
    throw new NotFoundError({ message: 'Theme not found' });
  }

  if (existingTheme.user_id !== user.id) {
    throw new NotFoundError({ message: 'You do not have permission to edit this theme' });
  }

  const body = updateThemeSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.name !== undefined) updateData.name = body.data.name;
  if (body.data.description !== undefined) updateData.description = body.data.description;
  if (body.data.is_public !== undefined) {
    // Only plans with community_themes access can make themes public
    if (body.data.is_public === true) {
      const plan = await getUserPlan(user.id);
      if (!plan.communityThemes) {
        throw new PlanLimitError({
          message: 'Public theme sharing is currently unavailable for this account.',
        });
      }
    }
    updateData.is_public = body.data.is_public;
  }

  const { data: updatedTheme, error } = await supabase
    .from('themes')
    .update(updateData)
    .eq('id', themeId)
    .select()
    .single();

  if (error ?? !updatedTheme) {
    throw error ?? new Error('Failed to update theme');
  }

  return NextResponse.json({ theme: updatedTheme });
});

export const DELETE = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const { pathname } = new URL(req.url);
  const themeId = pathname.split('/').pop();

  if (!themeId) {
    throw new ValidationError({ message: 'Invalid theme ID' });
  }

  // Verify ownership before allowing deletion
  const { data: existingTheme } = await supabase
    .from('themes')
    .select('user_id')
    .eq('id', themeId)
    .maybeSingle();

  if (!existingTheme) {
    throw new NotFoundError({ message: 'Theme not found' });
  }

  if (existingTheme.user_id !== user.id) {
    throw new NotFoundError({ message: 'You do not have permission to delete this theme' });
  }

  const { error } = await supabase.from('themes').delete().eq('id', themeId);

  if (error) {
    throw error;
  }

  return NextResponse.json({ success: true });
});
