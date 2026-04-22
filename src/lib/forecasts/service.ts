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
function computeMoonPhaseRu(sunLon: number, moonLon: number): string {
  const angle = (moonLon - sunLon + 360) % 360;
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
  { name: 'соединение', angle: 0, orb: 3 },
  { name: 'секстиль', angle: 60, orb: 2 },
  { name: 'квадрат', angle: 90, orb: 3 },
  { name: 'тригон', angle: 120, orb: 3 },
  { name: 'оппозиция', angle: 180, orb: 3 },
] as const;

// Fast-moving planets produce genuine day-to-day transit events.
// Slow planets (Jupiter+) move < 0.1°/day — their aspects last weeks/months,
// so including them as "today's personal influence" is astrologically misleading.
const FAST_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars'] as const;

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
  interpretation: z.string().min(100, 'Interpretation must be at least 100 characters'),
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
      ? computeMoonPhaseRu(transitSun.degreeDecimal, transitMoon.degreeDecimal)
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

  // Transit-to-transit aspects (general day backdrop)
  const skyAspects = computeTransitToTransitAspects(transitPositions);

  // ── Prompt data (human-readable, no raw degrees/orbs) ────────────────────

  // Life areas affected by each natal planet — used in aspect descriptions
  const NATAL_BODY_AREA_RU: Record<string, string> = {
    sun: 'самовыражение и жизненную силу',
    moon: 'эмоции и интуицию',
    mercury: 'мышление и общение',
    venus: 'отношения и удовольствия',
    mars: 'энергию и инициативу',
    jupiter: 'рост и удачу',
    saturn: 'дисциплину и карьеру',
    uranus: 'стремление к переменам',
    neptune: 'воображение и чувствительность',
    pluto: 'глубинные трансформации',
    ascendant: 'личность и первое впечатление',
    midheaven: 'профессиональную реализацию',
  };

  // What a transiting planet activates
  const TRANSIT_BODY_ENERGY_RU: Record<string, string> = {
    sun: 'жизненная энергия и фокус',
    moon: 'настроение и эмоциональный фон',
    mercury: 'мышление, общение и планирование',
    venus: 'отношения, красота и удовольствия',
    mars: 'активность, смелость и желания',
  };

  const ASPECT_QUALITY: Record<string, { phrase: string; tone: '✦' | '△' | '•' }> = {
    тригон: { phrase: 'поддерживает', tone: '✦' },
    секстиль: { phrase: 'открывает возможности для', tone: '✦' },
    соединение: { phrase: 'усиливает', tone: '•' },
    квадрат: { phrase: 'создаёт напряжение вокруг', tone: '△' },
    оппозиция: { phrase: 'требует баланса между двумя сторонами:', tone: '△' },
  };

  // Key natal planets for daily context (Sun, Moon, ASC are most personal)
  const KEY_NATAL_BODIES = ['sun', 'moon', 'ascendant', 'mercury', 'venus', 'mars'];

  const hasHouseData = (positions ?? []).some(
    (p) => KEY_NATAL_BODIES.includes(p.body_key) && p.house_number != null,
  );

  const natalKeyLines = (positions ?? [])
    .filter((p) => KEY_NATAL_BODIES.includes(p.body_key))
    .map((p) => {
      const bodyRu = BODY_RU[p.body_key] ?? p.body_key;
      const signRu = SIGN_RU[p.sign_key] ?? p.sign_key;
      const housePart = p.house_number ? `, дом ${p.house_number}` : '';
      return `  - ${bodyRu} в ${signRu}${housePart}`;
    })
    .join('\n');

  const transitLines = transitPositions
    .filter((p) => (FAST_PLANETS as readonly string[]).includes(p.bodyKey))
    .map((p) => {
      const bodyRu = BODY_RU[p.bodyKey] ?? p.bodyKey;
      const signRu = SIGN_RU[p.signKey] ?? p.signKey;
      const energy = TRANSIT_BODY_ENERGY_RU[p.bodyKey] ?? '';
      const retroPart = p.retrograde
        ? ' — обратное движение (внутренняя обработка, пересмотр)'
        : '';
      return `  - ${bodyRu} в ${signRu}${retroPart}${energy ? ` → ${energy}` : ''}`;
    })
    .join('\n');

  const aspectLines =
    transitAspects.length > 0
      ? transitAspects
          .map((a) => {
            const tBodyRu = BODY_RU[a.transitBody] ?? a.transitBody;
            const nArea = NATAL_BODY_AREA_RU[a.natalBody] ?? BODY_RU[a.natalBody] ?? a.natalBody;
            const quality = ASPECT_QUALITY[a.aspectName];
            const tone = quality?.tone ?? '•';
            const phrase = quality?.phrase ?? a.aspectName;
            const urgency = a.applying
              ? a.orb < 1
                ? ' — уже точно, пик сегодня'
                : ' — нарастает'
              : ' — уже прошёл пик, ослабевает';
            return `  ${tone} ${tBodyRu} ${phrase} ${nArea}${urgency}`;
          })
          .join('\n')
      : '  — сегодня нет плотных личных аспектов (нейтральный день)';

  const skyAspectLines =
    skyAspects.length > 0
      ? skyAspects
          .map((a) => {
            const aRu = BODY_RU[a.bodyA] ?? a.bodyA;
            const bRu = BODY_RU[a.bodyB] ?? a.bodyB;
            const quality = ASPECT_QUALITY[a.aspectName];
            return `  - ${aRu} ${quality?.phrase ?? a.aspectName} ${bRu}`;
          })
          .join('\n')
      : '';

  const retrogradeTransits = transitPositions.filter((p) => p.retrograde);
  const retroLines =
    retrogradeTransits.length > 0
      ? retrogradeTransits
          .map((p) => {
            const bodyRu = BODY_RU[p.bodyKey] ?? p.bodyKey;
            const area = TRANSIT_BODY_ENERGY_RU[p.bodyKey];
            return area
              ? `  - ${bodyRu} (в обратном движении — тема: ${area} требует пересмотра)`
              : `  - ${bodyRu} (в обратном движении)`;
          })
          .join('\n')
      : '';

  const systemPrompt = `Весь JSON-ответ ОБЯЗАТЕЛЬНО должен быть написан на русском языке.

Ты пишешь персональный ежедневный гороскоп, основанный на реальных астрологических данных. Твоя задача — точно перевести астрологические влияния дня в конкретный, понятный прогноз для обычного человека.

АСТРОЛОГИЧЕСКАЯ ЛОГИКА:
- Транзитные аспекты к натальной карте — главный материал. Аспекты с пометкой "нарастает" и "пик сегодня" самые важные — они максимально активны именно сейчас.
- Аспекты с пометкой "ослабевает" — уже уходящие фоновые влияния, упоминай кратко.
- Знак зодиака натальной планеты определяет СТИЛЬ проявления, а дом (если указан) — СФЕРУ ЖИЗНИ.
- Если личных аспектов нет — опирайся на общий фон (аспекты транзитных планет между собой) и фазу луны.
- Луна в натальной карте — ключ к эмоциональному отклику человека. Учитывай её знак.
- Ретроградная планета: замедление, пересмотр, внутренняя работа в сфере этой планеты.

СТИЛЬ ТЕКСТА:
- Пиши для широкой аудитории — без астрологических терминов в готовом тексте
- Запрещены в тексте прогноза: "транзит", "аспект", "орб", "квадратура", "оппозиция", "секстиль", "тригон", "ретроградный", "натальный", "куспид"
- Запрещены названия планет и знаков зодиака в тексте — только жизненные следствия
- Тон: тёплый, дружелюбный, конкретный. Как умный друг, а не предсказатель судьбы
- Разнообразие: охвати разные сферы (настроение, работа, общение, вечер)

Выведи ответ ТОЛЬКО как JSON-объект с ровно тремя ключами: "interpretation", "keyTheme", "advice". Используй эти имена ключей точно как написано (латиницей). Никаких других ключей. Никаких markdown-блоков.`;

  const userPrompt = `Дата: ${transitDate}
Имя: ${chart.person_name}${moonPhase ? `\nФаза луны: ${moonPhase}` : ''}

Ключевые планеты в натальной карте ${chart.person_name} (определяют личный контекст):
${natalKeyLines || '  — нет данных'}

Транзитные планеты сегодня (быстрые планеты — главные триггеры дня):
${transitLines || '  — нет данных'}${retroLines ? `\n\nПланеты в ретроградном движении:\n${retroLines}` : ''}${skyAspectLines ? `\n\nОбщий астрологический фон дня (аспекты транзитных планет между собой):\n${skyAspectLines}` : ''}

Персональные транзитные аспекты сегодня для ${chart.person_name}:
(✦ = гармоничный, △ = напряжённый, • = нейтральный/усиливающий)
${aspectLines}

Напиши персональный гороскоп на сегодня для ${chart.person_name}. Опирайся прежде всего на активные транзитные аспекты (особенно нарастающие). При интерпретации учитывай знак натальной планеты${hasHouseData ? ' и дом' : ''}, к которой идёт транзит.${!hasHouseData ? ' Данные о домах недоступны (время рождения неизвестно) — опирайся только на знаки.' : ''} Ответь JSON:
{
  "interpretation": "3-4 абзаца, разделённых двойным переносом строки. Первый абзац — общее настроение и энергия дня. Далее — конкретные сферы жизни (отношения, работа, здоровье или творчество). Последний — вечер и завершение дня. Пиши живо и конкретно.",
  "keyTheme": "Одна ключевая тема дня, 3-5 слов, разговорным языком (например: 'День для смелых решений', 'Время заботы о себе', 'Фокус на близких')",
  "advice": "Один практический совет на день, 1-2 предложения. Конкретное действие, а не общая мудрость."
}`;

  const modelName = env.LLM_PROVIDER === 'qwen' ? env.QWEN_MODEL : 'mock';
  const startMs = Date.now();

  let result: DailyForecastContent;

  try {
    const generation = await generateStructuredOutputWithUsage<DailyForecastContent>({
      systemPrompt,
      userPrompt,
      schema: dailyForecastSchema,
      maxTokens: 2000,
      mockResponse: {
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
