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
import { CompatibilityGenerating } from '@/components/astrology/compatibility-generating';
import { RetryCompatibilityButton } from '@/components/astrology/retry-compatibility-button';

const db = supabaseAdmin;

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

// ─── Cross-aspect computation ─────────────────────────────────────────────────

interface PositionRow {
  body_key: string;
  degree_decimal: number;
}

const ASPECT_DEFS = [
  { key: 'conjunction', angle: 0, orb: 8, weight: 0.33 },
  { key: 'sextile', angle: 60, orb: 4, weight: 0.67 },
  { key: 'square', angle: 90, orb: 6, weight: -0.5 },
  { key: 'trine', angle: 120, orb: 6, weight: 1 },
  { key: 'opposition', angle: 180, orb: 8, weight: -0.33 },
] as const;

const PLANET_WEIGHT: Record<string, number> = {
  sun: 3,
  moon: 3,
  asc: 2.5,
  venus: 2.5,
  mars: 2.5,
  mercury: 2,
  jupiter: 1.5,
  saturn: 1.5,
};

const KEY_PLANETS = new Set([
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'asc',
]);

function computeHarmonyScore(primary: PositionRow[], secondary: PositionRow[]): number {
  if (primary.length === 0 || secondary.length === 0) return 50;

  let totalScore = 0;
  let totalWeight = 0;

  for (const pA of primary) {
    if (!KEY_PLANETS.has(pA.body_key)) continue;
    for (const pB of secondary) {
      if (!KEY_PLANETS.has(pB.body_key)) continue;
      const diff = Math.abs(pA.degree_decimal - pB.degree_decimal);
      const angular = Math.min(diff, 360 - diff);
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(angular - def.angle);
        if (orb <= def.orb) {
          const pairWeight = (PLANET_WEIGHT[pA.body_key] ?? 1) * (PLANET_WEIGHT[pB.body_key] ?? 1);
          totalScore += def.weight * pairWeight;
          totalWeight += pairWeight;
          break; // one aspect per planet pair
        }
      }
    }
  }

  if (totalWeight === 0) return 50;
  const ratio = totalScore / totalWeight; // roughly -0.5 to 1
  return Math.round(Math.max(5, Math.min(98, 50 + ratio * 50)));
}

function getHarmonyColors(score: number) {
  if (score >= 80) return { accent: '#0f9f76', softAccent: 'rgba(16, 185, 129, 0.14)' };
  if (score >= 65) return { accent: '#15a34a', softAccent: 'rgba(34, 197, 94, 0.14)' };
  if (score >= 45) return { accent: '#d97706', softAccent: 'rgba(245, 158, 11, 0.16)' };
  if (score >= 25) return { accent: '#ea580c', softAccent: 'rgba(249, 115, 22, 0.16)' };
  return { accent: '#e11d48', softAccent: 'rgba(244, 63, 94, 0.16)' };
}

type HarmonyT = Awaited<ReturnType<typeof getTranslations<'compatibility'>>>;

function getHarmonyText(score: number, t: HarmonyT): { label: string; description: string } {
  if (score >= 80)
    return { label: t('harmonyHigh.label'), description: t('harmonyHigh.description') };
  if (score >= 65)
    return { label: t('harmonyGood.label'), description: t('harmonyGood.description') };
  if (score >= 45)
    return { label: t('harmonyModerate.label'), description: t('harmonyModerate.description') };
  if (score >= 25)
    return { label: t('harmonyNeutral.label'), description: t('harmonyNeutral.description') };
  return { label: t('harmonyDifficult.label'), description: t('harmonyDifficult.description') };
}

// ─── Speedometer SVG ─────────────────────────────────────────────────────────

interface SpeedometerProps {
  score: number;
  meta: { accent: string; softAccent: string };
  ariaLabel: string;
}

function SpeedometerGauge({ score, meta, ariaLabel }: SpeedometerProps) {
  const cx = 130,
    cy = 138,
    r = 90,
    sw = 12;
  const clamped = Math.max(0, Math.min(100, score));

  const pt = (deg: number, radius = r) => ({
    x: cx + radius * Math.cos((deg * Math.PI) / 180),
    y: cy - radius * Math.sin((deg * Math.PI) / 180),
  });

  const describeArc = (startDeg: number, endDeg: number, radius = r) => {
    const start = pt(startDeg, radius);
    const end = pt(endDeg, radius);
    const largeArcFlag = Math.abs(startDeg - endDeg) > 180 ? 1 : 0;

    return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  };

  const fullArcPath = describeArc(180, 0);
  const needleDeg = 180 - (clamped / 100) * 180;
  const needleTip = pt(needleDeg, r - 18);
  const marker = pt(needleDeg, r);

  const activeArcPath = clamped <= 0 ? null : describeArc(180, needleDeg);

  const zones = [
    { start: 180, end: 120, color: '#fb7185' },
    { start: 120, end: 60, color: '#f59e0b' },
    { start: 60, end: 0, color: '#10b981' },
  ];

  return (
    <div className="flex flex-col items-center gap-5">
      <svg viewBox="0 0 260 190" className="w-full max-w-80" role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="48%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(15, 23, 42, 0.18)" />
          </filter>
        </defs>

        <path
          d={fullArcPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={sw + 8}
          strokeLinecap="round"
          strokeOpacity="0.05"
        />

        {zones.map((zone) => (
          <path
            key={`${zone.start}-${zone.end}`}
            d={describeArc(zone.start, zone.end)}
            fill="none"
            stroke={zone.color}
            strokeOpacity="0.2"
            strokeWidth={sw}
            strokeLinecap="round"
          />
        ))}

        {activeArcPath ? (
          <path
            d={activeArcPath}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth={sw}
            strokeLinecap="round"
            filter="url(#needleGlow)"
          />
        ) : null}

        {Array.from({ length: 7 }).map((_, index) => {
          const deg = 180 - index * 30;
          const inner = pt(deg, r - 18);
          const outer = pt(deg, r + 2);
          const isMajor = index === 0 || index === 3 || index === 6;

          return (
            <line
              key={deg}
              x1={inner.x.toFixed(1)}
              y1={inner.y.toFixed(1)}
              x2={outer.x.toFixed(1)}
              y2={outer.y.toFixed(1)}
              stroke="currentColor"
              strokeWidth={isMajor ? 2 : 1.25}
              strokeLinecap="round"
              strokeOpacity={isMajor ? 0.34 : 0.14}
            />
          );
        })}

        <path
          d={`M ${cx} ${cy} L ${needleTip.x.toFixed(1)} ${needleTip.y.toFixed(1)}`}
          stroke="currentColor"
          strokeWidth={4.5}
          strokeLinecap="round"
          filter="url(#needleGlow)"
        />

        <circle
          cx={cx}
          cy={cy}
          r={18}
          style={{ fill: 'var(--card)' }}
          stroke="currentColor"
          strokeWidth={2}
          strokeOpacity="0.08"
        />
        <circle cx={cx} cy={cy} r={11} fill={meta.accent} />

        <circle cx={marker.x.toFixed(1)} cy={marker.y.toFixed(1)} r={4.5} fill={meta.accent} />

        <text
          x={pt(180, r + 22).x}
          y={pt(180, r + 22).y + 6}
          textAnchor="middle"
          fontSize={10}
          style={{ fill: 'var(--muted-foreground)', fontFamily: 'inherit' }}
        >
          0
        </text>
        <text
          x={pt(90, r + 24).x}
          y={pt(90, r + 24).y - 2}
          textAnchor="middle"
          fontSize={10}
          style={{ fill: 'var(--muted-foreground)', fontFamily: 'inherit' }}
        >
          50
        </text>
        <text
          x={pt(0, r + 22).x}
          y={pt(0, r + 22).y + 6}
          textAnchor="middle"
          fontSize={10}
          style={{ fill: 'var(--muted-foreground)', fontFamily: 'inherit' }}
        >
          100
        </text>
      </svg>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface ContentJson {
  title?: string;
  summary?: string;
  sections?: Array<{ key: string; title: string; content: string }>;
  placementHighlights?: string[];
  advice?: string[];
  disclaimers?: string[];
}

export default async function CompatibilityReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { reportId } = await params;
  if (!isUUID(reportId)) redirect('/compatibility');

  const { data: report } = await db
    .from('compatibility_reports')
    .select('*')
    .eq('id', reportId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!report) notFound();

  const [{ data: primaryChart }, { data: secondaryChart }] = await Promise.all([
    db
      .from('charts')
      .select('id, label, person_name')
      .eq('id', report.primary_chart_id)
      .maybeSingle(),
    db
      .from('charts')
      .select('id, label, person_name')
      .eq('id', report.secondary_chart_id)
      .maybeSingle(),
  ]);

  const t = await getTranslations('compatibility');

  const content = (report.rendered_content_json ?? {}) as ContentJson;
  const title =
    content.title ??
    t('reportTitleFallback', {
      primary: primaryChart?.person_name ?? '?',
      secondary: secondaryChart?.person_name ?? '?',
    });

  // Fetch positions for harmony score computation
  let harmonyScore = 50;
  if (report.status === 'ready') {
    const [primarySnapRes, secondarySnapRes] = await Promise.all([
      db
        .from('chart_snapshots')
        .select('id')
        .eq('chart_id', report.primary_chart_id)
        .order('snapshot_version', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('chart_snapshots')
        .select('id')
        .eq('chart_id', report.secondary_chart_id)
        .order('snapshot_version', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const [primRes, secRes] = await Promise.all([
      primarySnapRes.data?.id
        ? db
            .from('chart_positions')
            .select('body_key, degree_decimal')
            .eq('chart_snapshot_id', primarySnapRes.data.id)
        : { data: [] as PositionRow[] },
      secondarySnapRes.data?.id
        ? db
            .from('chart_positions')
            .select('body_key, degree_decimal')
            .eq('chart_snapshot_id', secondarySnapRes.data.id)
        : { data: [] as PositionRow[] },
    ]);
    harmonyScore = computeHarmonyScore(
      (primRes.data ?? []) as PositionRow[],
      (secRes.data ?? []) as PositionRow[],
    );
  }
  const harmonyColors = getHarmonyColors(harmonyScore);
  const harmonyText = getHarmonyText(harmonyScore, t);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t('sectionLabel')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {new Date(report.created_at).toLocaleDateString('ru', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            {report.status !== 'ready' ? (
              <Badge variant={report.status === 'error' ? 'destructive' : 'secondary'}>
                {report.status === 'generating'
                  ? t('statusGenerating')
                  : report.status === 'error'
                    ? t('statusError')
                    : t('statusPending')}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/compatibility">{t('backToAll')}</Link>
          </Button>
          {primaryChart ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/charts/${primaryChart.id}`}>{primaryChart.label}</Link>
            </Button>
          ) : null}
          {secondaryChart ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/charts/${secondaryChart.id}`}>{secondaryChart.label}</Link>
            </Button>
          ) : null}
        </div>
      </section>

      {/* Generating */}
      {report.status === 'pending' || report.status === 'generating' ? (
        <CompatibilityGenerating reportId={report.id} />
      ) : null}

      {/* Error */}
      {report.status === 'error' ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-destructive">{t('errorBannerTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('errorBannerDesc')}</p>
          <RetryCompatibilityButton reportId={report.id} />
        </div>
      ) : null}

      {/* Harmony score card — only when ready */}
      {report.status === 'ready' ? (
        <section className="overflow-hidden rounded-[2rem] border border-primary/10 bg-card shadow-sm">
          <div
            className="relative overflow-hidden border-b border-border/70 px-6 py-5"
            style={{
              background:
                'radial-gradient(circle at top left, rgba(245, 158, 11, 0.12), transparent 34%), radial-gradient(circle at top right, rgba(99, 102, 241, 0.06), transparent 30%)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/15">
                  {(primaryChart?.person_name ?? '?')[0].toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{primaryChart?.person_name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{t('primaryChart')}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <span className="hidden text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:block">
                  {t('sectionLabel')}
                </span>
                <span className="text-lg font-light text-muted-foreground/50">×</span>
              </div>
              <div className="flex min-w-0 flex-row-reverse items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-sm font-bold ring-1 ring-foreground/8">
                  {(secondaryChart?.person_name ?? '?')[0].toUpperCase()}
                </span>
                <div className="min-w-0 text-right">
                  <p className="truncate text-sm font-medium">
                    {secondaryChart?.person_name ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('secondaryChart')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] xl:items-center">
            <div className="rounded-[1.75rem] border border-border/70 bg-background/80 px-4 py-6">
              <div className="mb-4 flex items-center justify-between gap-3 px-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {t('harmonyIndex')}
                </p>
                <div />
              </div>
              <SpeedometerGauge
                score={harmonyScore}
                meta={harmonyColors}
                ariaLabel={t('harmonyIndexAriaLabel', { score: harmonyScore })}
              />
            </div>

            <div className="flex flex-col gap-5 xl:pl-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {t('howToRead')}
                </p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-5xl font-semibold tracking-tight text-foreground">
                    {harmonyScore}
                  </span>
                  <span className="pb-1 text-sm uppercase tracking-[0.22em] text-muted-foreground">
                    {t('outOf100')}
                  </span>
                </div>
              </div>

              <div
                className="inline-flex w-fit rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={{
                  backgroundColor: harmonyColors.softAccent,
                  color: harmonyColors.accent,
                  borderColor: `${harmonyColors.accent}22`,
                }}
              >
                {harmonyText.label}
              </div>

              <p className="text-sm leading-7 text-muted-foreground">{harmonyText.description}</p>

              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {t('infoWhatWeCount')}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/90">{t('infoPlanets')}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {t('infoBasisTitle')}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/90">{t('infoBasisBody')}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {t('infoInterpretTitle')}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/90">
                    {t('infoInterpretBody')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Summary */}
      {content.summary ? (
        <div className="rounded-2xl border bg-primary/5 p-6 md:p-8">
          <p className="text-[15px] leading-[1.75] italic">{content.summary}</p>
        </div>
      ) : null}

      {/* Placement highlights */}
      {content.placementHighlights && content.placementHighlights.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {t('keyAspects')}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {content.placementHighlights.map((h, i) => (
              <div key={i} className="rounded-xl border bg-card px-4 py-3 text-sm">
                {h}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Sections */}
      {content.sections && content.sections.length > 0 ? (
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

      {/* Advice */}
      {content.advice && content.advice.length > 0 ? (
        <div className="rounded-2xl border border-primary/20 bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            {t('adviceHeading')}
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
