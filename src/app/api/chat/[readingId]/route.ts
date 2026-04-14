import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateChatResponse, type ChatMessage } from '@/lib/llm/structured-generation';
import { env } from '@/lib/env';

const db = supabaseAdmin;

const uuidSchema = z.string().uuid();
const sendMessageSchema = z.object({
  message: z.string().min(1).max(1000),
});

/** Max user messages per thread. */
const FOLLOW_UP_LIMIT = 10;

async function getReadingId(ctx: unknown): Promise<string | undefined> {
  const routeContext = ctx as { params?: Promise<{ readingId: string }> } | undefined;
  return routeContext?.params ? (await routeContext.params).readingId : undefined;
}

function buildSystemPrompt(
  reading: { title: string; reading_type: string; summary: string | null },
  sections: Array<{ title: string; content: string }>,
): string {
  const lines: string[] = [
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
// Send a user message and receive the assistant response.
export const POST = withApiHandler(async (req, ctx) => {
  const { user } = await requireAuth();
  const readingId = await getReadingId(ctx);

  if (!readingId || !uuidSchema.safeParse(readingId).success) {
    throw new ValidationError({ message: 'Invalid reading ID' });
  }

  const body = await req.json();
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError({
      message: parsed.error.issues.map((i) => i.message).join(', '),
    });
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

  // Check limit
  const { count: userMsgCount } = await db
    .from('follow_up_messages')
    .select('id', { count: 'exact', head: true })
    .eq('thread_id', thread.id)
    .eq('role', 'user');

  if ((userMsgCount ?? 0) >= FOLLOW_UP_LIMIT) {
    throw new ValidationError({ message: `Follow-up limit of ${FOLLOW_UP_LIMIT} reached` });
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
    {
      title: reading.title,
      reading_type: reading.reading_type,
      summary: reading.summary,
    },
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

  const assistantContent = await generateChatResponse(llmMessages);

  // Insert assistant message
  const { data: assistantMsg } = await db
    .from('follow_up_messages')
    .insert({
      thread_id: thread.id,
      role: 'assistant',
      content: assistantContent,
      model_provider: env.LLM_PROVIDER,
      model_name: env.LLM_PROVIDER === 'qwen' ? env.QWEN_MODEL : 'mock',
    })
    .select('id, role, content, created_at, model_provider, model_name')
    .single();

  return NextResponse.json({
    message: assistantMsg,
    messagesUsed: (userMsgCount ?? 0) + 1,
    messagesLimit: FOLLOW_UP_LIMIT,
  });
});
