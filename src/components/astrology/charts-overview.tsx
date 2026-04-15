'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import { ZodiacIcon } from '@/components/ui/astrology-icons';
import { CalendarDays, MapPin, Trash2 } from 'lucide-react';
import type { ChartRecord } from '@/services/charts-api';

export interface BigThree {
  sun?: string;
  moon?: string;
  asc?: string;
}

interface ChartsOverviewProps {
  charts: ChartRecord[];
  needsOnboarding: boolean;
  bigThreeMap?: Record<string, BigThree>;
}

const SIGN_ABBR: Record<string, string> = {
  aries: 'Овн',
  taurus: 'Тлц',
  gemini: 'Близ',
  cancer: 'Рак',
  leo: 'Лев',
  virgo: 'Дев',
  libra: 'Весы',
  scorpio: 'Скрп',
  sagittarius: 'Стрл',
  capricorn: 'Козр',
  aquarius: 'Вдл',
  pisces: 'Рыб',
};

function formatBirthDate(chart: ChartRecord) {
  const timePart = chart.birth_time_known && chart.birth_time ? ` · ${chart.birth_time}` : '';
  return `${chart.birth_date}${timePart}`;
}

export function ChartsOverview({
  charts: initialCharts,
  needsOnboarding,
  bigThreeMap = {},
}: ChartsOverviewProps) {
  const t = useTranslations('workspace');
  const tCommon = useTranslations('common');
  const [charts, setCharts] = useState(initialCharts);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pendingChart = charts.find((c) => c.id === deleteId);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/charts/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setCharts((prev) => prev.filter((c) => c.id !== deleteId));
      toast.success(t('deleteChartSuccess'));
    } catch {
      toast.error(t('deleteChartFailed'));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            {t('heading')}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground md:text-base">{t('description')}</p>
        </div>
        <Button asChild size="lg" className="w-full md:w-auto">
          <Link href="/charts/new">{t('newChart')}</Link>
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
            <Link href="/charts/new">{t('startOnboarding')}</Link>
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
              <Link href="/charts/new">{t('createChart')}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {charts.map((chart) => {
              const subjectLabel =
                t(`subjectTypes.${chart.subject_type}` as Parameters<typeof t>[0]) ??
                chart.subject_type;
              const bigThree = bigThreeMap[chart.id];
              return (
                <Card
                  key={chart.id}
                  className="group relative h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md"
                >
                  <Link href={`/charts/${chart.id}`} className="absolute inset-0 z-0" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                        {chart.person_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base">{chart.label}</CardTitle>
                        <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                          {chart.person_name}
                        </p>
                        {bigThree && (bigThree.sun ?? bigThree.moon ?? bigThree.asc) ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {bigThree.sun ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                <ZodiacIcon sign={bigThree.sun} size={11} />
                                {SIGN_ABBR[bigThree.sun] ?? bigThree.sun}
                              </span>
                            ) : null}
                            {bigThree.moon ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                                <ZodiacIcon sign={bigThree.moon} size={11} />
                                {SIGN_ABBR[bigThree.moon] ?? bigThree.moon}
                              </span>
                            ) : null}
                            {bigThree.asc ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                <ZodiacIcon sign={bigThree.asc} size={11} />
                                {SIGN_ABBR[bigThree.asc] ?? bigThree.asc}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 text-sm">
                    <div className="flex flex-col gap-1 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 shrink-0" />
                        {formatBirthDate(chart)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 shrink-0" />
                        {chart.city}, {chart.country}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5 capitalize">
                      {subjectLabel}
                    </span>
                    <div className="relative z-10 flex items-center gap-2">
                      {chart.status !== 'ready' ? (
                        <span
                          className={
                            chart.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                          }
                        >
                          {chart.status === 'error' ? t('statusError') : t('statusPending')}
                        </span>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteId(chart.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmationDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(null);
        }}
        onConfirm={() => void handleDelete()}
        title={t('deleteChart')}
        description={
          pendingChart ? t('confirmDeleteChart', { label: pendingChart.label }) : t('deleteChart')
        }
        confirmLabel={deleting ? '…' : t('deleteChart')}
        cancelLabel={tCommon('cancel')}
        disabled={deleting}
      />
    </main>
  );
}
