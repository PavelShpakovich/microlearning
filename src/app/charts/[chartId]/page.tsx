import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';

export const metadata: Metadata = { robots: { index: false } };
import { normalizeHouseSystem } from '@/lib/astrology/constants';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Tables } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import {
  Pencil,
  Link2,
  ChevronLeft,
  Sun,
  Moon,
  Asterisk,
  Square,
  Triangle,
  ArrowLeftRight,
} from 'lucide-react';
import LinkedReadings from '@/components/astrology/linked-readings';
import { CreateReadingButton } from '@/components/astrology/create-reading-button';
import { ChartWheel } from '@/components/astrology/chart-wheel';
import {
  ZodiacIcon,
  PlanetIcon,
  PlanetSun,
  PlanetMoon,
  PlanetAscendant,
  PlanetMidheaven,
  PLANET_COLORS,
} from '@/components/ui/astrology-icons';

const db = supabaseAdmin;

type ChartPositionRow = Tables<'chart_positions'>;
type ChartAspectRow = Tables<'chart_aspects'>;

const HOUSE_SYSTEM_LABEL_KEY: Record<string, string> = {
  placidus: 'housePlacidus',
  koch: 'houseKoch',
  equal: 'houseEqual',
  whole_sign: 'houseWholeSigns',
  porphyry: 'housePorphyry',
  regiomontanus: 'houseRegiomontanus',
  campanus: 'houseCampanus',
};

// ── Astrology classification maps ─────────────────────────────────────────────

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

const SIGN_MODALITY: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
  aries: 'cardinal',
  cancer: 'cardinal',
  libra: 'cardinal',
  capricorn: 'cardinal',
  taurus: 'fixed',
  leo: 'fixed',
  scorpio: 'fixed',
  aquarius: 'fixed',
  gemini: 'mutable',
  virgo: 'mutable',
  sagittarius: 'mutable',
  pisces: 'mutable',
};

const SIGN_RULER: Record<string, string> = {
  aries: 'mars',
  taurus: 'venus',
  gemini: 'mercury',
  cancer: 'moon',
  leo: 'sun',
  virgo: 'mercury',
  libra: 'venus',
  scorpio: 'pluto',
  sagittarius: 'jupiter',
  capricorn: 'saturn',
  aquarius: 'uranus',
  pisces: 'neptune',
};

// Personal planets used for element/modality balance
const BALANCE_BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

// Fire + Air = masculine, Earth + Water = feminine
const SIGN_POLARITY: Record<string, 'masculine' | 'feminine'> = {
  aries: 'masculine',
  taurus: 'feminine',
  gemini: 'masculine',
  cancer: 'feminine',
  leo: 'masculine',
  virgo: 'feminine',
  libra: 'masculine',
  scorpio: 'feminine',
  sagittarius: 'masculine',
  capricorn: 'feminine',
  aquarius: 'masculine',
  pisces: 'feminine',
};

// Planetary essential dignities (traditional rulership)
const PLANET_DOMICILE: Record<string, string[]> = {
  sun: ['leo'],
  moon: ['cancer'],
  mercury: ['gemini', 'virgo'],
  venus: ['taurus', 'libra'],
  mars: ['aries', 'scorpio'],
  jupiter: ['sagittarius', 'pisces'],
  saturn: ['capricorn', 'aquarius'],
};
const PLANET_EXALTATION: Record<string, string> = {
  sun: 'aries',
  moon: 'taurus',
  mercury: 'virgo',
  venus: 'pisces',
  mars: 'capricorn',
  jupiter: 'cancer',
  saturn: 'libra',
};
const PLANET_DETRIMENT: Record<string, string[]> = {
  sun: ['aquarius'],
  moon: ['capricorn'],
  mercury: ['sagittarius', 'pisces'],
  venus: ['aries', 'scorpio'],
  mars: ['taurus', 'libra'],
  jupiter: ['gemini', 'virgo'],
  saturn: ['cancer', 'leo'],
};
const PLANET_FALL: Record<string, string> = {
  sun: 'libra',
  moon: 'scorpio',
  mercury: 'pisces',
  venus: 'virgo',
  mars: 'cancer',
  jupiter: 'capricorn',
  saturn: 'aries',
};

function getDignity(
  bodyKey: string,
  signKey: string,
): 'domicile' | 'exaltation' | 'detriment' | 'fall' | null {
  if (PLANET_DOMICILE[bodyKey]?.includes(signKey)) return 'domicile';
  if (PLANET_EXALTATION[bodyKey] === signKey) return 'exaltation';
  if (PLANET_DETRIMENT[bodyKey]?.includes(signKey)) return 'detriment';
  if (PLANET_FALL[bodyKey] === signKey) return 'fall';
  return null;
}

const DIGNITY_COLORS: Record<string, string> = {
  domicile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  exaltation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  detriment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  fall: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// Tiny custom icon for Conjunction (two circles touching) — no Lucide equivalent
function ConjunctionIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="5" cy="8" r="3" />
      <circle cx="11" cy="8" r="3" />
    </svg>
  );
}

const ASPECT_META: Record<string, { icon: React.ElementType; color: string }> = {
  conjunction: { icon: ConjunctionIcon, color: 'text-primary' },
  sextile: { icon: Asterisk, color: 'text-sky-500' },
  square: { icon: Square, color: 'text-destructive' },
  trine: { icon: Triangle, color: 'text-emerald-500' },
  opposition: { icon: ArrowLeftRight, color: 'text-orange-400' },
};

// Natural display order for planets
const PLANET_ORDER = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

/** Format ecliptic longitude within sign as "15°23'" */
function formatDeg(degreeDecimal: number): string {
  const inSign = degreeDecimal % 30;
  let deg = Math.floor(inSign);
  let min = Math.round((inSign - deg) * 60);
  if (min === 60) {
    deg += 1;
    min = 0;
  }
  return `${deg}°${String(min).padStart(2, '0')}'`;
}

export default async function ChartDetailPage({
  params,
}: {
  params: Promise<{ chartId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { chartId } = await params;
  const t = await getTranslations('chartDetail');

  const { data: chart } = await db
    .from('charts')
    .select('*')
    .eq('id', chartId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!chart) notFound();

  const PAGE_SIZE = 5;

  const [{ data: snapshots }, readingsResult] = await Promise.all([
    db
      .from('chart_snapshots')
      .select('id, warnings_json, computed_chart_json')
      .eq('chart_id', chartId)
      .order('snapshot_version', { ascending: false })
      .limit(1),
    db
      .from('readings')
      .select('id, title, reading_type, status, created_at, summary', { count: 'exact' })
      .eq('chart_id', chartId)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1),
  ]);

  const initialReadings = (readingsResult.data ?? []) as Array<{
    id: string;
    title: string;
    reading_type: string;
    status: string;
    created_at: string;
    summary: string | null;
  }>;
  const initialTotal =
    typeof readingsResult.count === 'number' ? readingsResult.count : initialReadings.length;

  const latestSnapshot = snapshots?.[0];
  const snapshotId = latestSnapshot?.id;
  const snapshotWarnings = Array.isArray(latestSnapshot?.warnings_json)
    ? (latestSnapshot.warnings_json as string[]).filter((w) => typeof w === 'string')
    : [];

  const [{ data: positions }, { data: aspects }] = await Promise.all([
    snapshotId
      ? db.from('chart_positions').select('*').eq('chart_snapshot_id', snapshotId)
      : Promise.resolve({ data: [] }),
    snapshotId
      ? db
          .from('chart_aspects')
          .select('*')
          .eq('chart_snapshot_id', snapshotId)
          .order('orb_decimal')
      : Promise.resolve({ data: [] }),
  ]);

  // Sort positions: Sun, Moon, ... then rest in natural order
  const sortedPlanets = (positions ?? [])
    .filter((p: ChartPositionRow) => !['ascendant', 'midheaven'].includes(p.body_key))
    .sort((a: ChartPositionRow, b: ChartPositionRow) => {
      const ai = PLANET_ORDER.indexOf(a.body_key);
      const bi = PLANET_ORDER.indexOf(b.body_key);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const angles = (positions ?? []).filter((p: ChartPositionRow) =>
    ['ascendant', 'midheaven'].includes(p.body_key),
  );
  const normalizedHouseSystem = normalizeHouseSystem(chart.house_system);
  const houseSystemLabel =
    t(HOUSE_SYSTEM_LABEL_KEY[normalizedHouseSystem] as Parameters<typeof t>[0]) ??
    normalizedHouseSystem;

  const sunPos = sortedPlanets.find((p: ChartPositionRow) => p.body_key === 'sun');
  const moonPos = sortedPlanets.find((p: ChartPositionRow) => p.body_key === 'moon');
  const asc = angles.find((p: ChartPositionRow) => p.body_key === 'ascendant');

  // ── Chart stats ───────────────────────────────────────────────────────────
  const balancePlanets = (positions ?? []).filter((p: ChartPositionRow) =>
    BALANCE_BODIES.includes(p.body_key),
  );
  const elementCounts = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalityCounts = { cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of balancePlanets) {
    const el = SIGN_ELEMENT[p.sign_key];
    const mod = SIGN_MODALITY[p.sign_key];
    if (el) elementCounts[el]++;
    if (mod) modalityCounts[mod]++;
  }

  const chartRulerKey = asc ? SIGN_RULER[asc.sign_key] : undefined;
  const chartRulerPos = chartRulerKey
    ? (positions ?? []).find((p: ChartPositionRow) => p.body_key === chartRulerKey)
    : undefined;

  // Day chart = Sun above the horizon (houses 7-12)
  const isDay = sunPos?.house_number != null && sunPos.house_number >= 7;
  const hasTimeData = chart.birth_time_known && asc != null;

  // ── Polarity balance ────────────────────────────────────────────────────
  const polarityCounts = { masculine: 0, feminine: 0 };
  for (const p of balancePlanets) {
    const pol = SIGN_POLARITY[p.sign_key];
    if (pol) polarityCounts[pol]++;
  }

  // ── Stelliums (3+ planets in same sign or house) ────────────────────────
  const signGroups: Record<string, string[]> = {};
  const houseGroups: Record<number, string[]> = {};
  for (const p of sortedPlanets) {
    (signGroups[p.sign_key] ??= []).push(p.body_key);
    if (p.house_number != null) (houseGroups[p.house_number] ??= []).push(p.body_key);
  }
  const signStelliums = Object.entries(signGroups).filter(([, v]) => v.length >= 3);
  const houseStelliums = Object.entries(houseGroups).filter(([, v]) => v.length >= 3);

  // ── Dominant signs (from computed_chart_json) ───────────────────────────
  const computedChart = latestSnapshot?.computed_chart_json as
    | { dominantSigns?: string[]; dominantBodies?: string[] }
    | null
    | undefined;
  const dominantSigns = Array.isArray(computedChart?.dominantSigns)
    ? computedChart.dominantSigns
    : [];

  // ── Planetary dignities ─────────────────────────────────────────────────
  const dignities = sortedPlanets
    .map((p) => ({
      body: p.body_key,
      sign: p.sign_key,
      dignity: getDignity(p.body_key, p.sign_key),
    }))
    .filter((d) => d.dignity !== null);

  // ── Unaspected planets ──────────────────────────────────────────────────
  const aspectedBodies = new Set<string>();
  for (const a of aspects ?? []) {
    aspectedBodies.add(a.body_a);
    aspectedBodies.add(a.body_b);
  }
  const unaspected = sortedPlanets.filter((p) => !aspectedBodies.has(p.body_key));

  // Birth time display
  const birthTimeDisplay = chart.birth_time_known && chart.birth_time ? chart.birth_time : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Breadcrumb ── */}
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/charts">
            <ChevronLeft className="size-4" />
            {t('backToCharts')}
          </Link>
        </Button>
      </div>

      {/* ── Person hero ── */}
      <section className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {chart.person_name.charAt(0).toUpperCase()}
            </div>
            {/* Identity */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {chart.person_name}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{chart.label}</p>
              {/* Big three badges */}
              {(sunPos ?? moonPos ?? asc) ? (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {sunPos ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      <PlanetSun size={12} color={PLANET_COLORS.sun} />{' '}
                      {t(`signs.${sunPos.sign_key}` as Parameters<typeof t>[0])}
                    </span>
                  ) : null}
                  {moonPos ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                      <PlanetMoon size={12} color={PLANET_COLORS.moon} />{' '}
                      {t(`signs.${moonPos.sign_key}` as Parameters<typeof t>[0])}
                    </span>
                  ) : null}
                  {asc ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      <PlanetAscendant size={12} color={PLANET_COLORS.ascendant} />{' '}
                      {t(`signs.${asc.sign_key}` as Parameters<typeof t>[0])}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {/* Actions */}
          <div className="w-full shrink-0 sm:w-72">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-2.5 shadow-sm shadow-black/5">
              <div className="flex flex-col gap-2">
                <CreateReadingButton
                  chartId={chart.id}
                  chartStatus={chart.status}
                  className="h-11 w-full justify-center rounded-xl px-4 shadow-sm"
                />
                <Button
                  asChild
                  variant="outline"
                  className="h-11 w-full justify-center rounded-xl border-border/70 bg-background/90 px-4"
                >
                  <Link href={`/compatibility/new?primaryChartId=${chart.id}`}>
                    <Link2 className="size-4" />
                    {t('compareWithChart')}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="h-10 w-full justify-center rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <Link href={`/charts/${chart.id}/edit`}>
                    <Pencil className="size-4" />
                    {t('editChart')}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Birth details row */}
        <dl className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('birthDateLabel')}
            </dt>
            <dd className="mt-0.5 font-medium">
              {chart.birth_date}
              {birthTimeDisplay ? ` · ${birthTimeDisplay}` : ` · ${t('birthTimeUnknown')}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('birthPlaceLabel')}
            </dt>
            <dd className="mt-0.5 font-medium">
              {chart.city}, {chart.country}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('houseSystemLabel')}
            </dt>
            <dd className="mt-0.5 font-medium">{houseSystemLabel}</dd>
          </div>
        </dl>
      </section>

      {/* ── Status banners ── */}
      {chart.status === 'pending' ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-sm font-semibold text-primary">{t('statusPendingBannerTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('statusPendingBannerDesc')}</p>
        </div>
      ) : chart.status === 'error' ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm font-semibold text-destructive">{t('statusErrorBannerTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('statusErrorBannerDesc')}</p>
        </div>
      ) : null}

      {/* ── Calculation warnings ── */}
      {snapshotWarnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 dark:border-amber-800/40 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
            {t('recalculateWarnings')}
          </p>
          <ul className="mt-1.5 list-disc pl-4 text-xs text-amber-700 dark:text-amber-500">
            {snapshotWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Notes ── */}
      {chart.notes ? (
        <div className="rounded-2xl border bg-muted/30 px-5 py-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('notesLabel')}
          </p>
          <p className="text-sm leading-relaxed text-foreground">{chart.notes}</p>
        </div>
      ) : null}

      {/* ── Chart Stats ── */}
      {balancePlanets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Elements */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('elementsTitle')}
            </p>
            <div className="grid gap-3">
              {[
                { key: 'fire' as const, dot: 'bg-orange-500' },
                { key: 'earth' as const, dot: 'bg-emerald-600' },
                { key: 'air' as const, dot: 'bg-sky-400' },
                { key: 'water' as const, dot: 'bg-blue-500' },
              ].map((el) => {
                const count = elementCounts[el.key];
                return (
                  <div key={el.key} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs text-muted-foreground">
                      {t(`elements.${el.key}` as Parameters<typeof t>[0])}
                    </span>
                    <div className="flex flex-1 gap-1">
                      {Array.from({ length: count }).map((_, i) => (
                        <span key={i} className={`h-2 w-2 rounded-full ${el.dot}`} />
                      ))}
                      {Array.from({ length: Math.max(0, 7 - count) }).map((_, i) => (
                        <span key={i} className="h-2 w-2 rounded-full bg-muted" />
                      ))}
                    </div>
                    <span className="w-4 text-right text-sm font-semibold tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modalities */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('modalitiesTitle')}
            </p>
            <div className="grid gap-3">
              {[
                { key: 'cardinal' as const, dot: 'bg-primary' },
                { key: 'fixed' as const, dot: 'bg-purple-500' },
                { key: 'mutable' as const, dot: 'bg-emerald-500' },
              ].map((mod) => {
                const count = modalityCounts[mod.key];
                return (
                  <div key={mod.key} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-xs text-muted-foreground">
                      {t(`modalities.${mod.key}` as Parameters<typeof t>[0])}
                    </span>
                    <div className="flex flex-1 gap-1">
                      {Array.from({ length: count }).map((_, i) => (
                        <span key={i} className={`h-2 w-2 rounded-full ${mod.dot}`} />
                      ))}
                      {Array.from({ length: Math.max(0, 7 - count) }).map((_, i) => (
                        <span key={i} className="h-2 w-2 rounded-full bg-muted" />
                      ))}
                    </div>
                    <span className="w-4 text-right text-sm font-semibold tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart info */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('aboutChart')}
            </p>
            <div className="grid gap-4">
              {chartRulerPos && chartRulerKey ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <PlanetIcon
                      planet={chartRulerKey}
                      size={18}
                      color={
                        (PLANET_COLORS as Record<string, string>)[chartRulerKey] ?? 'currentColor'
                      }
                    />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('chartRuler')}</p>
                    <p className="mt-0.5 text-sm font-semibold">
                      {t(`planets.${chartRulerKey}` as Parameters<typeof t>[0])}
                      {chartRulerPos.sign_key ? (
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          {t('inSign')}{' '}
                          {t(`signs.${chartRulerPos.sign_key}` as Parameters<typeof t>[0])}
                        </span>
                      ) : null}
                    </p>
                    {chartRulerPos.house_number ? (
                      <p className="text-xs text-muted-foreground">
                        {t('houseLabel', { number: chartRulerPos.house_number })}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {hasTimeData ? (
                <div>
                  <p className="text-xs text-muted-foreground">{t('chartType')}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
                    {isDay ? (
                      <Sun className="size-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Moon className="size-3.5 text-sky-400 shrink-0" />
                    )}
                    {isDay ? t('dayChart') : t('nightChart')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isDay ? t('dayChartDesc') : t('nightChartDesc')}
                  </p>
                </div>
              ) : null}

              {!chartRulerPos && !hasTimeData ? (
                <p className="text-sm text-muted-foreground">{t('addLocationHint')}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Extended Stats ── */}
      {balancePlanets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Polarity */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('polarityTitle')}
            </p>
            <p className="mb-4 text-[10px] text-muted-foreground/60">{t('polarityDesc')}</p>
            <div className="grid gap-3">
              {(['masculine', 'feminine'] as const).map((pol) => {
                const count = polarityCounts[pol];
                return (
                  <div key={pol} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">
                      {t(`polarity.${pol}` as Parameters<typeof t>[0])}
                    </span>
                    <div className="flex flex-1 gap-1">
                      {Array.from({ length: count }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 w-2 rounded-full ${pol === 'masculine' ? 'bg-orange-500' : 'bg-indigo-500'}`}
                        />
                      ))}
                      {Array.from({ length: Math.max(0, 7 - count) }).map((_, i) => (
                        <span key={i} className="h-2 w-2 rounded-full bg-muted" />
                      ))}
                    </div>
                    <span className="w-4 text-right text-sm font-semibold tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dominant Signs */}
          {dominantSigns.length > 0 ? (
            <div className="rounded-2xl border bg-card p-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('dominantSignsTitle')}
              </p>
              <p className="mb-4 text-[10px] text-muted-foreground/60">{t('dominantSignsDesc')}</p>
              <div className="flex flex-wrap gap-2">
                {dominantSigns.map((sign) => (
                  <span
                    key={sign}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                  >
                    <ZodiacIcon sign={sign} size={14} />
                    {t(`signs.${sign}` as Parameters<typeof t>[0])}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Stelliums */}
          <div className="rounded-2xl border bg-card p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('stelliumsTitle')}
            </p>
            <p className="mb-4 text-[10px] text-muted-foreground/60">{t('stelliumsDesc')}</p>
            {signStelliums.length === 0 && houseStelliums.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('noStelliums')}</p>
            ) : (
              <div className="grid gap-2">
                {signStelliums.map(([sign, bodies]) => (
                  <div key={`s-${sign}`} className="rounded-lg bg-primary/5 px-3 py-2">
                    <p className="text-xs font-semibold">
                      {t('stelliumSign', {
                        sign: t(`signs.${sign}` as Parameters<typeof t>[0]),
                      })}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {bodies.map((b) => t(`planets.${b}` as Parameters<typeof t>[0])).join(', ')}
                    </p>
                  </div>
                ))}
                {houseStelliums.map(([house, bodies]) => (
                  <div key={`h-${house}`} className="rounded-lg bg-primary/5 px-3 py-2">
                    <p className="text-xs font-semibold">{t('stelliumHouse', { house })}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {bodies.map((b) => t(`planets.${b}` as Parameters<typeof t>[0])).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Planetary Dignities */}
          {dignities.length > 0 ? (
            <div className="rounded-2xl border bg-card p-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('dignityTitle')}
              </p>
              <p className="mb-4 text-[10px] text-muted-foreground/60">{t('dignityDesc')}</p>
              <div className="grid gap-2">
                {dignities.map((d) => (
                  <div
                    key={d.body}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${DIGNITY_COLORS[d.dignity!]}`}
                  >
                    <PlanetIcon
                      planet={d.body}
                      size={16}
                      color={PLANET_COLORS[d.body as keyof typeof PLANET_COLORS] ?? 'currentColor'}
                    />
                    <span className="text-xs font-semibold">
                      {t(`planets.${d.body}` as Parameters<typeof t>[0])}
                    </span>
                    <span className="text-xs">
                      {t(`dignity.${d.dignity}` as Parameters<typeof t>[0])}
                    </span>
                    <span className="ml-auto text-[10px] opacity-70">
                      {t(`dignityShort.${d.dignity}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Unaspected Planets */}
          {unaspected.length > 0 ? (
            <div className="rounded-2xl border bg-card p-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('unaspectedTitle')}
              </p>
              <p className="mb-4 text-[10px] text-muted-foreground/60">{t('unaspectedDesc')}</p>
              <div className="grid gap-2">
                {unaspected.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <PlanetIcon
                      planet={p.body_key}
                      size={16}
                      color={
                        PLANET_COLORS[p.body_key as keyof typeof PLANET_COLORS] ?? 'currentColor'
                      }
                    />
                    <span className="text-xs font-medium">
                      {t(`planets.${p.body_key}` as Parameters<typeof t>[0])}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {t(`signs.${p.sign_key}` as Parameters<typeof t>[0])}
                      {p.house_number != null
                        ? ` · ${t('houseLabel', { number: p.house_number })}`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Chart Wheel ── */}
      {sortedPlanets.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">{t('chartWheel')}</h2>
          <div className="overflow-x-auto rounded-2xl border bg-card p-4">
            <div className="min-w-[340px]">
              <ChartWheel
                positions={[...sortedPlanets, ...angles].map((p: ChartPositionRow) => ({
                  bodyKey: p.body_key,
                  degreeDecimal: p.degree_decimal,
                  retrograde: p.retrograde ?? false,
                }))}
                houseSystem={normalizedHouseSystem}
                ariaLabel={t('chartWheelAriaLabel')}
                aspects={(aspects ?? []).map((a: ChartAspectRow) => ({
                  bodyA: a.body_a,
                  bodyB: a.body_b,
                  aspectKey: a.aspect_key,
                  orbDecimal: a.orb_decimal,
                }))}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Positions ── */}
      {sortedPlanets.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">{t('positions')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {sortedPlanets.map((pos: ChartPositionRow) => {
              const planetColor =
                PLANET_COLORS[pos.body_key as keyof typeof PLANET_COLORS] ?? 'currentColor';
              const planetName =
                t(`planets.${pos.body_key}` as Parameters<typeof t>[0]) ?? pos.body_key;
              const signName =
                t(`signs.${pos.sign_key}` as Parameters<typeof t>[0]) ?? pos.sign_key;
              return (
                <div
                  key={pos.id}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                >
                  <span className="flex w-8 shrink-0 items-center justify-center">
                    <PlanetIcon planet={pos.body_key} size={20} color={planetColor} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold">{planetName}</span>
                      {pos.retrograde ? (
                        <span className="rounded bg-orange-100 px-1 text-[10px] font-bold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                          Rx
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground/60">
                        {t(`planetMeanings.${pos.body_key}` as Parameters<typeof t>[0]) ?? ''}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <ZodiacIcon sign={pos.sign_key} size={12} />
                      <span className="font-medium">
                        {signName} {formatDeg(pos.degree_decimal)}
                      </span>
                      {pos.house_number != null ? (
                        <span>· {t('houseLabel', { number: pos.house_number })}</span>
                      ) : null}
                    </div>
                    {pos.sign_key ? (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/55 leading-tight">
                        {t(`signKeywords.${pos.sign_key}` as Parameters<typeof t>[0])}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Angles strip */}
          {angles.length > 0 ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {angles.map((pos: ChartPositionRow) => {
                const isAsc = pos.body_key === 'ascendant';
                const signName =
                  t(`signs.${pos.sign_key}` as Parameters<typeof t>[0]) ?? pos.sign_key;
                return (
                  <div
                    key={pos.id}
                    className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3"
                  >
                    <span className="flex w-8 shrink-0 items-center justify-center">
                      {isAsc ? (
                        <PlanetAscendant size={20} color={PLANET_COLORS.ascendant} />
                      ) : (
                        <PlanetMidheaven size={20} color={PLANET_COLORS.midheaven} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">
                        {isAsc ? t('ascendantLabel') : t('midheavenLabel')}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <ZodiacIcon sign={pos.sign_key} size={12} />
                        <span>
                          {signName} {formatDeg(pos.degree_decimal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Aspects ── */}
      {aspects && aspects.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">{t('aspects')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {aspects.map((asp: ChartAspectRow) => {
              const planetA = t(`planets.${asp.body_a}` as Parameters<typeof t>[0]) ?? asp.body_a;
              const planetB = t(`planets.${asp.body_b}` as Parameters<typeof t>[0]) ?? asp.body_b;
              const meta = ASPECT_META[asp.aspect_key] ?? {
                icon: null,
                color: 'text-foreground',
              };
              const AspectIcon = meta.icon;
              return (
                <div
                  key={asp.id}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 text-sm"
                >
                  <span className={`flex w-6 shrink-0 items-center justify-center ${meta.color}`}>
                    {AspectIcon ? (
                      <AspectIcon className="size-4" />
                    ) : (
                      <span className="text-base font-bold">{asp.aspect_key}</span>
                    )}
                  </span>
                  <span className="flex-1 font-medium">
                    {planetA} <span className="text-muted-foreground">·</span> {planetB}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {asp.orb_decimal.toFixed(1)}° {t('orbSuffix')}
                    {asp.applying != null ? (
                      <span className="ml-1.5">
                        · {asp.applying ? t('applying') : t('separating')}
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Readings ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('linkedReadings')}</h2>
        </div>

        <LinkedReadings
          chartId={chart.id}
          initialReadings={initialReadings}
          initialTotal={initialTotal}
          pageSize={PAGE_SIZE}
        />
      </section>
    </main>
  );
}
