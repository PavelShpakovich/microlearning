import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Tables } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { CreateReadingButton } from '@/components/astrology/create-reading-button';
import { ChartWheel } from '@/components/astrology/chart-wheel';

const db = supabaseAdmin;

type ChartPositionRow = Tables<'chart_positions'>;
type ChartAspectRow = Tables<'chart_aspects'>;

/* ---- display helpers ---- */

const SIGN_LABELS: Record<string, { symbol: string; name: string }> = {
  aries: { symbol: '♈', name: 'Aries' },
  taurus: { symbol: '♉', name: 'Taurus' },
  gemini: { symbol: '♊', name: 'Gemini' },
  cancer: { symbol: '♋', name: 'Cancer' },
  leo: { symbol: '♌', name: 'Leo' },
  virgo: { symbol: '♍', name: 'Virgo' },
  libra: { symbol: '♎', name: 'Libra' },
  scorpio: { symbol: '♏', name: 'Scorpio' },
  sagittarius: { symbol: '♐', name: 'Sagittarius' },
  capricorn: { symbol: '♑', name: 'Capricorn' },
  aquarius: { symbol: '♒', name: 'Aquarius' },
  pisces: { symbol: '♓', name: 'Pisces' },
};

const PLANET_LABELS: Record<string, { symbol: string; name: string }> = {
  sun: { symbol: '☉', name: 'Sun' },
  moon: { symbol: '☽', name: 'Moon' },
  mercury: { symbol: '☿', name: 'Mercury' },
  venus: { symbol: '♀', name: 'Venus' },
  mars: { symbol: '♂', name: 'Mars' },
  jupiter: { symbol: '♃', name: 'Jupiter' },
  saturn: { symbol: '♄', name: 'Saturn' },
  uranus: { symbol: '♅', name: 'Uranus' },
  neptune: { symbol: '♆', name: 'Neptune' },
  pluto: { symbol: '♇', name: 'Pluto' },
  ascendant: { symbol: '↑', name: 'Ascendant' },
  midheaven: { symbol: '↑', name: 'Midheaven' },
};

const ASPECT_LABELS: Record<string, { symbol: string; name: string; color: string }> = {
  conjunction: { symbol: '☌', name: 'Conjunction', color: 'text-violet-500' },
  sextile: { symbol: '⚹', name: 'Sextile', color: 'text-blue-500' },
  square: { symbol: '□', name: 'Square', color: 'text-red-500' },
  trine: { symbol: '△', name: 'Trine', color: 'text-green-500' },
  opposition: { symbol: '☍', name: 'Opposition', color: 'text-orange-500' },
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
  const deg = Math.floor(inSign);
  const min = Math.round((inSign - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}'`;
}

function getSignDisplay(signKey: string) {
  return SIGN_LABELS[signKey] ?? { symbol: '?', name: signKey };
}

function getPlanetDisplay(bodyKey: string) {
  return PLANET_LABELS[bodyKey] ?? { symbol: '·', name: bodyKey };
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

  if (!chart) redirect('/charts');

  const [{ data: snapshots }, { data: readings }] = await Promise.all([
    db.from('chart_snapshots').select('id').eq('chart_id', chartId).limit(1),
    db
      .from('readings')
      .select('id, title, reading_type, status, created_at, summary')
      .eq('chart_id', chartId)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
  ]);

  const snapshotId = snapshots?.[0]?.id;

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

  const sunPos = sortedPlanets.find((p: ChartPositionRow) => p.body_key === 'sun');
  const moonPos = sortedPlanets.find((p: ChartPositionRow) => p.body_key === 'moon');
  const asc = angles.find((p: ChartPositionRow) => p.body_key === 'ascendant');

  // Birth time display
  const birthTimeDisplay = chart.birth_time_known && chart.birth_time ? chart.birth_time : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
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
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      ☉ {getSignDisplay(sunPos.sign_key).name}
                    </span>
                  ) : null}
                  {moonPos ? (
                    <span className="flex items-center gap-1 rounded-full bg-sky-100 px-3 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                      ☽ {getSignDisplay(moonPos.sign_key).name}
                    </span>
                  ) : null}
                  {asc ? (
                    <span className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                      ↑ {getSignDisplay(asc.sign_key).name}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {/* Actions */}
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/charts">{t('backToCharts')}</Link>
            </Button>
            <CreateReadingButton chartId={chart.id} />
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
            <dd className="mt-0.5 capitalize font-medium">
              {String(chart.house_system).replace('_', ' ')}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Chart Wheel ── */}
      {sortedPlanets.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">{t('chartWheel')}</h2>
          <div className="overflow-hidden rounded-2xl border bg-[#0B0B18] p-4">
            <ChartWheel
              positions={[...sortedPlanets, ...angles].map((p: ChartPositionRow) => ({
                bodyKey: p.body_key,
                degreeDecimal: p.degree_decimal,
                retrograde: p.retrograde ?? false,
              }))}
              aspects={(aspects ?? []).map((a: ChartAspectRow) => ({
                bodyA: a.body_a,
                bodyB: a.body_b,
                aspectKey: a.aspect_key,
                orbDecimal: a.orb_decimal,
              }))}
            />
          </div>
        </section>
      ) : null}

      {/* ── Positions ── */}
      {sortedPlanets.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-semibold">{t('positions')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {sortedPlanets.map((pos: ChartPositionRow) => {
              const planet = getPlanetDisplay(pos.body_key);
              const sign = getSignDisplay(pos.sign_key);
              return (
                <div
                  key={pos.id}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                >
                  <span className="w-8 text-center text-xl leading-none">{planet.symbol}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold">{planet.name}</span>
                      {pos.retrograde ? (
                        <span className="rounded bg-orange-100 px-1 text-[10px] font-bold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                          Rx
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {sign.symbol} {sign.name} {formatDeg(pos.degree_decimal)}
                      {pos.house_number != null && ` · House ${pos.house_number}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Angles strip */}
          {angles.length > 0 ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {angles.map((pos: ChartPositionRow) => {
                const sign = getSignDisplay(pos.sign_key);
                const isAsc = pos.body_key === 'ascendant';
                return (
                  <div
                    key={pos.id}
                    className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3"
                  >
                    <span className="w-8 text-center text-sm font-bold text-muted-foreground">
                      {isAsc ? 'ASC' : 'MC'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">
                        {isAsc ? t('ascendantLabel') : t('midheavenLabel')}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {sign.symbol} {sign.name} {formatDeg(pos.degree_decimal)}
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
            {aspects.slice(0, 14).map((asp: ChartAspectRow) => {
              const bodyA = getPlanetDisplay(asp.body_a);
              const bodyB = getPlanetDisplay(asp.body_b);
              const aspect = ASPECT_LABELS[asp.aspect_key] ?? {
                symbol: asp.aspect_key,
                name: asp.aspect_key,
                color: 'text-foreground',
              };
              return (
                <div
                  key={asp.id}
                  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 text-sm"
                >
                  <span className={`w-6 shrink-0 text-center text-base font-bold ${aspect.color}`}>
                    {aspect.symbol}
                  </span>
                  <span className="flex-1 font-medium">
                    {bodyA.name} <span className="text-muted-foreground">·</span> {bodyB.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {asp.orb_decimal.toFixed(1)}° orb
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
          <CreateReadingButton chartId={chart.id} />
        </div>

        {readings && readings.length > 0 ? (
          <div className="grid gap-3">
            {readings.map((reading) => {
              const typeLabel = String(reading.reading_type).replace(/_/g, ' ');
              return (
                <Link
                  key={reading.id}
                  href={`/readings/${reading.id}`}
                  className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold group-hover:text-primary">
                        {reading.title}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                        {typeLabel} · {new Date(reading.created_at).toLocaleDateString()}
                      </p>
                      {reading.summary ? (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                          {reading.summary}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        reading.status === 'ready'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : reading.status === 'error'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {reading.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">{t('noReadingsYet')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('noReadingsHint')}</p>
          </div>
        )}
      </section>
    </main>
  );
}
