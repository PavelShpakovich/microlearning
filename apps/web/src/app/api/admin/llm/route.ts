import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import {
  loadPrimaryProvider,
  savePrimaryProvider,
  getFallbackProviderId,
  type LlmProviderId,
} from '@/lib/llm/provider';

const setProviderSchema = z.object({
  primary: z.enum(['qwen', 'deepseek']),
});

/** GET /api/admin/llm — return current LLM configuration */
export const GET = withApiHandler(async () => {
  await requireAdmin();

  try {
    const primary = await loadPrimaryProvider();

    return NextResponse.json({
      primary,
      fallback: getFallbackProviderId(),
    });
  } catch (err) {
    console.error('Failed to load LLM provider config:', err);
    return NextResponse.json({ error: 'Failed to load LLM configuration' }, { status: 500 });
  }
});

/** POST /api/admin/llm — switch primary LLM provider at runtime */
export const POST = withApiHandler(async (req: Request) => {
  await requireAdmin();

  const parsed = setProviderSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 422 },
    );
  }

  try {
    await savePrimaryProvider(parsed.data.primary as LlmProviderId);

    const primary = await loadPrimaryProvider();

    return NextResponse.json({
      primary,
      fallback: getFallbackProviderId(),
    });
  } catch (err) {
    console.error('Failed to save LLM provider config:', err);
    return NextResponse.json({ error: 'Failed to save LLM configuration' }, { status: 500 });
  }
});
