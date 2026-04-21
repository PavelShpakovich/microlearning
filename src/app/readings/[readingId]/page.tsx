import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';

export const metadata: Metadata = { robots: { index: false } };
export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RetryReadingButton } from '@/components/astrology/retry-reading-button';
import { ReadingGenerating } from '@/components/astrology/reading-generating';
import { ArrowLeft, Orbit, MessageSquare, Download } from 'lucide-react';
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
    notFound();
  }

  const content = (reading.rendered_content_json ?? {}) as ReadingContentJson;
  const readingSections = sections ?? [];

  const readingTypeKey = `readingTypes.${reading.reading_type}` as Parameters<typeof t>[0];
  const readingTypeLabel = t(readingTypeKey) ?? String(reading.reading_type).replace(/_/g, ' ');

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 self-start text-muted-foreground hover:text-foreground"
      >
        <Link href="/readings">
          <ArrowLeft className="size-3.5" />
          {t('backToReadings')}
        </Link>
      </Button>

      {/* Title block */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {readingTypeLabel}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
          {reading.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm text-muted-foreground">
            {new Date(reading.created_at).toLocaleDateString(reading.locale ?? 'ru', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          {reading.status !== 'ready' ? (
            <Badge variant={reading.status === 'error' ? 'destructive' : 'secondary'}>
              {reading.status === 'error'
                ? t('statusError')
                : reading.status === 'generating'
                  ? t('statusGenerating')
                  : t('statusPending')}
            </Badge>
          ) : null}
        </div>
      </section>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/charts/${reading.chart_id}`}>
            <Orbit className="size-3.5" />
            {t('viewChart')}
          </Link>
        </Button>
        {reading.status === 'ready' ? (
          <Button asChild size="sm">
            <Link href={`/chat/${reading.id}`}>
              <MessageSquare className="size-3.5" />
              {t('askFollowUp')}
            </Link>
          </Button>
        ) : null}
        {reading.status === 'ready' ? (
          <Button asChild variant="outline" size="sm">
            <a href={`/api/readings/${reading.id}/pdf`} download>
              <Download className="size-3.5" />
              {t('downloadPdf')}
            </a>
          </Button>
        ) : null}
        {reading.status === 'error' ? (
          <RetryReadingButton
            chartId={reading.chart_id}
            readingType={reading.reading_type}
            readingId={reading.id}
          />
        ) : null}
      </div>

      {/* Generating / pending — auto-triggers LLM and refreshes when done */}
      {reading.status === 'pending' || reading.status === 'generating' ? (
        <ReadingGenerating readingId={reading.id} />
      ) : null}

      {/* Error banner */}
      {reading.status === 'error' ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm font-semibold text-destructive">{t('errorBannerTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('errorBannerDesc')}</p>
        </div>
      ) : null}

      {/* Summary */}
      {reading.status !== 'error' && (reading.summary ?? content.summary) ? (
        <div className="rounded-2xl border bg-primary/5 p-6 md:p-8">
          <p className="text-[15px] leading-[1.75] text-foreground italic">
            {reading.summary ?? content.summary}
          </p>
        </div>
      ) : null}

      {/* Key Takeaways */}
      {reading.status !== 'error' && content.advice && content.advice.length > 0 ? (
        <div className="rounded-2xl border border-primary/20 bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {t('keyTakeaways')}
          </h2>
          <ol className="flex flex-col gap-3">
            {content.advice.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* Sections */}
      {reading.status !== 'error' && readingSections.length > 0 ? (
        <div className="flex flex-col gap-8">
          {readingSections.map((section: ReadingSectionRow, idx: number) => (
            <section key={section.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
              </div>
              <div className="prose prose-neutral dark:prose-invert max-w-none pl-0 sm:pl-10 text-[15px] leading-[1.8]">
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
      ) : reading.status !== 'error' && content.sections && content.sections.length > 0 ? (
        <div className="flex flex-col gap-8">
          {content.sections.map((section, idx) => (
            <section key={section.key} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
              </div>
              <div className="prose prose-neutral dark:prose-invert max-w-none pl-0 sm:pl-10 text-[15px] leading-[1.8]">
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
      {reading.status !== 'error' &&
      content.placementHighlights &&
      content.placementHighlights.length > 0 ? (
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

      {/* Disclaimers */}
      {reading.status !== 'error' && content.disclaimers && content.disclaimers.length > 0 ? (
        <Card className="border-muted">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">{content.disclaimers.join(' ')}</p>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
