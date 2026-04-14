import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function generateMetadata() {
  const t = await getTranslations('settingsPage');
  return { title: t('pageTitle'), description: t('pageDescription') };
}

export const dynamic = 'force-dynamic';

const db = supabaseAdmin;

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const t = await getTranslations('settingsPage');

  const [{ data: profile }, { data: preferences }, { data: authUserData }] = await Promise.all([
    db
      .from('profiles')
      .select(
        'display_name, locale, timezone, birth_data_consent_at, onboarding_completed_at, marketing_opt_in',
      )
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

  const authEmail = authUserData.user?.email ?? '';

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t('sectionLabel')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t('heading')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{t('description')}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('profileTitle')}</CardTitle>
            <CardDescription>{t('profileDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>
              <span className="font-medium">{t('emailLabel')}:</span>{' '}
              {authEmail || t('emailUnavailable')}
            </p>
            <p>
              <span className="font-medium">{t('nameLabel')}:</span>{' '}
              {profile?.display_name || session.user.name || t('nameNotSet')}
            </p>
            <p>
              <span className="font-medium">{t('localeLabel')}:</span> {profile?.locale || 'ru'}
            </p>
            <p>
              <span className="font-medium">{t('timezoneLabel')}:</span>{' '}
              {profile?.timezone || t('timezoneNotSet')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('privacyTitle')}</CardTitle>
            <CardDescription>{t('privacyDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>
              <span className="font-medium">{t('onboardingDone')}:</span>{' '}
              {profile?.onboarding_completed_at ? t('yes') : t('no')}
            </p>
            <p>
              <span className="font-medium">{t('birthConsent')}:</span>{' '}
              {profile?.birth_data_consent_at ? t('consentRecorded') : t('consentNotRecorded')}
            </p>
            <p>
              <span className="font-medium">{t('marketingLabel')}:</span>{' '}
              {profile?.marketing_opt_in ? t('enabled') : t('disabled')}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t('preferencesTitle')}</CardTitle>
          <CardDescription>{t('preferencesDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <p>
            <span className="font-medium">{t('toneLabel')}:</span>{' '}
            {preferences?.tone_style || 'balanced'}
          </p>
          <p>
            <span className="font-medium">{t('spiritualTone')}:</span>{' '}
            {preferences?.allow_spiritual_tone ? t('allowed') : t('disabled')}
          </p>
          <p>
            <span className="font-medium">{t('focusLove')}:</span>{' '}
            {preferences?.content_focus_love ? t('enabled') : t('disabled')}
          </p>
          <p>
            <span className="font-medium">{t('focusCareer')}:</span>{' '}
            {preferences?.content_focus_career ? t('enabled') : t('disabled')}
          </p>
          <p>
            <span className="font-medium">{t('focusGrowth')}:</span>{' '}
            {preferences?.content_focus_growth ? t('enabled') : t('disabled')}
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/onboarding">{t('updateChartData')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/charts">{t('openCharts')}</Link>
        </Button>
      </div>
    </main>
  );
}
