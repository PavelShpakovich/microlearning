import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { fetchUserProfile } from '@/lib/data-fetchers';
import { SettingsClient } from '@/components/settings/settings-client';
import { SettingsSkeleton } from '@/components/skeletons';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isTelegramStubEmail } from '@/lib/auth/user-accounts';

export const metadata = {
  title: 'Settings',
  description: 'Manage your Clario profile, preferences, and account settings.',
};

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/tg');
  }

  // Fetch the actual auth email (not stored in JWT) to detect stub accounts.
  // A stub is a Telegram-first user whose email is telegram_*@noreply.*
  const [profile, { data: authUserData }] = await Promise.all([
    fetchUserProfile(),
    supabaseAdmin.auth.admin.getUserById(session.user.id),
  ]);
  const authEmail = authUserData.user?.email ?? '';
  const isStub = isTelegramStubEmail(authEmail);

  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsClient
        initialProfile={profile}
        userName={session.user.name ?? null}
        userEmail={authEmail}
        isStub={isStub}
      />
    </Suspense>
  );
}
