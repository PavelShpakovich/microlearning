import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateStructuredOutputWithUsage } from '@/lib/llm/structured-generation';
import { calculateNatalChart } from '@/lib/astrology/engine';
import { NotFoundError } from '@/lib/errors';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { Json, TablesInsert } from '@/lib/supabase/types';

// ── Russian planet/sign labels ────────────────────────────────────────────────
const BODY_RU: Record<string, string> = {
  sun: 'Солнце',
  moon: 'Луна',
  mercury: 'Меркурий',
  venus: 'Венера',
  mars: 'Марс',
  jupiter: 'Юпитер',
  saturn: 'Сатурн',
  uranus: 'Уран',
  neptune: 'Нептун',
  pluto: 'Плутон',
  ascendant: 'Асцендент',
  midheaven: 'Середина Неба',
};

const SIGN_RU: Record<string, string> = {
  aries: 'Овен',
  taurus: 'Телец',
  gemini: 'Близнецы',
  cancer: 'Рак',
  leo: 'Лев',
  virgo: 'Дева',
  libra: 'Весы',
  scorpio: 'Скорпион',
  sagittarius: 'Стрелец',
  capricorn: 'Козерог',
  aquarius: 'Водолей',
  pisces: 'Рыбы',
};

// ── English planet/sign labels ────────────────────────────────────────────────
const BODY_EN: Record<string, string> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  ascendant: 'Ascendant',
  midheaven: 'Midheaven',
};

const SIGN_EN: Record<string, string> = {
  aries: 'Aries',
  taurus: 'Taurus',
  gemini: 'Gemini',
  cancer: 'Cancer',
  leo: 'Leo',
  virgo: 'Virgo',
  libra: 'Libra',
  scorpio: 'Scorpio',
  sagittarius: 'Sagittarius',
  capricorn: 'Capricorn',
  aquarius: 'Aquarius',
  pisces: 'Pisces',
};

// ── Locale helpers ────────────────────────────────────────────────────────────
type ForecastLocale = 'en' | 'ru';

function getBodyLabel(key: string, locale: ForecastLocale): string {
  return locale === 'en' ? (BODY_EN[key] ?? key) : (BODY_RU[key] ?? key);
}

function getSignLabel(key: string, locale: ForecastLocale): string {
  return locale === 'en' ? (SIGN_EN[key] ?? key) : (SIGN_RU[key] ?? key);
}

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

// ── Moon phase (deterministic) ────────────────────────────────────────────────
function computeMoonPhase(sunLon: number, moonLon: number, locale: ForecastLocale): string {
  const angle = (moonLon - sunLon + 360) % 360;
  if (locale === 'en') {
    if (angle < 22.5 || angle >= 337.5) return 'New Moon — time for new beginnings';
    if (angle < 67.5) return 'Waxing Crescent — energy is building';
    if (angle < 112.5) return 'First Quarter — time for action';
    if (angle < 157.5) return 'Waxing Gibbous — strength and growth';
    if (angle < 202.5) return 'Full Moon — peak energy, cycle completion';
    if (angle < 247.5) return 'Waning Gibbous — time for reflection and giving back';
    if (angle < 292.5) return 'Last Quarter — letting go and reassessing';
    return 'Waning Crescent — completion, preparing for the new';
  }
  if (angle < 22.5 || angle >= 337.5) return 'Новолуние — время для новых начинаний';
  if (angle < 67.5) return 'Растущий серп — энергия нарастает';
  if (angle < 112.5) return 'Первая четверть — время активных действий';
  if (angle < 157.5) return 'Растущая луна — сила и рост';
  if (angle < 202.5) return 'Полнолуние — пик энергии, завершение циклов';
  if (angle < 247.5) return 'Убывающая луна — время осмысления и отдачи';
  if (angle < 292.5) return 'Последняя четверть — отпускание и переосмысление';
  return 'Убывающий серп — завершение, подготовка к новому';
}

// ── Transit-to-natal aspect computation ──────────────────────────────────────
// Only tight orbs matter for day-specific forecasts.
// Wide-orb slow-planet aspects are months-long backgrounds, not daily events.
const ASPECTS = [
  { name: 'conjunction', angle: 0, orb: 3 },
  { name: 'sextile', angle: 60, orb: 2 },
  { name: 'square', angle: 90, orb: 3 },
  { name: 'trine', angle: 120, orb: 3 },
  { name: 'opposition', angle: 180, orb: 3 },
] as const;

// Fast-moving planets produce genuine day-to-day transit events.
const FAST_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars'] as const;

// Slow-moving planets create long-term background themes (weeks/months).
// Use tighter orbs since their influence is gradual.
const SLOW_PLANETS = ['jupiter', 'saturn'] as const;
const SLOW_PLANET_ASPECTS = [
  { name: 'conjunction', angle: 0, orb: 2 },
  { name: 'square', angle: 90, orb: 2 },
  { name: 'trine', angle: 120, orb: 2 },
  { name: 'opposition', angle: 180, orb: 2 },
] as const;

interface TransitAspect {
  transitBody: string;
  natalBody: string;
  aspectName: string;
  orb: number;
  applying: boolean;
}

/** Signed shortest angular distance from A to B (positive = A moving toward exact). */
function signedAngularDiff(a: number, b: number): number {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function computeTransitAspects(
  natalPositions: Array<{ body_key: string; degree_decimal: number }>,
  transitPositions: Array<{ bodyKey: string; degreeDecimal: number; retrograde: boolean }>,
): TransitAspect[] {
  const aspects: TransitAspect[] = [];
  const natalPlanets = natalPositions.filter((p) => PLANET_ORDER.includes(p.body_key));
  // Only fast-moving transiting planets create genuine day-specific influences
  const transitPlanets = transitPositions.filter((p) =>
    (FAST_PLANETS as readonly string[]).includes(p.bodyKey),
  );

  for (const transit of transitPlanets) {
    for (const natal of natalPlanets) {
      const raw = Math.abs(signedAngularDiff(transit.degreeDecimal, natal.degree_decimal));
      const diff = raw > 180 ? 360 - raw : raw;
      for (const aspect of ASPECTS) {
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= aspect.orb) {
          // Applying = transit is moving toward exact aspect.
          // The exact longitude for the transit would be (natal + aspectAngle) mod 360,
          // but the aspect is symmetric, so check the signed diff to the nearest exact point.
          const exactA = (natal.degree_decimal + aspect.angle) % 360;
          const exactB = (natal.degree_decimal - aspect.angle + 360) % 360;
          const gapA = Math.abs(signedAngularDiff(transit.degreeDecimal, exactA));
          const gapB = Math.abs(signedAngularDiff(transit.degreeDecimal, exactB));
          const nearestExact = gapA <= gapB ? exactA : exactB;
          const gap = signedAngularDiff(transit.degreeDecimal, nearestExact);
          // Direct planet applies when it's before the exact point (gap > 0 in forward direction)
          // Retrograde planet applies when moving backward toward it (gap < 0)
          const applying = transit.retrograde ? gap < 0 : gap > 0;
          aspects.push({
            transitBody: transit.bodyKey,
            natalBody: natal.body_key,
            aspectName: aspect.name,
            orb,
            applying,
          });
          break;
        }
      }
    }
  }

  // Prioritise: applying aspects first, then tightest orb. Cap at 6 most relevant.
  return aspects
    .sort((a, b) => {
      if (a.applying !== b.applying) return a.applying ? -1 : 1;
      return a.orb - b.orb;
    })
    .slice(0, 6);
}

/** Compute notable aspects between transiting planets themselves (general day tone). */
function computeTransitToTransitAspects(
  transitPositions: Array<{ bodyKey: string; degreeDecimal: number }>,
): Array<{ bodyA: string; bodyB: string; aspectName: string; orb: number }> {
  const results: Array<{ bodyA: string; bodyB: string; aspectName: string; orb: number }> = [];
  // Use tighter orbs for transit-to-transit (general backdrop, not personalized)
  const tightOrbs = [3, 2, 3, 3, 3]; // conjunction, sextile, square, trine, opposition

  for (let i = 0; i < transitPositions.length; i++) {
    for (let j = i + 1; j < transitPositions.length; j++) {
      const a = transitPositions[i];
      const b = transitPositions[j];
      const raw = Math.abs(a.degreeDecimal - b.degreeDecimal);
      const diff = raw > 180 ? 360 - raw : raw;
      for (let k = 0; k < ASPECTS.length; k++) {
        const aspect = ASPECTS[k];
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= tightOrbs[k]) {
          results.push({ bodyA: a.bodyKey, bodyB: b.bodyKey, aspectName: aspect.name, orb });
          break;
        }
      }
    }
  }

  return results.sort((a, b) => a.orb - b.orb).slice(0, 5);
}

/** Compute slow-planet (Jupiter, Saturn) transit aspects to natal chart.
 *  These are long-term background themes — included separately from fast daily transits. */
export function computeSlowTransitAspects(
  natalPositions: Array<{ body_key: string; degree_decimal: number }>,
  transitPositions: Array<{ bodyKey: string; degreeDecimal: number; retrograde: boolean }>,
): TransitAspect[] {
  const aspects: TransitAspect[] = [];
  const natalPlanets = natalPositions.filter((p) => PLANET_ORDER.includes(p.body_key));
  const slowTransits = transitPositions.filter((p) =>
    (SLOW_PLANETS as readonly string[]).includes(p.bodyKey),
  );

  for (const transit of slowTransits) {
    for (const natal of natalPlanets) {
      const raw = Math.abs(signedAngularDiff(transit.degreeDecimal, natal.degree_decimal));
      const diff = raw > 180 ? 360 - raw : raw;
      for (const aspect of SLOW_PLANET_ASPECTS) {
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= aspect.orb) {
          const exactA = (natal.degree_decimal + aspect.angle) % 360;
          const exactB = (natal.degree_decimal - aspect.angle + 360) % 360;
          const gapA = Math.abs(signedAngularDiff(transit.degreeDecimal, exactA));
          const gapB = Math.abs(signedAngularDiff(transit.degreeDecimal, exactB));
          const nearestExact = gapA <= gapB ? exactA : exactB;
          const gap = signedAngularDiff(transit.degreeDecimal, nearestExact);
          const applying = transit.retrograde ? gap < 0 : gap > 0;
          aspects.push({
            transitBody: transit.bodyKey,
            natalBody: natal.body_key,
            aspectName: aspect.name,
            orb,
            applying,
          });
          break;
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb).slice(0, 4);
}

const db = supabaseAdmin;

/** Returns today's date string (YYYY-MM-DD) in the given IANA timezone, or UTC if invalid/missing. */
function todayInTimezone(tz?: string | null): string {
  try {
    if (tz) {
      return new Date().toLocaleDateString('sv-SE', { timeZone: tz });
    }
  } catch {
    // Invalid timezone — fall through to UTC
  }
  return new Date().toISOString().slice(0, 10);
}

export const dailyForecastSchema = z.object({
  interpretation: z
    .string()
    .min(200, 'Interpretation must be at least 200 characters')
    .refine(
      (s) => s.includes('\n\n'),
      'Interpretation must contain multiple paragraphs separated by blank lines',
    ),
  keyTheme: z.string().min(5, 'Key theme must be at least 5 characters'),
  advice: z.string().min(20, 'Advice must be at least 20 characters'),
  moonPhase: z.string().optional(), // set deterministically after generation
});

export type DailyForecastContent = z.infer<typeof dailyForecastSchema>;

/** Returns today's daily forecast for the given chart, creating a pending row if missing.
 *  Deletes any expired (non-today) daily forecasts for the user first.
 *  If multiple rows exist (race condition), prefers the one that already has generated content. */
export async function getOrCreateDailyForecast(
  userId: string,
  chartId: string,
  userTimezone?: string | null,
) {
  const today = todayInTimezone(userTimezone);

  const { data: rows } = await db
    .from('forecasts')
    .select('*')
    .eq('user_id', userId)
    .eq('chart_id', chartId)
    .eq('forecast_type', 'daily')
    .eq('target_start_date', today)
    .order('updated_at', { ascending: false });

  if (rows && rows.length > 0) {
    // Prefer the row that already has generated content
    const withContent = rows.find((r) => {
      const c = r.rendered_content_json as Record<string, unknown> | null;
      return c && typeof c.interpretation === 'string';
    });
    return withContent ?? rows[0];
  }

  const { data: created, error } = await db
    .from('forecasts')
    .insert({
      user_id: userId,
      chart_id: chartId,
      forecast_type: 'daily',
      target_start_date: today,
      target_end_date: today,
    })
    .select('*')
    .single();

  if (error || !created)
    throw new Error(`Failed to create daily forecast: ${error?.message ?? 'unknown'}`);
  return created;
}

/** Runs LLM to generate the daily horoscope content. Idempotent — skips if already generated. */
export async function generateDailyForecast(
  forecastId: string,
  userId: string,
  userTimezone?: string | null,
) {
  const { data: forecast } = await db
    .from('forecasts')
    .select('*')
    .eq('id', forecastId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!forecast) throw new NotFoundError({ message: 'Forecast not found' });

  // Idempotency: skip if already generated
  const existing = forecast.rendered_content_json as Record<string, unknown> | null;
  if (existing && typeof existing.interpretation === 'string') return forecast;

  const { data: chart } = await db
    .from('charts')
    .select('*')
    .eq('id', forecast.chart_id)
    .eq('subject_type', 'self')
    .maybeSingle();

  if (!chart) throw new NotFoundError({ message: 'Self chart not found' });

  // Fetch user locale (single source of truth)
  const { data: userProfile } = await db
    .from('profiles')
    .select('locale')
    .eq('id', userId)
    .single();
  const locale: ForecastLocale = (userProfile?.locale ?? 'ru') as ForecastLocale;

  // Fetch natal positions (including degree for aspect calculation)
  const { data: snapshot } = await db
    .from('chart_snapshots')
    .select('id')
    .eq('chart_id', chart.id)
    .order('snapshot_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: positions } = snapshot
    ? await db
        .from('chart_positions')
        .select('body_key, sign_key, house_number, degree_decimal, retrograde')
        .eq('chart_snapshot_id', snapshot.id)
    : { data: [] };

  // Compute today's transits at the user's local noon for maximum daily accuracy.
  // Geocentric positions don't depend on observer location, only on time.
  const transitDate = todayInTimezone(userTimezone);

  // ── Fetch yesterday's forecast for anti-repetition context ─────────────
  const yesterdayDate = (() => {
    const d = new Date(`${transitDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const { data: yesterdayForecast } = await db
    .from('forecasts')
    .select('rendered_content_json, transit_snapshot_json')
    .eq('user_id', userId)
    .eq('chart_id', forecast.chart_id)
    .eq('forecast_type', 'daily')
    .eq('target_start_date', yesterdayDate)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const yesterdayContent = yesterdayForecast?.rendered_content_json as Record<
    string,
    unknown
  > | null;
  const yesterdayKeyTheme =
    yesterdayContent && typeof yesterdayContent.keyTheme === 'string'
      ? yesterdayContent.keyTheme
      : null;
  // Build a Date object representing noon in the user's timezone
  let transitTime = '12:00';
  try {
    if (userTimezone) {
      // Find the UTC time that corresponds to noon in the user's timezone
      const noonLocal = new Date(`${transitDate}T12:00:00`);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      });
      // Get UTC offset by comparing formatted local time with UTC
      const parts = formatter.formatToParts(noonLocal);
      const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
      const displayed = new Date(
        Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')),
      );
      const offsetMs = displayed.getTime() - noonLocal.getTime();
      const noonUtc = new Date(noonLocal.getTime() - offsetMs);
      transitTime = `${String(noonUtc.getUTCHours()).padStart(2, '0')}:${String(noonUtc.getUTCMinutes()).padStart(2, '0')}`;
    }
  } catch {
    // Invalid timezone — fall back to 12:00 UTC
  }
  let transitPositions: Array<{
    bodyKey: string;
    signKey: string;
    degreeDecimal: number;
    retrograde: boolean;
  }> = [];
  try {
    const transitResult = await calculateNatalChart({
      personName: 'transit',
      birthDate: transitDate,
      birthTime: transitTime,
      birthTimeKnown: true,
      city: 'London',
      country: 'GB',
      latitude: 51.5,
      longitude: 0,
      houseSystem: 'equal',
      label: 'transit',
      subjectType: 'other',
    });
    // Only the 10 main planets — angles (ASC/MC) are not real transiting bodies
    transitPositions = transitResult.positions
      .filter((p) => PLANET_ORDER.includes(p.bodyKey))
      .map((p) => ({
        bodyKey: p.bodyKey,
        signKey: p.signKey,
        degreeDecimal: p.degreeDecimal,
        retrograde: p.retrograde,
      }));
  } catch (err) {
    logger.error({ err }, 'Failed to compute transits for daily forecast');
  }

  // Deterministic moon phase (not LLM-generated)
  const transitSun = transitPositions.find((p) => p.bodyKey === 'sun');
  const transitMoon = transitPositions.find((p) => p.bodyKey === 'moon');
  const moonPhase =
    transitSun && transitMoon
      ? computeMoonPhase(transitSun.degreeDecimal, transitMoon.degreeDecimal, locale)
      : undefined;

  // Validate that we have natal positions — without them the forecast is generic and unhelpful
  const natalWithDegree = (positions ?? []).filter((p) => p.degree_decimal != null);
  if (natalWithDegree.length === 0) {
    logger.error(
      { forecastId, userId },
      'forecast: no natal positions found — cannot generate personalized forecast',
    );
    await db
      .from('forecasts')
      .update({
        rendered_content_json: { status: 'error' } as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', forecastId);
    throw new Error('Cannot generate forecast: natal chart positions are missing');
  }

  // Transit-to-natal aspects
  const transitAspects = computeTransitAspects(natalWithDegree, transitPositions);

  // Slow-planet transit aspects (Jupiter, Saturn — long-term background themes)
  const slowTransitAspects = computeSlowTransitAspects(natalWithDegree, transitPositions);

  // Transit-to-transit aspects (general day backdrop)
  const skyAspects = computeTransitToTransitAspects(transitPositions);

  // ── Prompt data (human-readable, no raw degrees/orbs) ────────────────────

  // Life areas affected by each natal planet — used in aspect descriptions
  const NATAL_BODY_AREA: Record<string, Record<ForecastLocale, string>> = {
    sun: { ru: 'самовыражение и жизненную силу', en: 'self-expression and vitality' },
    moon: { ru: 'эмоции и интуицию', en: 'emotions and intuition' },
    mercury: { ru: 'мышление и общение', en: 'thinking and communication' },
    venus: { ru: 'отношения и удовольствия', en: 'relationships and pleasures' },
    mars: { ru: 'энергию и инициативу', en: 'energy and initiative' },
    jupiter: { ru: 'рост и удачу', en: 'growth and luck' },
    saturn: { ru: 'дисциплину и карьеру', en: 'discipline and career' },
    uranus: { ru: 'стремление к переменам', en: 'desire for change' },
    neptune: { ru: 'воображение и чувствительность', en: 'imagination and sensitivity' },
    pluto: { ru: 'глубинные трансформации', en: 'deep transformations' },
    ascendant: { ru: 'личность и первое впечатление', en: 'personality and first impressions' },
    midheaven: { ru: 'профессиональную реализацию', en: 'professional fulfillment' },
  };

  // What a transiting planet activates
  const TRANSIT_BODY_ENERGY: Record<string, Record<ForecastLocale, string>> = {
    sun: { ru: 'жизненная энергия и фокус', en: 'life energy and focus' },
    moon: { ru: 'настроение и эмоциональный фон', en: 'mood and emotional background' },
    mercury: { ru: 'мышление, общение и планирование', en: 'thinking, communication and planning' },
    venus: { ru: 'отношения, красота и удовольствия', en: 'relationships, beauty and pleasures' },
    mars: { ru: 'активность, смелость и желания', en: 'activity, courage and desires' },
  };

  const ASPECT_QUALITY: Record<
    string,
    { phrase: Record<ForecastLocale, string>; tone: '✦' | '△' | '•' }
  > = {
    trine: { phrase: { ru: 'поддерживает', en: 'supports' }, tone: '✦' },
    sextile: {
      phrase: { ru: 'открывает возможности для', en: 'opens opportunities for' },
      tone: '✦',
    },
    conjunction: { phrase: { ru: 'усиливает', en: 'amplifies' }, tone: '•' },
    square: {
      phrase: { ru: 'создаёт напряжение вокруг', en: 'creates tension around' },
      tone: '△',
    },
    opposition: {
      phrase: {
        ru: 'требует баланса между двумя сторонами:',
        en: 'requires balance between two sides:',
      },
      tone: '△',
    },
  };

  // Key natal planets for daily context (Sun, Moon, ASC are most personal)
  const KEY_NATAL_BODIES = ['sun', 'moon', 'ascendant', 'mercury', 'venus', 'mars'];

  const hasHouseData = (positions ?? []).some(
    (p) => KEY_NATAL_BODIES.includes(p.body_key) && p.house_number != null,
  );

  const natalKeyLines = (positions ?? [])
    .filter((p) => KEY_NATAL_BODIES.includes(p.body_key))
    .map((p) => {
      const body = getBodyLabel(p.body_key, locale);
      const sign = getSignLabel(p.sign_key, locale);
      const housePart = p.house_number
        ? locale === 'en'
          ? `, house ${p.house_number}`
          : `, дом ${p.house_number}`
        : '';
      return locale === 'en'
        ? `  - ${body} in ${sign}${housePart}`
        : `  - ${body} в ${sign}${housePart}`;
    })
    .join('\n');

  const transitLines = transitPositions
    .filter((p) => (FAST_PLANETS as readonly string[]).includes(p.bodyKey))
    .map((p) => {
      const body = getBodyLabel(p.bodyKey, locale);
      const sign = getSignLabel(p.signKey, locale);
      const energy = TRANSIT_BODY_ENERGY[p.bodyKey]?.[locale] ?? '';
      const retroPart = p.retrograde
        ? locale === 'en'
          ? ' — retrograde (internal processing, review)'
          : ' — обратное движение (внутренняя обработка, пересмотр)'
        : '';
      return locale === 'en'
        ? `  - ${body} in ${sign}${retroPart}${energy ? ` → ${energy}` : ''}`
        : `  - ${body} в ${sign}${retroPart}${energy ? ` → ${energy}` : ''}`;
    })
    .join('\n');

  // ── Compare today's aspects with yesterday's transits for narrative context ──
  const yesterdayTransits = (yesterdayForecast?.transit_snapshot_json ?? []) as Array<{
    bodyKey: string;
    signKey: string;
    degreeDecimal: number;
    retrograde: boolean;
  }>;
  const yesterdayAspectKeys = new Set<string>();
  if (yesterdayTransits.length > 0 && natalWithDegree.length > 0) {
    const yAspects = computeTransitAspects(natalWithDegree, yesterdayTransits);
    for (const a of yAspects) {
      yesterdayAspectKeys.add(`${a.transitBody}-${a.natalBody}-${a.aspectName}`);
    }
  }

  const aspectLines =
    transitAspects.length > 0
      ? transitAspects
          .map((a) => {
            const tBody = getBodyLabel(a.transitBody, locale);
            const nArea =
              NATAL_BODY_AREA[a.natalBody]?.[locale] ?? getBodyLabel(a.natalBody, locale);
            const quality = ASPECT_QUALITY[a.aspectName];
            const tone = quality?.tone ?? '•';
            const phrase = quality?.phrase[locale] ?? a.aspectName;
            const urgency =
              locale === 'en'
                ? a.applying
                  ? a.orb < 1
                    ? ' — exact, peaking today'
                    : ' — building'
                  : ' — past peak, fading'
                : a.applying
                  ? a.orb < 1
                    ? ' — уже точно, пик сегодня'
                    : ' — нарастает'
                  : ' — уже прошёл пик, ослабевает';
            const aspectKey = `${a.transitBody}-${a.natalBody}-${a.aspectName}`;
            const persistence =
              locale === 'en'
                ? yesterdayAspectKeys.has(aspectKey)
                  ? ' (continuing from yesterday)'
                  : ' (new aspect today)'
                : yesterdayAspectKeys.has(aspectKey)
                  ? ' (продолжается со вчера)'
                  : ' (новый аспект сегодня)';
            return `  ${tone} ${tBody} ${phrase} ${nArea}${urgency}${yesterdayAspectKeys.size > 0 ? persistence : ''}`;
          })
          .join('\n')
      : locale === 'en'
        ? '  — no tight personal aspects today (neutral day)'
        : '  — сегодня нет плотных личных аспектов (нейтральный день)';

  const skyAspectLines =
    skyAspects.length > 0
      ? skyAspects
          .map((a) => {
            const aLabel = getBodyLabel(a.bodyA, locale);
            const bLabel = getBodyLabel(a.bodyB, locale);
            const quality = ASPECT_QUALITY[a.aspectName];
            return `  - ${aLabel} ${quality?.phrase[locale] ?? a.aspectName} ${bLabel}`;
          })
          .join('\n')
      : '';

  const retrogradeTransits = transitPositions.filter((p) => p.retrograde);
  const retroLines =
    retrogradeTransits.length > 0
      ? retrogradeTransits
          .map((p) => {
            const body = getBodyLabel(p.bodyKey, locale);
            const area = TRANSIT_BODY_ENERGY[p.bodyKey]?.[locale];
            return locale === 'en'
              ? area
                ? `  - ${body} (retrograde — theme: ${area} needs review)`
                : `  - ${body} (retrograde)`
              : area
                ? `  - ${body} (в обратном движении — тема: ${area} требует пересмотра)`
                : `  - ${body} (в обратном движении)`;
          })
          .join('\n')
      : '';

  // ── Day-of-week context (natural variety signal) ───────────────────────
  const DAY_NAMES_RU = [
    'воскресенье',
    'понедельник',
    'вторник',
    'среда',
    'четверг',
    'пятница',
    'суббота',
  ];
  const DAY_NAMES_EN = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const transitDateObj = new Date(`${transitDate}T12:00:00Z`);
  const dayOfWeek =
    locale === 'en'
      ? DAY_NAMES_EN[transitDateObj.getUTCDay()]
      : DAY_NAMES_RU[transitDateObj.getUTCDay()];

  // ── Rotate interpretation angle by day-of-week ────────────────────────
  const INTERPRETATION_ANGLES_RU = [
    'Начни с общего эмоционального фона дня. Далее — как влияния проявятся в личной жизни и внутреннем мире. Заверши — чем завершить день.',
    'Начни с энергии и настроя на начало недели. Далее — как влияния отразятся на делах и общении. Заверши — как переключиться вечером.',
    'Начни с того, что сегодня требует действий. Далее — где стоит проявить инициативу, а где осторожность. Заверши — вечерний ритм.',
    'Начни с новых импульсов и идей, которые несёт день. Далее — общение и обмен мнениями. Заверши — творческий или спокойный вечер.',
    'Начни с того, что набирает силу к середине недели. Далее — где открываются возможности. Заверши — чему стоит уделить внимание вечером.',
    'Начни с настроения и ожиданий от дня. Далее — как влияния затронут отношения и общение. Заверши — планы на вечер.',
    'Начни с ощущения свободы и личного пространства. Далее — как использовать энергию дня для себя. Заверши — атмосфера вечера.',
  ];
  const INTERPRETATION_ANGLES_EN = [
    'Start with the overall emotional tone of the day. Then — how influences manifest in personal life and inner world. End with — how to wind down.',
    'Start with energy and mindset for the beginning of the week. Then — how influences affect work and communication. End with — how to switch off in the evening.',
    'Start with what requires action today. Then — where to take initiative and where to be cautious. End with — evening rhythm.',
    'Start with new impulses and ideas the day brings. Then — communication and exchange of opinions. End with — a creative or quiet evening.',
    'Start with what is gaining strength mid-week. Then — where opportunities are opening. End with — what deserves attention tonight.',
    'Start with the mood and expectations for the day. Then — how influences affect relationships and communication. End with — evening plans.',
    "Start with the feeling of freedom and personal space. Then — how to use the day's energy for yourself. End with — evening atmosphere.",
  ];
  const interpretationAngle =
    locale === 'en'
      ? INTERPRETATION_ANGLES_EN[transitDateObj.getUTCDay()]
      : INTERPRETATION_ANGLES_RU[transitDateObj.getUTCDay()];

  const slowTransitLines =
    slowTransitAspects.length > 0
      ? slowTransitAspects
          .map((a) => {
            const tBody = getBodyLabel(a.transitBody, locale);
            const nArea =
              NATAL_BODY_AREA[a.natalBody]?.[locale] ?? getBodyLabel(a.natalBody, locale);
            const quality = ASPECT_QUALITY[a.aspectName];
            const tone = quality?.tone ?? '•';
            const phrase = quality?.phrase[locale] ?? a.aspectName;
            return `  ${tone} ${tBody} ${phrase} ${nArea}`;
          })
          .join('\n')
      : '';

  const systemPrompt =
    locale === 'en'
      ? `The entire JSON response MUST be written in English.

You are writing a personalized daily horoscope based on real astrological data. Your task is to accurately translate the day's astrological influences into a specific, understandable forecast for an ordinary person.

ASTROLOGICAL LOGIC:
- Transit aspects to the natal chart are the main material. Aspects marked "building" and "peaking today" are the most important — they are maximally active right now.
- Aspects marked "fading" are already departing background influences — mention briefly.
- Long-term background influences (Jupiter, Saturn) set the theme for the current life period — mention as context, not as a daily event.
- The zodiac sign of the natal planet determines the STYLE of manifestation, and the house (if given) — the LIFE AREA.
- If there are no personal aspects — rely on the general backdrop (aspects between transiting planets) and the moon phase.
- The natal Moon is the key to the person's emotional response. Consider its sign.
- Retrograde planet: slowing down, review, inner work in that planet's domain.

TEXT STYLE:
- Write for a general audience — no astrological terms in the final text
- Forbidden in forecast text: "transit", "aspect", "orb", "square", "opposition", "sextile", "trine", "retrograde", "natal", "cusp"
- Forbidden: planet and zodiac sign names in the text — only life consequences
- Tone: warm, friendly, specific. Like a smart friend, not a fortune teller
- Variety: cover different areas (mood, work, communication, evening)

IMPORTANT — UNIQUENESS OF EACH DAY:
- The forecast must always accurately reflect the provided astrological data. This is the top priority.
- If the same influences are active for several days in a row — that's normal, the theme may repeat. But phrasing, imagery, metaphors and delivery style must be fresh each day.
- If an aspect is marked "continuing from yesterday" — show development: how the influence deepens, where it leads, what changed in its manifestation.
- If an aspect is marked "new aspect today" — emphasize its appearance as a fresh impulse of the day.
- Consider the day of the week as context for delivery (work rhythm vs. rest), but do not substitute it for astrological data.

Output ONLY a JSON object with exactly three keys: "interpretation", "keyTheme", "advice". Use these key names exactly as written. No other keys. No markdown blocks. All text in key values — exclusively in English.`
      : `Весь JSON-ответ ОБЯЗАТЕЛЬНО должен быть написан на русском языке.

Ты пишешь персональный ежедневный гороскоп, основанный на реальных астрологических данных. Твоя задача — точно перевести астрологические влияния дня в конкретный, понятный прогноз для обычного человека.

АСТРОЛОГИЧЕСКАЯ ЛОГИКА:
- Транзитные аспекты к натальной карте — главный материал. Аспекты с пометкой "нарастает" и "пик сегодня" самые важные — они максимально активны именно сейчас.
- Аспекты с пометкой "ослабевает" — уже уходящие фоновые влияния, упоминай кратко.
- Долгосрочные фоновые влияния (Юпитер, Сатурн) задают тему текущего периода жизни — упоминай их как контекст, а не как событие дня.
- Знак зодиака натальной планеты определяет СТИЛЬ проявления, а дом (если указан) — СФЕРУ ЖИЗНИ.
- Если личных аспектов нет — опирайся на общий фон (аспекты транзитных планет между собой) и фазу луны.
- Луна в натальной карте — ключ к эмоциональному отклику человека. Учитывай её знак.
- Ретроградная планета: замедление, пересмотр, внутренняя работа в сфере этой планеты.

СТИЛЬ ТЕКСТА:
- Пиши для широкой аудитории — без астрологических терминов в готовом тексте
- Запрещены в тексте прогноза: "транзит", "аспект", "орб", "квадратура", "оппозиция", "секстиль", "тригон", "ретроградный", "натальный", "куспид"
- Запрещены названия планет и знаков зодиака в тексте — только жизненные следствия
- ЗАПРЕЩЕНО использование иностранных слов, английских вставок и транслитерации — только русский язык
- Тон: тёплый, дружелюбный, конкретный. Как умный друг, а не предсказатель судьбы
- Разнообразие: охвати разные сферы (настроение, работа, общение, вечер)

ВАЖНО — УНИКАЛЬНОСТЬ КАЖДОГО ДНЯ:
- Прогноз всегда должен точно отражать предоставленные астрологические данные. Это главный приоритет.
- Если те же влияния активны несколько дней подряд — это нормально, тема может повторяться. Но формулировки, образы, метафоры и стиль подачи должны быть свежими каждый день.
- Если аспект помечен «продолжается со вчера» — покажи развитие: как влияние углубляется, к чему ведёт, что изменилось в его проявлении.
- Если аспект помечен «новый аспект сегодня» — подчеркни его появление как свежий импульс дня.
- Учитывай день недели как контекст для подачи (рабочий ритм vs. отдых), но не подменяй им астрологические данные.

Выведи ответ ТОЛЬКО как JSON-объект с ровно тремя ключами: "interpretation", "keyTheme", "advice". Используй эти имена ключей точно как написано (латиницей). Никаких других ключей. Никаких markdown-блоков. Весь текст в значениях ключей — исключительно на русском языке.`;

  const userPrompt =
    locale === 'en'
      ? `Date: ${transitDate} (${dayOfWeek})
Name: ${chart.person_name}${moonPhase ? `\nMoon phase: ${moonPhase}` : ''}${yesterdayKeyTheme ? `\n\nYesterday's key theme: "${yesterdayKeyTheme}". If today's astrological data points to the same theme — reveal it from a different angle, in different words. If the data has changed — follow the new data.` : ''}

Key planets in ${chart.person_name}'s natal chart (define personal context):
${natalKeyLines || '  — no data'}

Transiting planets today (fast planets — main triggers of the day):
${transitLines || '  — no data'}${retroLines ? `\n\nPlanets in retrograde:\n${retroLines}` : ''}${skyAspectLines ? `\n\nGeneral astrological backdrop of the day (aspects between transiting planets):\n${skyAspectLines}` : ''}

Personal transit aspects today for ${chart.person_name}:
(✦ = harmonious, △ = tense, • = neutral/amplifying)
${aspectLines}${slowTransitLines ? `\n\nLong-term background influences (Jupiter, Saturn — current period theme):\n${slowTransitLines}` : ''}

Write a personalized horoscope for today (${dayOfWeek}) for ${chart.person_name}. Rely primarily on active transit aspects (especially building ones). When interpreting, consider the sign of the natal planet${hasHouseData ? ' and house' : ''} being transited.${!hasHouseData ? ' House data is unavailable (birth time unknown) — rely only on signs.' : ''} Respond with JSON:
{
  "interpretation": "3-4 paragraphs, separated by double line breaks. ${interpretationAngle} Write vividly and specifically, based on the provided astrological data.",
  "keyTheme": "One key theme of the day, 3-5 words, in conversational language (e.g., 'A day for bold decisions', 'Time for self-care', 'Focus on loved ones')",
  "advice": "One practical tip for the day, 1-2 sentences. A specific action, not general wisdom."
}
All output — only in English. No foreign words.`
      : `Дата: ${transitDate} (${dayOfWeek})
Имя: ${chart.person_name}${moonPhase ? `\nФаза луны: ${moonPhase}` : ''}${yesterdayKeyTheme ? `\n\nВчерашняя ключевая тема: «${yesterdayKeyTheme}». Если сегодня астрологические данные указывают на ту же тему — раскрой её с другого ракурса, другими словами. Если данные изменились — следуй новым данным.` : ''}

Ключевые планеты в натальной карте ${chart.person_name} (определяют личный контекст):
${natalKeyLines || '  — нет данных'}

Транзитные планеты сегодня (быстрые планеты — главные триггеры дня):
${transitLines || '  — нет данных'}${retroLines ? `\n\nПланеты в ретроградном движении:\n${retroLines}` : ''}${skyAspectLines ? `\n\nОбщий астрологический фон дня (аспекты транзитных планет между собой):\n${skyAspectLines}` : ''}

Персональные транзитные аспекты сегодня для ${chart.person_name}:
(✦ = гармоничный, △ = напряжённый, • = нейтральный/усиливающий)
${aspectLines}${slowTransitLines ? `\n\nДолгосрочные фоновые влияния (Юпитер, Сатурн — тема текущего периода):\n${slowTransitLines}` : ''}

Напиши персональный гороскоп на сегодня (${dayOfWeek}) для ${chart.person_name}. Опирайся прежде всего на активные транзитные аспекты (особенно нарастающие). При интерпретации учитывай знак натальной планеты${hasHouseData ? ' и дом' : ''}, к которой идёт транзит.${!hasHouseData ? ' Данные о домах недоступны (время рождения неизвестно) — опирайся только на знаки.' : ''} Ответь JSON:
{
  "interpretation": "3-4 абзаца, разделённых двойным переносом строки. ${interpretationAngle} Пиши живо и конкретно, опираясь на предоставленные астрологические данные.",
  "keyTheme": "Одна ключевая тема дня, 3-5 слов, разговорным языком (например: 'День для смелых решений', 'Время заботы о себе', 'Фокус на близких')",
  "advice": "Один практический совет на день, 1-2 предложения. Конкретное действие, а не общая мудрость."
}
Весь ответ — только на русском языке. Никаких иностранных слов.`;

  const modelName = env.LLM_PROVIDER === 'qwen' ? env.QWEN_MODEL : 'mock';
  const startMs = Date.now();

  let result: DailyForecastContent;

  try {
    const generation = await generateStructuredOutputWithUsage<DailyForecastContent>({
      systemPrompt,
      userPrompt,
      schema: dailyForecastSchema,
      maxTokens: 2000,
      temperature: 0.6,
      mockResponse:
        locale === 'en'
          ? {
              interpretation:
                "Today promises to be productive — your mind is fresh and thoughts are structured. If you have tasks that require focus or an important conversation, the first half of the day is ideal.\n\nIn the afternoon, you may want to switch to something lighter. A good time to take care of details, write to someone you've been meaning to, or simply organize things.\n\nIn the evening, spend time on yourself — read, take a walk, or be with those who recharge you. Don't overload: tomorrow will be no less eventful.",
              keyTheme: 'A day for clear decisions',
              advice:
                "Tackle that thing you've been putting off first thing in the morning — today you have both the energy and clarity to finish it.",
            }
          : {
              interpretation:
                'Сегодня день обещает быть продуктивным — голова свежая, мысли структурированные. Если есть задачи, которые требуют концентрации или важного разговора, первая половина дня для этого идеальна.\n\nВо второй половине дня может захотеться переключиться на что-то более лёгкое. Хорошее время позаботиться о деталях, написать кому-то, кому давно собирались, или просто навести порядок в делах.\n\nВечером стоит уделить время себе — почитать, прогуляться или провести время с теми, кто заряжает. Не перегружайте себя: завтра будет не менее насыщенным.',
              keyTheme: 'День для чётких решений',
              advice:
                'Возьмитесь с утра за дело, которое давно откладывали — сегодня хватит и сил, и ясности, чтобы его завершить.',
            },
    });
    result = generation.content;
    // Inject deterministic moon phase (overrides any LLM hallucination)
    if (moonPhase) result.moonPhase = moonPhase;

    const generationLogRow: TablesInsert<'generation_logs'> = {
      user_id: userId,
      entity_type: 'forecast',
      entity_id: forecastId,
      operation_key: 'forecast.pipeline.daily',
      provider: env.LLM_PROVIDER,
      model: modelName,
      request_payload_json: { systemPrompt, userPrompt } as Json,
      response_payload_json: result as Json,
      latency_ms: Date.now() - startMs,
      usage_tokens: generation.usageTokens,
      error_message: null,
    };

    await db
      .from('generation_logs')
      .insert(generationLogRow)
      .then(({ error }) => {
        if (error) logger.warn({ error, forecastId }, 'forecast: failed to persist generation log');
      });
  } catch (error) {
    await db
      .from('generation_logs')
      .insert({
        user_id: userId,
        entity_type: 'forecast',
        entity_id: forecastId,
        operation_key: 'forecast.pipeline.daily',
        provider: env.LLM_PROVIDER,
        model: modelName,
        request_payload_json: { systemPrompt, userPrompt } as Json,
        response_payload_json: { status: 'error' } as Json,
        latency_ms: Date.now() - startMs,
        usage_tokens: null,
        error_message: error instanceof Error ? error.message : 'Daily forecast generation failed',
      })
      .then(({ error: insertError }) => {
        if (insertError)
          logger.warn(
            { error: insertError, forecastId },
            'forecast: failed to persist error generation log',
          );
      });

    // Mark the forecast row so the status poller detects the failure
    await db
      .from('forecasts')
      .update({
        rendered_content_json: { status: 'error' } as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', forecastId)
      .then(({ error: markError }) => {
        if (markError)
          logger.warn({ error: markError, forecastId }, 'forecast: failed to mark as error');
      });

    throw error;
  }

  const { error: updateError } = await db
    .from('forecasts')
    .update({
      rendered_content_json: result as Json,
      transit_snapshot_json: transitPositions as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', forecastId);

  if (updateError) {
    logger.error({ updateError, forecastId }, 'Failed to save forecast content to DB');
    // Best-effort: mark as error so the status poller unblocks the UI
    await db
      .from('forecasts')
      .update({
        rendered_content_json: { status: 'error' } as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', forecastId)
      .then(({ error: markErr }) => {
        if (markErr)
          logger.warn({ error: markErr, forecastId }, 'forecast: failed to mark save-error');
      });
    throw new Error(`Failed to save forecast: ${updateError.message}`);
  }

  logger.info(
    { forecastId, modelName, latencyMs: Date.now() - startMs },
    'Daily forecast generated',
  );
  return result;
}

/** Clears existing content for a forecast so it can be re-generated.
 *  Returns instantly — the client should then trigger the generate flow. */
export async function clearDailyForecastContent(forecastId: string, userId: string) {
  const { data: forecast } = await db
    .from('forecasts')
    .select('id, user_id')
    .eq('id', forecastId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!forecast) throw new NotFoundError({ message: 'Forecast not found' });

  // Column is NOT NULL — use empty object instead of null.
  // The isReady check (typeof content.interpretation === 'string') will correctly fail for {}.
  await db
    .from('forecasts')
    .update({
      rendered_content_json: {} as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', forecastId);
}

export async function clearDailyForecastsForChart(chartId: string, userId: string) {
  const { error } = await db
    .from('forecasts')
    .update({
      rendered_content_json: {} as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('chart_id', chartId)
    .eq('forecast_type', 'daily');

  if (error) {
    throw new Error(`Failed to clear daily forecasts: ${error.message}`);
  }
}
