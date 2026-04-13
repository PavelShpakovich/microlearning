'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ChartRecord } from '@/services/charts-api';

interface ChartsOverviewProps {
  charts: ChartRecord[];
  needsOnboarding: boolean;
}

function formatBirthMeta(chart: ChartRecord) {
  const timePart = chart.birth_time_known && chart.birth_time ? `, ${chart.birth_time}` : '';
  return `${chart.birth_date}${timePart} - ${chart.city}, ${chart.country}`;
}

export function ChartsOverview({ charts, needsOnboarding }: ChartsOverviewProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Рабочее пространство астролога
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Создавайте и пересматривайте AI-разборы на основе структурированных данных карты.
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Пространство строится вокруг карт, сохранённых разборов и follow-up интерпретации,
              опирающейся на детерминированные расчёты.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/charts">Все карты</Link>
            </Button>
            <Button asChild>
              <Link href="/onboarding">Создать первую карту</Link>
            </Button>
          </div>
        </div>
      </section>

      {needsOnboarding && (
        <Card className="border-amber-200 bg-amber-50/70 shadow-none dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle>Нужно завершить onboarding</CardTitle>
            <CardDescription>
              Добавьте данные рождения, чтобы открыть расчёт натальной карты и первый
              астрологический разбор.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/onboarding">Начать onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Карты</CardDescription>
            <CardTitle className="text-3xl">{charts.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Структурированные записи с данными рождения, готовые для детерминированного расчёта.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Разборы</CardDescription>
            <CardTitle className="text-3xl">В работе</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Натальные разборы, прогнозы и совместимость привязываются к этим картам и их снимкам.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Статус</CardDescription>
            <CardTitle className="text-3xl">Активно</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Базовый astrology workflow уже выстроен вокруг карт, снимков и AI-разборов.
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Сохранённые карты</h2>
            <p className="text-sm text-muted-foreground">
              Это основное рабочее пространство для входных данных, снимков карты и будущих
              разборов.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/onboarding">Новая карта</Link>
          </Button>
        </div>

        {charts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Карт пока нет</CardTitle>
              <CardDescription>
                Создайте первый натальный профиль, чтобы запустить новый продуктовый цикл.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/onboarding">Создать карту</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {charts.map((chart) => (
              <Link key={chart.id} href={`/charts/${chart.id}`} className="block">
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader>
                    <CardDescription className="capitalize">{chart.subject_type}</CardDescription>
                    <CardTitle>{chart.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium">{chart.person_name}</p>
                      <p className="text-muted-foreground">{formatBirthMeta(chart)}</p>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="capitalize">{chart.status}</span>
                      <span className="capitalize">{chart.house_system.replace('_', ' ')}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
