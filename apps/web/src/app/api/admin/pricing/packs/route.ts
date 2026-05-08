import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { invalidatePricingCache } from '@/lib/credits/pricing';
import type { Database } from '@/lib/supabase/types';

type CreditPackUpdate = Database['public']['Tables']['credit_packs']['Update'];

const updateSchema = z.object({
  packId: z.string().min(1),
  credits: z.number().int().min(1).max(1000).optional(),
  active: z.boolean().optional(),
});

export const PATCH = withApiHandler(async (req: Request) => {
  await requireAdmin();

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 422 },
    );
  }

  const { packId, credits, active } = parsed.data;

  const updates: CreditPackUpdate = { updated_at: new Date().toISOString() };
  if (credits !== undefined) updates.credits = credits;
  if (active !== undefined) updates.active = active;

  const { data, error } = await supabaseAdmin
    .from('credit_packs')
    .update(updates)
    .eq('id', packId)
    .select('id, name, credits, active, sort_order')
    .single();

  if (error) throw error;

  invalidatePricingCache();

  return NextResponse.json({ success: true, pack: data });
});
