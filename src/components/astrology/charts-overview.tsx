'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ChartRecord } from '@/services/charts-api';

interface ChartsOverviewProps {
  charts: ChartRecord[];
  needsOnboarding: boolean;
}

const SUBJECT_TYPE_LABELS: Record<string, string> = {
  self: 'My chart',
  partner: 'Partner',
  child: 'Child',
  client: 'Client',
  other: 'Other',
};

function formatBirthDate(chart: ChartRecord) {
  const timePart = chart.birth_time_known && chart.birth_time ? ` at ${chart.birth_time}` : '';
  return `${chart.birth_date}${timePart}`;
}

export function ChartsOverview({ charts, needsOnboarding }: ChartsOverviewProps) {
  const t = useTranslations('workspace');

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t('heading')}</h1>
          <p className="max-w-xl text-sm text-muted-foreground md:text-base">{t('description')}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/onboarding">{t('newChart')}</Link>
        </Button>
      </section>

      {/* Onboarding prompt */}
      {needsOnboarding ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-6 py-5 dark:border-amber-800/40 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
            {t('onboardingTitle')}
          </p>
          <p className="mt-1 text-sm text-amber-700/80 dark:text-amber-500/80">
            {t('onboardingDescription')}
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/onboarding">{t('startOnboarding')}</Link>
          </Button>
        </div>
      ) : null}

      {/* Charts grid */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {t('savedCharts')}
            {charts.length > 0 ? (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({charts.length})
              </span>
            ) : null}
          </h2>
        </div>

        {charts.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed py-16 text-center">
            <p className="text-base font-medium text-muted-foreground">{t('noChartsTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('noChartsDescription')}</p>
            <Button asChild className="mt-5">
              <Link href="/onboarding">{t('createChart')}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {charts.map((chart) => (
              <Link key={chart.id} href={`/charts/${chart.id}`} className="group block">
                <Card className="h-full transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-md">
                  <CardHeader className="pb-3">
                    {/* Avatar + name */}
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                        {chart.person_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{chart.label}</CardTitle>
                        <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                          {chart.person_name}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 text-sm">
                    <div className="flex flex-col gap-1 text-muted-foreground">
                      <p>📅 {formatBirthDate(chart)}</p>
                      <p>
                        📍 {chart.city}, {chart.country}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5 capitalize">
                      {SUBJECT_TYPE_LABELS[chart.subject_type] ?? chart.subject_type}
                    </span>
                    <span
                      className={
                        chart.status === 'ready'
                          ? 'text-green-600 dark:text-green-400'
                          : chart.status === 'error'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                      }
                    >
                      {chart.status === 'ready' ? '✓ Ready' : chart.status}
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
