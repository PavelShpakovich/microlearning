import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, MoonStar, Orbit, ScrollText } from 'lucide-react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryclario.by';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isRu = locale !== 'en';

  const title = isRu ? 'Clario — AI-астрологические разборы' : 'Clario — AI Astrology Readings';
  const description = isRu
    ? 'Создавайте натальные карты, получайте AI-разборы и возвращайтесь к сохранённым инсайтам на основе структурированных астрологических данных.'
    : 'Create natal charts, generate AI astrology readings, and revisit saved insights built from structured chart data.';

  return {
    title,
    description,
    alternates: { canonical: APP_URL },
    openGraph: {
      title,
      description,
      url: APP_URL,
      locale: isRu ? 'ru_RU' : 'en_US',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Clario' }],
    },
  };
}

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  const locale = await getLocale();
  const isRu = locale !== 'en';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(218,200,255,0.16),_transparent_32%),linear-gradient(180deg,_rgba(13,16,29,0.02),_transparent_40%)]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {isRu ? 'Русскоязычный запуск' : 'Russian-first launch'}
            </p>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
                {isRu
                  ? 'AI-астрологические разборы на основе структурированных данных карты, а не расплывчатых гороскопов.'
                  : 'AI astrology readings built from structured chart data, not vague horoscope text.'}
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                {isRu
                  ? 'Создавайте натальные карты, получайте подробные AI-разборы и продолжайте диалог через follow-up вопросы, опирающиеся на детерминированные расчёты.'
                  : 'Create natal charts, generate premium AI interpretations, and continue with follow-up questions grounded in deterministic calculations.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">{isRu ? 'Начать разбор' : 'Start the reading flow'}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">{isRu ? 'Войти' : 'Sign in'}</Link>
              </Button>
            </div>
          </div>

          <Card className="border-white/40 bg-background/80 backdrop-blur">
            <CardHeader>
              <CardDescription>
                {isRu ? 'Новый продуктовый цикл' : 'New product loop'}
              </CardDescription>
              <CardTitle className="text-2xl">
                {isRu
                  ? 'От данных рождения к персональному разбору'
                  : 'From birth data to guided interpretation'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <MoonStar className="mt-0.5 h-4 w-4 text-primary" />
                <p>
                  {isRu
                    ? 'Собирайте точные данные рождения через onboarding с явным согласием пользователя.'
                    : 'Collect precise birth data with consent-first onboarding.'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Orbit className="mt-0.5 h-4 w-4 text-primary" />
                <p>
                  {isRu
                    ? 'Стройте снимки натальной карты через детерминированный астрологический движок.'
                    : 'Compute natal chart snapshots with a deterministic astrology engine.'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <ScrollText className="mt-0.5 h-4 w-4 text-primary" />
                <p>
                  {isRu
                    ? 'Генерируйте структурированные разборы и продолжайте их через scoped AI follow-up.'
                    : 'Generate structured readings and continue with scoped AI follow-up.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-4 w-4 text-primary" />{' '}
                {isRu ? 'Детерминированное ядро' : 'Deterministic core'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {isRu
                ? 'Астрологический расчёт отделяется от LLM, чтобы каждый разбор можно было связать с конкретными положениями и аспектами.'
                : 'Astrology calculation is being separated from the LLM so every reading can be traced back to computed placements and aspects.'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Orbit className="h-4 w-4 text-primary" />{' '}
                {isRu ? 'Структурированные разборы' : 'Structured readings'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {isRu
                ? 'Новый продукт хранит снимки карт, версии разборов, версии промптов и будущие артефакты совместимости и прогнозов.'
                : 'The new product stores chart snapshots, reading versions, prompt versions, and future compatibility and forecast artifacts.'}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MoonStar className="h-4 w-4 text-primary" />{' '}
                {isRu ? 'Премиальный формат' : 'Premium guidance'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {isRu
                ? 'Clario строится как премиальное пространство для астрологических разборов, карт и осмысленной интерпретации.'
                : 'Clario is a premium astrology analysis workspace built around charts, readings, and guided interpretation.'}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription>{isRu ? 'Первая фаза' : 'Phase 1'}</CardDescription>
              <CardTitle>
                {isRu ? 'Что входит в первый запуск' : 'What the rewrite is shipping first'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                {isRu
                  ? '1. Onboarding с данными рождения и создание натальной карты.'
                  : '1. Birth-data onboarding and natal chart creation.'}
              </p>
              <p>
                {isRu
                  ? '2. Структурированные AI-разборы, сохраняемые как документы.'
                  : '2. Structured AI natal reports stored as reusable reading documents.'}
              </p>
              <p>
                {isRu
                  ? '3. Библиотека сохранённых карт и разборов.'
                  : '3. Saved charts and readings library.'}
              </p>
              <p>
                {isRu
                  ? '4. Follow-up AI-чат в контексте конкретного разбора.'
                  : '4. Follow-up AI chat scoped to a reading.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>{isRu ? 'Следующие фазы' : 'Later phases'}</CardDescription>
              <CardTitle>
                {isRu ? 'Что идёт после базового цикла' : 'What follows after the core loop'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{isRu ? '1. Разборы совместимости.' : '1. Compatibility reports.'}</p>
              <p>{isRu ? '2. Прогнозы на основе транзитов.' : '2. Transit-based forecasts.'}</p>
              <p>
                {isRu
                  ? '3. Более глубокие сценарии доступа и лимитов, если они понадобятся после стабилизации core-loop.'
                  : '3. Deeper access packaging only if it is needed after the core product loop stabilizes.'}
              </p>
              <p>
                {isRu
                  ? '4. Админ-наблюдаемость по промптам, разборам и сбоям.'
                  : '4. Admin observability for prompts, readings, and failures.'}
              </p>
            </CardContent>
          </Card>
        </section>
      </section>
    </main>
  );
}
