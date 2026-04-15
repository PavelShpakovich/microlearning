import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';

export const metadata: Metadata = { robots: { index: false } };
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOrCreateDailyForecast } from '@/lib/forecasts/service';
import { HoroscopeGenerating } from '@/components/astrology/horoscope-generating';
import { Button } from '@/components/ui/button';
import { Sparkles, CalendarDays } from 'lucide-react';

export const dynamic = 'force-dynamic';

const db = supabaseAdmin;

interface ForecastContent {
  interpretation?: string;
  keyTheme?: string;
  advice?: string;
  moonPhase?: string;
}

export default async function HoroscopePage() {
  const t = await getTranslations('horoscope');
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [{ data: chart }, { data: profile }] = await Promise.all([
    db
      .from('charts')
      .select('id, person_name, label')
      .eq('user_id', session.user.id)
      .eq('status', 'ready')
      .eq('subject_type', 'self')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    db.from('profiles').select('display_name, timezone').eq('id', session.user.id).maybeSingle(),
  ]);

  const displayName = profile?.display_name ?? session.user.name ?? chart?.person_name ?? '';

  if (!chart) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('pageTitle')}</h1>
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">{t('noChartMessage')}</p>
          <Button asChild>
            <Link href="/charts/new">{t('pageTitle')}</Link>
          </Button>
        </div>
      </main>
    );
  }

  const userTz = (profile as { timezone?: string | null } | null)?.timezone;

  const forecast = await getOrCreateDailyForecast(session.user.id, chart.id, userTz);
  const content = forecast.rendered_content_json as ForecastContent | null;
  const isReady = content && typeof content.interpretation === 'string';

  const today = new Date().toLocaleDateString('ru', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(userTz ? { timeZone: userTz } : {}),
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t('pageTitle')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{displayName}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" />
          <span className="capitalize">{today}</span>
        </div>
      </section>

      {/* Generating state */}
      {!isReady ? (
        <HoroscopeGenerating forecastId={forecast.id} />
      ) : (
        <>
          {/* Key theme chip */}
          {content.keyTheme ? (
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <Sparkles className="size-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-primary">{content.keyTheme}</p>
            </div>
          ) : null}

          {/* Moon phase */}
          {content.moonPhase ? (
            <p className="border-l-2 border-primary/30 pl-4 text-sm italic text-muted-foreground">
              {content.moonPhase}
            </p>
          ) : null}

          {/* Main interpretation */}
          <div className="rounded-2xl border bg-card p-6 md:p-8">
            {content.interpretation
              ?.split('\n\n')
              .filter(Boolean)
              .map((para, i) => (
                <p key={i} className={`text-[15px] leading-[1.8] ${i > 0 ? 'mt-4' : ''}`}>
                  {para}
                </p>
              ))}
          </div>

          {/* Advice */}
          {content.advice ? (
            <div className="rounded-2xl border border-primary/20 bg-card p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('adviceLabel')}
              </p>
              <p className="text-sm leading-relaxed">{content.advice}</p>
            </div>
          ) : null}
        </>
      )}

      {/* Footer nav */}
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">{t('backToDashboard')}</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/calendar">{t('calendarLink')}</Link>
        </Button>
      </div>
    </main>
  );
}
