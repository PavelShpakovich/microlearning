import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { streamChatResponse, type ChatMessage } from '@/lib/llm/structured-generation';
import { getPrimaryProviderId, getProviderConfig } from '@/lib/llm/provider';
import { env } from '@/lib/env';

const db = supabaseAdmin;

const uuidSchema = z.string().uuid();
const sendMessageSchema = z.object({
  message: z.string().min(1).max(1000),
});

async function getReadingId(ctx: unknown): Promise<string | undefined> {
  const routeContext = ctx as { params?: Promise<{ readingId: string }> } | undefined;
  return routeContext?.params ? (await routeContext.params).readingId : undefined;
}

function buildSystemPrompt(
  reading: { title: string; reading_type: string; summary: string | null },
  sections: Array<{ title: string; content: string }>,
  chartPositions:
    | Array<{
        body_key: string;
        sign_key: string;
        house_number: number | null;
      }>
    | undefined,
  locale: string,
): string {
  const isEn = locale === 'en';

  const lines: string[] = isEn
    ? [
        "CRITICAL: Respond ONLY in English, regardless of the language of the user's question.",
        '',
        'You are a personal astrology assistant. You help the user understand their astrology reading.',
        '',
        `Reading type: ${reading.reading_type.replace(/_/g, ' ')}`,
        `Title: ${reading.title}`,
      ]
    : [
        'КРИТИЧЕСКИ ВАЖНО: Отвечай ТОЛЬКО на русском языке, независимо от языка вопроса пользователя.',
        '',
        'Ты — персональный ассистент-астролог. Ты помогаешь пользователю понять его астрологический разбор.',
        '',
        `Тип разбора: ${reading.reading_type.replace(/_/g, ' ')}`,
        `Название: ${reading.title}`,
      ];

  if (reading.summary) {
    lines.push(
      '',
      isEn ? 'Reading summary:' : 'Краткое содержание разбора:',
      reading.summary.slice(0, 600),
    );
  }

  if (chartPositions && chartPositions.length > 0) {
    lines.push('', isEn ? 'User natal chart:' : 'Натальная карта пользователя:');
    for (const p of chartPositions) {
      const housePart = p.house_number
        ? isEn
          ? `, house ${p.house_number}`
          : `, дом ${p.house_number}`
        : '';
      lines.push(`  - ${p.body_key} in ${p.sign_key}${housePart}`);
    }
  }

  if (sections.length > 0) {
    lines.push('', isEn ? 'Reading sections:' : 'Секции разбора:');
    for (const s of sections.slice(0, 5)) {
      lines.push('', `## ${s.title}`, s.content.slice(0, 500));
    }
  }

  if (isEn) {
    lines.push(
      '',
      'Respond in English. Be specific, reference data from this reading and the natal chart.',
      'If the user asks about specific planets or signs, use the natal chart data.',
      'Do not give medical, legal, or financial advice as a specialist.',
      'Present answers as astrological interpretation.',
    );
  } else {
    lines.push(
      '',
      'Отвечай на русском языке. Будь конкретным, опирайся на данные этого разбора и натальную карту.',
      'Если пользователь спрашивает о конкретных планетах или знаках, используй данные натальной карты.',
      'Не давай медицинских, юридических или финансовых советов как специалист.',
      'Представляй ответы как астрологическую интерпретацию.',
    );
  }

  return lines.join('\n');
}

// GET /api/chat/[readingId]
// Returns (or creates) the thread + its messages.
export const GET = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const readingId = await getReadingId(ctx);

  if (!readingId || !uuidSchema.safeParse(readingId).success) {
    throw new ValidationError({ message: 'Invalid reading ID' });
  }

  const { data: reading } = await db
    .from('readings')
    .select('id, title, chart_id')
    .eq('id', readingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!reading) {
    throw new NotFoundError({ message: 'Reading not found' });
  }

  // Get or create thread (upsert with unique constraint on reading_id + user_id)
  const { data: thread } = await db
    .from('follow_up_threads')
    .upsert(
      {
        user_id: user.id,
        reading_id: readingId,
        chart_id: reading.chart_id,
        title: reading.title,
      },
      { onConflict: 'reading_id,user_id' },
    )
    .select('id, message_limit')
    .single();

  if (!thread) {
    throw new Error('Failed to get or create thread');
  }

  const threadLimit = thread.message_limit as number;

  const { data: messages } = await db
    .from('follow_up_messages')
    .select('id, role, content, created_at, model_provider, model_name')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true });

  const userMsgCount = (messages ?? []).filter((m) => m.role === 'user').length;

  return NextResponse.json({
    threadId: thread.id,
    messages: messages ?? [],
    messagesUsed: userMsgCount,
    messagesLimit: threadLimit,
  });
});

// POST /api/chat/[readingId]
// Send a user message and stream the assistant response.
// Returns text/plain streaming (not JSON) — client reads via ReadableStream.
export async function POST(req: Request, ctx: unknown) {
  let user: Awaited<ReturnType<typeof requireAuth>>['user'];
  try {
    const auth = await requireAuth();
    user = auth.user;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const readingId = await getReadingId(ctx);

  if (!readingId || !uuidSchema.safeParse(readingId).success) {
    return new Response(JSON.stringify({ error: 'Invalid reading ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues.map((i) => i.message).join(', ') }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { message } = parsed.data;

  // Fetch reading + sections + chart positions + user locale for context
  const [{ data: reading }, { data: sections }, { data: profile }] = await Promise.all([
    db
      .from('readings')
      .select('id, title, reading_type, summary, chart_id, chart_snapshot_id')
      .eq('id', readingId)
      .eq('user_id', user.id)
      .maybeSingle(),
    db
      .from('reading_sections')
      .select('title, content')
      .eq('reading_id', readingId)
      .order('sort_order', { ascending: true }),
    db.from('profiles').select('locale').eq('id', user.id).single(),
  ]);

  const locale = profile?.locale ?? 'ru';

  if (!reading) {
    return new Response(JSON.stringify({ error: 'Reading not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch chart positions for the reading's chart snapshot
  let chartPositions: Array<{
    body_key: string;
    sign_key: string;
    house_number: number | null;
  }> = [];
  if (reading.chart_snapshot_id) {
    const { data: positions } = await db
      .from('chart_positions')
      .select('body_key, sign_key, house_number')
      .eq('chart_snapshot_id', reading.chart_snapshot_id)
      .order('degree_decimal', { ascending: true });
    chartPositions = positions ?? [];
  }

  // Get or create thread (upsert with unique constraint on reading_id + user_id)
  const { data: thread } = await db
    .from('follow_up_threads')
    .upsert(
      {
        user_id: user.id,
        reading_id: readingId,
        chart_id: reading.chart_id,
        title: reading.title,
      },
      { onConflict: 'reading_id,user_id' },
    )
    .select('id, message_limit')
    .single();

  if (!thread) {
    return new Response(JSON.stringify({ error: 'Failed to create thread' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const threadLimit = thread.message_limit as number;

  // Check limit
  const { count: userMsgCount } = await db
    .from('follow_up_messages')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', thread.id)
    .eq('role', 'user');

  if ((userMsgCount ?? 0) >= threadLimit) {
    return new Response(JSON.stringify({ error: 'limit_reached', messagesLimit: threadLimit }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Load history for context
  const { data: history } = await db
    .from('follow_up_messages')
    .select('role, content')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true });

  // Insert user message
  const { error: insertError } = await db.from('follow_up_messages').insert({
    thread_id: thread.id,
    role: 'user',
    content: message,
  });

  if (insertError) {
    return new Response(JSON.stringify({ error: 'Failed to save message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build LLM messages
  const systemPrompt = buildSystemPrompt(
    { title: reading.title, reading_type: reading.reading_type, summary: reading.summary },
    sections ?? [],
    chartPositions,
    locale,
  );

  const llmMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const threadId = thread.id;
  const newUsed = (userMsgCount ?? 0) + 1;

  // Stream response to client; save assistant message (with token usage) when complete
  const stream = streamChatResponse(llmMessages, async (fullText, tokensUsed) => {
    if (fullText) {
      await db.from('follow_up_messages').insert({
        thread_id: threadId,
        role: 'assistant',
        content: fullText,
        model_provider: env.LLM_PROVIDER === 'mock' ? 'mock' : getPrimaryProviderId(),
        model_name:
          env.LLM_PROVIDER === 'mock'
            ? 'mock'
            : (getProviderConfig(getPrimaryProviderId())?.model ?? 'unknown'),
        usage_tokens: tokensUsed ?? null,
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Messages-Used': String(newUsed),
      'X-Messages-Limit': String(threadLimit),
    },
  });
}
