import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { fetchTheme, fetchStudySession } from '@/lib/data-fetchers';
import { StudyClient } from '@/components/study/study-client';
import { StudySkeleton } from '@/components/skeletons';

interface StudyPageProps {
  params: Promise<{ themeId: string }>;
}

export const metadata = {
  title: 'Study | Microlearning',
  description: 'Study your learning cards',
};

export default async function StudyPage({ params }: StudyPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { themeId } = await params;

  // Fetch theme and session in parallel for better performance
  const [theme] = await Promise.all([fetchTheme(themeId), fetchStudySession(themeId)]);

  if (!theme) {
    redirect('/dashboard');
  }

  const isOwner = theme.user_id === session.user.id;

  return (
    <Suspense fallback={<StudySkeleton />}>
      <StudyClient themeId={themeId} isOwner={isOwner} />
    </Suspense>
  );
}
