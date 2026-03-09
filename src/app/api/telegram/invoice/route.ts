import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/auth';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError, AppError } from '@/lib/errors';
import {
  createTelegramInvoiceLink,
  getPlanStarsPrice,
  getPlanDetails,
} from '@/lib/telegram-stars';

const invoiceRequestSchema = z.object({
  planId: z.enum(['basic', 'pro', 'max'] as const).refine(
    (val) => ['basic', 'pro', 'max'].includes(val),
    { message: 'Invalid plan. Must be basic, pro, or max.' }
  ),
});

/**
 * POST /api/telegram/invoice
 * 
 * Generate a Telegram Stars invoice link for plan upgrade.
 * 
 * Request body: { planId: 'basic' | 'pro' | 'max' }
 * Response: { invoiceLink: string }
 * 
 * The client will open this link with tg.openInvoice(invoiceLink, callback)
 */
export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  const body = invoiceRequestSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { planId } = body.data;

  try {
    // Get plan details and Stars price
    const planDetails = getPlanDetails(planId);
    const starsPrice = getPlanStarsPrice(planId);

    // Create invoice link via Telegram Bot API
    const invoiceLink = await createTelegramInvoiceLink(
      user.id,
      planId,
      planDetails.name,
      planDetails.description,
      starsPrice,
    );

    return NextResponse.json({ invoiceLink });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create invoice';
    console.error('Invoice creation error:', message);
    throw new AppError('INTERNAL_ERROR', { message });
  }
});

