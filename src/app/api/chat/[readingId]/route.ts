import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { streamChatResponse, type ChatMessage } from '@/lib/llm/structured-generation';
import { env } from '@/lib/env';
import { FOLLOW_UP_LIMIT } from '@/lib/astrology/constants';

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
): string {
  const lines: string[] = [
    'КРИТИЧЕСКИ ВАЖНО: Отвечай ТОЛЬКО на русском языке, независимо от языка вопроса пользователя.',
    '',
    'Ты — персональный ассистент-астролог. Ты помогаешь пользователю понять его астрологический разбор.',
    '',
    `Тип разбора: ${reading.reading_type.replace(/_/g, ' ')}`,
    `Название: ${reading.title}`,
  ];

  if (reading.summary) {
    lines.push('', 'Краткое содержание разбора:', reading.summary.slice(0, 600));
  }

  if (sections.length > 0) {
    lines.push('', 'Секции разбора:');
    for (const s of sections.slice(0, 5)) {
      lines.push('', `## ${s.title}`, s.content.slice(0, 500));
    }
  }

  lines.push(
    '',
    'Отвечай на русском языке. Будь конкретным, опирайся на данные этого разбора.',
    'Не давай медицинских, юридических или финансовых советов как специалист.',
    'Представляй ответы как астрологическую интерпретацию.',
  );

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

  // Get or create thread
  let { data: thread } = await db
    .from('follow_up_threads')
    .select('id')
    .eq('reading_id', readingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!thread) {
    const { data: newThread } = await db
      .from('follow_up_threads')
      .insert({
        user_id: user.id,
        reading_id: readingId,
        chart_id: reading.chart_id,
        title: reading.title,
      })
      .select('id')
      .single();
    thread = newThread;
  }

  if (!thread) {
    throw new Error('Failed to get or create thread');
  }

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
    messagesLimit: FOLLOW_UP_LIMIT,
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

  // Fetch reading + sections for context
  const [{ data: reading }, { data: sections }] = await Promise.all([
    db
      .from('readings')
      .select('id, title, reading_type, summary, chart_id')
      .eq('id', readingId)
      .eq('user_id', user.id)
      .maybeSingle(),
    db
      .from('reading_sections')
      .select('title, content')
      .eq('reading_id', readingId)
      .order('sort_order', { ascending: true }),
  ]);

  if (!reading) {
    return new Response(JSON.stringify({ error: 'Reading not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get or create thread
  let { data: thread } = await db
    .from('follow_up_threads')
    .select('id')
    .eq('reading_id', readingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!thread) {
    const { data: newThread } = await db
      .from('follow_up_threads')
      .insert({
        user_id: user.id,
        reading_id: readingId,
        chart_id: reading.chart_id,
        title: reading.title,
      })
      .select('id')
      .single();
    thread = newThread;
  }

  if (!thread) {
    return new Response(JSON.stringify({ error: 'Failed to create thread' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check limit
  const { count: userMsgCount } = await db
    .from('follow_up_messages')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', thread.id)
    .eq('role', 'user');

  if ((userMsgCount ?? 0) >= FOLLOW_UP_LIMIT) {
    return new Response(JSON.stringify({ error: `Limit of ${FOLLOW_UP_LIMIT} messages reached` }), {
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
  await db.from('follow_up_messages').insert({
    thread_id: thread.id,
    role: 'user',
    content: message,
  });

  // Build LLM messages
  const systemPrompt = buildSystemPrompt(
    { title: reading.title, reading_type: reading.reading_type, summary: reading.summary },
    sections ?? [],
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
        model_provider: env.LLM_PROVIDER,
        model_name: env.LLM_PROVIDER === 'qwen' ? env.QWEN_MODEL : 'mock',
        usage_tokens: tokensUsed ?? null,
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Messages-Used': String(newUsed),
      'X-Messages-Limit': String(FOLLOW_UP_LIMIT),
    },
  });
}
