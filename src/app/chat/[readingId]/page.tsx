import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { FollowUpChat } from '@/components/astrology/follow-up-chat';
import type { ChatMessageItem } from '@/components/astrology/follow-up-chat';

const db = supabaseAdmin;
const FOLLOW_UP_LIMIT = 10;

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ readingId: string }>;
}): Promise<Metadata> {
  const t = await getTranslations('chat');
  const { readingId } = await params;
  void readingId;
  return { title: t('pageTitle') };
}

export default async function ChatPage({ params }: { params: Promise<{ readingId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { readingId } = await params;

  if (!isUUID(readingId)) redirect('/readings');

  const { data: reading } = await db
    .from('readings')
    .select('id, title, chart_id')
    .eq('id', readingId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!reading) redirect('/readings');

  // Get or create thread
  let { data: thread } = await db
    .from('follow_up_threads')
    .select('id')
    .eq('reading_id', readingId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!thread) {
    const { data: newThread } = await db
      .from('follow_up_threads')
      .insert({
        user_id: session.user.id,
        reading_id: readingId,
        chart_id: reading.chart_id,
        title: reading.title,
      })
      .select('id')
      .single();
    thread = newThread;
  }

  if (!thread) redirect('/readings');

  const { data: messages } = await db
    .from('follow_up_messages')
    .select('id, role, content, created_at, model_provider, model_name')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true });

  const msgs = (messages ?? []) as ChatMessageItem[];
  const used = msgs.filter((m) => m.role === 'user').length;

  return (
    <main className="min-h-screen">
      <FollowUpChat
        readingId={readingId}
        readingTitle={reading.title}
        initialMessages={msgs}
        initialUsed={used}
        limit={FOLLOW_UP_LIMIT}
      />
    </main>
  );
}
