import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Tables } from '@/lib/supabase/types';

const db = supabaseAdmin;

type ReadingSectionRow = Tables<'reading_sections'>;

interface ReadingContentJson {
  title?: string;
  summary?: string;
  sections?: Array<{ key: string; title: string; content: string }>;
  placementHighlights?: string[];
  advice?: string[];
  disclaimers?: string[];
}

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default async function ReadingDetailPage({
  params,
}: {
  params: Promise<{ readingId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { readingId } = await params;
  const t = await getTranslations('readingDetail');

  if (!isUUID(readingId)) {
    redirect('/readings');
  }

  const [{ data: reading }, { data: sections }] = await Promise.all([
    db
      .from('readings')
      .select('*')
      .eq('id', readingId)
      .eq('user_id', session.user.id)
      .maybeSingle(),
    db
      .from('reading_sections')
      .select('*')
      .eq('reading_id', readingId)
      .order('sort_order', { ascending: true }),
  ]);

  if (!reading) {
    redirect('/readings');
  }

  const content = (reading.rendered_content_json ?? {}) as ReadingContentJson;
  const readingSections = sections ?? [];

  const readingTypeLabel = String(reading.reading_type).replace('_', ' ');

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <span className="capitalize">{readingTypeLabel}</span>
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{reading.title}</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {new Date(reading.created_at).toLocaleDateString(reading.locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            {reading.status !== 'ready' ? (
              <span className="ml-2 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                {reading.status}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/readings">{t('backToReadings')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/charts/${reading.chart_id}`}>{t('viewChart')}</Link>
          </Button>
          <Button asChild>
            <Link href={`/chat/${reading.id}`}>{t('askFollowUp')}</Link>
          </Button>
        </div>
      </section>

      {/* Summary */}
      {(reading.summary ?? content.summary) ? (
        <div className="rounded-2xl border bg-primary/5 p-6 md:p-8">
          <p className="text-[15px] leading-[1.75] text-foreground italic">
            {reading.summary ?? content.summary}
          </p>
        </div>
      ) : null}

      {/* Sections */}
      {readingSections.length > 0 ? (
        <div className="flex flex-col gap-8">
          {readingSections.map((section: ReadingSectionRow, idx: number) => (
            <section key={section.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
              </div>
              <div className="prose prose-neutral dark:prose-invert max-w-none pl-10 text-[15px] leading-[1.8]">
                {section.content
                  .split('\n\n')
                  .filter(Boolean)
                  .map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))}
              </div>
            </section>
          ))}
        </div>
      ) : content.sections && content.sections.length > 0 ? (
        <div className="flex flex-col gap-8">
          {content.sections.map((section, idx) => (
            <section key={section.key} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
              </div>
              <div className="prose prose-neutral dark:prose-invert max-w-none pl-10 text-[15px] leading-[1.8]">
                {section.content
                  .split('\n\n')
                  .filter(Boolean)
                  .map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {/* Placement Highlights */}
      {content.placementHighlights && content.placementHighlights.length > 0 ? (
        <div>
          <h2 className="mb-3 text-base font-semibold">{t('placementHighlights')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {content.placementHighlights.map((highlight, idx) => (
              <div key={idx} className="rounded-xl border bg-card px-4 py-3 text-sm">
                {highlight}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Advice */}
      {content.advice && content.advice.length > 0 ? (
        <div>
          <h2 className="mb-3 text-base font-semibold">{t('advice')}</h2>
          <div className="grid gap-2">
            {content.advice.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border bg-green-50 px-4 py-3 text-sm dark:bg-green-950/20"
              >
                <span className="mt-0.5 text-green-500">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Disclaimers */}
      {content.disclaimers && content.disclaimers.length > 0 ? (
        <Card className="border-muted">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">{content.disclaimers.join(' ')}</p>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
