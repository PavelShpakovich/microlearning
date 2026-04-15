import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calculateNatalChart } from '@/lib/astrology/engine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CalendarDays,
  MapPin,
  Plus,
  BookOpen,
  Orbit,
  ArrowRight,
  Sparkles,
  Star,
} from 'lucide-react';
import { ZodiacIcon } from '@/components/astrology/zodiac-icon';

const SIGN_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water',
};

const ELEMENT_COLOR: Record<string, string> = {
  fire: 'text-orange-500',
  earth: 'text-emerald-600',
  air: 'text-sky-500',
  water: 'text-blue-500',
};

export async function generateMetadata() {
  const t = await getTranslations('dashboard');
  return { title: t('pageTitle'), description: t('pageDescription'), robots: { index: false } };
}

export const dynamic = 'force-dynamic';

const db = supabaseAdmin;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [t, tChart] = await Promise.all([
    getTranslations('dashboard'),
    getTranslations('chartDetail'),
  ]);

  // Compute today's sky positions (Sun, Moon, Mercury) using Greenwich as reference
  let todaySky: { sun?: string; moon?: string; mercury?: string } = {};
  try {
    const today = new Date();
    const skyResult = await calculateNatalChart({
      personName: 'sky',
      birthDate: today.toISOString().slice(0, 10),
      birthTime: '12:00',
      birthTimeKnown: true,
      city: 'London',
      country: 'GB',
      latitude: 51.5,
      longitude: 0,
      houseSystem: 'equal',
      label: 'sky',
      subjectType: 'other',
    });
    const byKey = Object.fromEntries(skyResult.positions.map((p) => [p.bodyKey, p.signKey]));
    todaySky = { sun: byKey.sun, moon: byKey.moon, mercury: byKey.mercury };
  } catch {
    // non-critical, skip widget silently
  }

  const [{ data: charts }, { data: readings }, { data: profile }] = await Promise.all([
    db
      .from('charts')
      .select('id, label, person_name, birth_date, city, country, status, subject_type')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    db
      .from('readings')
      .select('id, title, reading_type, status, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    db
      .from('profiles')
      .select('display_name, onboarding_completed_at, timezone')
      .eq('id', session.user.id)
      .maybeSingle(),
  ]);

  if (!profile?.onboarding_completed_at) redirect('/onboarding');

  const userTz = profile?.timezone as string | null | undefined;
  const todayStr = (() => {
    try {
      if (userTz) return new Date().toLocaleDateString('sv-SE', { timeZone: userTz });
    } catch {
      /* invalid tz */
    }
    return new Date().toISOString().slice(0, 10);
  })();

  const name = profile?.display_name ?? session.user.name ?? '';
  const hasCharts = (charts ?? []).length > 0;
  // Prefer the user's own natal chart (subject_type='self'), fall back to any ready chart
  const primaryReadyChart =
    (charts ?? []).find((c) => c.status === 'ready' && c.subject_type === 'self') ??
    (charts ?? []).find((c) => c.status === 'ready');

  // Fetch today's forecast if user has a ready chart (no LLM — DB only)
  let todayForecastContent: { keyTheme?: string; advice?: string; interpretation?: string } | null =
    null;
  if (primaryReadyChart) {
    const { data: forecast } = await db
      .from('forecasts')
      .select('rendered_content_json')
      .eq('user_id', session.user.id)
      .eq('chart_id', primaryReadyChart.id)
      .eq('forecast_type', 'daily')
      .eq('target_start_date', todayStr)
      .maybeSingle();
    if (forecast?.rendered_content_json) {
      const fc = forecast.rendered_content_json as Record<string, unknown>;
      if (typeof fc.interpretation === 'string') {
        todayForecastContent = {
          keyTheme: typeof fc.keyTheme === 'string' ? fc.keyTheme : undefined,
          advice: typeof fc.advice === 'string' ? fc.advice : undefined,
          interpretation: fc.interpretation,
        };
      }
    }
  }
  const needsChart = !profile?.onboarding_completed_at && !hasCharts;
  const needsPreferences = !profile?.onboarding_completed_at && hasCharts;
  const recentCharts = (charts ?? []).slice(0, 3);
  const recentReadings = (readings ?? []).slice(0, 4);
  const totalCharts = (charts ?? []).length;
  const totalReadings = (readings ?? []).length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          {t('subheading')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
          {t('heading')}
          {name ? `, ${name}` : ''}
        </h1>
      </section>

      {/* Today's sky widget */}
      {(todaySky.sun ?? todaySky.moon) ? (
        <div className="rounded-2xl border bg-card px-6 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('skyToday')}
          </p>
          <div className="flex flex-wrap gap-4">
            {[
              { key: 'sun' as const, sign: todaySky.sun },
              { key: 'moon' as const, sign: todaySky.moon },
              { key: 'mercury' as const, sign: todaySky.mercury },
            ].map(({ key, sign }) => {
              if (!sign) return null;
              const el = SIGN_ELEMENT[sign];
              const label = tChart(`planets.${key}` as Parameters<typeof tChart>[0]);
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <ZodiacIcon
                    sign={sign}
                    size={22}
                    className={ELEMENT_COLOR[el] ?? 'text-muted-foreground'}
                  />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none mb-0.5">
                      {label}
                    </p>
                    <p className="font-medium leading-none">
                      {tChart(`signs.${sign}` as Parameters<typeof tChart>[0]) ?? sign}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Personal horoscope widget */}
      {primaryReadyChart ? (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('horoscopeWidgetTitle')}
            </p>
            {todayForecastContent?.keyTheme ? (
              <p className="text-sm font-semibold">{todayForecastContent.keyTheme}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('horoscopeWidgetDesc')}</p>
            )}
            {todayForecastContent?.advice ? (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {todayForecastContent.advice}
              </p>
            ) : null}
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/horoscope">
              <Star className="size-4 mr-1.5" />
              {todayForecastContent?.interpretation ? t('horoscopeRead') : t('horoscopeOpen')}
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Onboarding banners */}
      {needsChart ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-warning-foreground">{t('onboardingBannerTitle')}</p>
            <p className="mt-0.5 text-sm text-warning-foreground/70">{t('onboardingBannerDesc')}</p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/charts/new">{t('onboardingBannerStart')}</Link>
          </Button>
        </div>
      ) : null}
      {needsPreferences ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{t('preferencesBannerTitle')}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('preferencesBannerDesc')}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/onboarding">{t('preferencesBannerStart')}</Link>
          </Button>
        </div>
      ) : null}

      {/* Stats row */}
      <div className="grid grid-cols-2 divide-x rounded-xl border bg-card overflow-hidden">
        <Link
          href="/charts"
          className="group flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Orbit className="size-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold leading-none tabular-nums">{totalCharts}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('statsCharts')}</p>
          </div>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
        <Link
          href="/readings"
          className="group flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="size-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold leading-none tabular-nums">{totalReadings}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('statsReadings')}</p>
          </div>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </div>

      {/* Quick actions */}
      <Card className="flex flex-col justify-center gap-3 px-6 py-5 border-border/60 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium shrink-0">{t('quickActions')}</p>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button asChild size="sm">
            <Link href="/charts/new">
              <Plus />
              {t('createNewChart')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/charts">
              <Orbit />
              {t('viewAllCharts')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/readings">
              <BookOpen />
              {t('viewAllReadings')}
            </Link>
          </Button>
        </div>
      </Card>

      {/* Recent charts */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('recentCharts')}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/charts" className="flex items-center gap-1">
              {t('viewAllCharts')} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
        {recentCharts.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed py-8 text-center text-sm text-muted-foreground">
            {t('noCharts')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {recentCharts.map((chart) => (
              <Link key={chart.id} href={`/charts/${chart.id}`} className="group block">
                <Card className="h-full transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md group-hover:-translate-y-0.5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {chart.person_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm">{chart.label}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate">
                          {chart.person_name}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground flex flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-3 shrink-0" />
                      {chart.birth_date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3 shrink-0" />
                      {chart.city}, {chart.country}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent readings */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('recentReadings')}</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/readings" className="flex items-center gap-1">
              {t('viewAllReadings')} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
        {recentReadings.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed py-8 text-center text-sm text-muted-foreground">
            {t('noReadings')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentReadings.map((reading) => (
              <Link key={reading.id} href={`/readings/${reading.id}`} className="group block">
                <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all group-hover:border-primary/50">
                  <Sparkles className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium group-hover:text-primary">
                      {reading.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`readingTypes.${reading.reading_type}` as Parameters<typeof t>[0]) ??
                        reading.reading_type}{' '}
                      · {new Date(reading.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {reading.status !== 'ready' ? (
                    <Badge variant="outline" className="shrink-0">
                      {t('statusPending')}
                    </Badge>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
