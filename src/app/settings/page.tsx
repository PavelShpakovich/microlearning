import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SettingsForm } from '@/components/settings/settings-form';
import type { SettingsFormData } from '@/components/settings/settings-form';

export async function generateMetadata() {
  const t = await getTranslations('settingsPage');
  return { title: t('pageTitle'), description: t('pageDescription'), robots: { index: false } };
}

export const dynamic = 'force-dynamic';

const db = supabaseAdmin;

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const t = await getTranslations('settingsPage');

  const [{ data: profile }, { data: preferences }, { data: authUserData }] = await Promise.all([
    db
      .from('profiles')
      .select('display_name, timezone, birth_data_consent_at')
      .eq('id', session.user.id)
      .maybeSingle(),
    db
      .from('user_preferences')
      .select(
        'tone_style, content_focus_love, content_focus_career, content_focus_growth, allow_spiritual_tone',
      )
      .eq('user_id', session.user.id)
      .maybeSingle(),
    supabaseAdmin.auth.admin.getUserById(session.user.id),
  ]);

  const formData: SettingsFormData = {
    email: authUserData.user?.email ?? '',
    displayName: profile?.display_name ?? session.user.name ?? '',
    timezone: profile?.timezone ?? null,
    birthDataConsentAt: profile?.birth_data_consent_at ?? null,
    preferences: {
      tone_style: preferences?.tone_style ?? 'balanced',
      content_focus_love: preferences?.content_focus_love ?? true,
      content_focus_career: preferences?.content_focus_career ?? true,
      content_focus_growth: preferences?.content_focus_growth ?? true,
      allow_spiritual_tone: preferences?.allow_spiritual_tone ?? true,
    },
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          {t('sectionLabel')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{t('heading')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('description')}</p>
      </section>

      <SettingsForm data={formData} />
    </main>
  );
}
