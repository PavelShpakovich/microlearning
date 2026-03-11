import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { fetchTheme } from '@/lib/data-fetchers';
import { StudyClient } from '@/components/study/study-client';

interface StudyPageProps {
  params: Promise<{ themeId: string }>;
}

export const metadata = {
  title: 'Study',
  description: 'Study your AI-generated flashcards.',
};

export const dynamic = 'force-dynamic';

export default async function StudyPage({ params }: StudyPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/tg');
  }

  const { themeId } = await params;

  const theme = await fetchTheme(themeId);

  if (!theme) {
    redirect('/dashboard');
  }

  const isOwner = theme.user_id === session.user.id;

  return <StudyClient themeId={themeId} isOwner={isOwner} />;
}
