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
const ASPECTS = [
  { name: 'соединение', angle: 0, orb: 8 },
  { name: 'секстиль', angle: 60, orb: 6 },
  { name: 'квадрат', angle: 90, orb: 7 },
  { name: 'тригон', angle: 120, orb: 7 },
  { name: 'оппозиция', angle: 180, orb: 8 },
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
  const transitPlanets = transitPositions.filter((p) => PLANET_ORDER.includes(p.bodyKey));

  for (const transit of transitPlanets) {
    for (const natal of natalPlanets) {
      const raw = Math.abs(signedAngularDiff(transit.degreeDecimal, natal.degree_decimal));
      const diff = raw > 180 ? 360 - raw : raw;
      for (const aspect of ASPECTS) {
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= aspect.orb) {
          // Applying = transit is closing in on exact aspect.
          // For direct planets, if the transit longitude is before the exact point, it's applying.
          // Retrograde reverses the direction.
          const exactTarget = (natal.degree_decimal + aspect.angle) % 360;
          const gap = signedAngularDiff(transit.degreeDecimal, exactTarget);
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

  return aspects.sort((a, b) => a.orb - b.orb).slice(0, 10);
}

/** Compute notable aspects between transiting planets themselves (general day tone). */
function computeTransitToTransitAspects(
  transitPositions: Array<{ bodyKey: string; degreeDecimal: number }>,
): Array<{ bodyA: string; bodyB: string; aspectName: string; orb: number }> {
  const results: Array<{ bodyA: string; bodyB: string; aspectName: string; orb: number }> = [];
  // Use tighter orbs for transit-to-transit (general backdrop, not personalized)
  const tightOrbs = [6, 4, 5, 5, 6]; // conjunction, sextile, square, trine, opposition

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
  interpretation: z.string(),
  keyTheme: z.string(),
  advice: z.string(),
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

  // Clean up expired daily forecasts (any day before today)
  const { error: deleteError, count: deletedCount } = await db
    .from('forecasts')
    .delete({ count: 'exact' })
    .eq('user_id', userId)
    .eq('forecast_type', 'daily')
    .lt('target_start_date', today);

  if (deleteError) {
    logger.warn({ error: deleteError, userId }, 'forecast: failed to clean up expired forecasts');
  } else if (deletedCount && deletedCount > 0) {
    logger.info({ userId, deletedCount }, 'forecast: cleaned up expired daily forecasts');
  }

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
export async function generateDailyForecast(forecastId: string, userId: string) {
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

  // Compute today's transits (geocentric — location does not affect planetary longitudes)
  const today = new Date();
  let transitPositions: Array<{
    bodyKey: string;
    signKey: string;
    degreeDecimal: number;
    retrograde: boolean;
  }> = [];
  try {
    const transitResult = await calculateNatalChart({
      personName: 'transit',
      birthDate: today.toISOString().slice(0, 10),
      birthTime: '12:00',
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

  // Transit-to-natal aspects
  const natalWithDegree = (positions ?? []).filter((p) => p.degree_decimal != null);
  const transitAspects = computeTransitAspects(natalWithDegree, transitPositions);

  // Transit-to-transit aspects (general day backdrop)
  const skyAspects = computeTransitToTransitAspects(transitPositions);

  // Retrograde transits highlight
  const retrogradeTransits = transitPositions.filter((p) => p.retrograde);

  // ── Prompt data ────────────────────────────────────────────────────────────
  const natalLines = (positions ?? [])
    .filter((p) => PLANET_ORDER.includes(p.body_key))
    .map((p) => {
      const bodyRu = BODY_RU[p.body_key] ?? p.body_key;
      const signRu = SIGN_RU[p.sign_key] ?? p.sign_key;
      const housePart = p.house_number ? `, дом ${p.house_number}` : '';
      const retroPart = p.retrograde ? ' (ретро)' : '';
      return `  - ${bodyRu} в ${signRu}${housePart}${retroPart}`;
    })
    .join('\n');

  const transitLines = transitPositions
    .map((p) => {
      const bodyRu = BODY_RU[p.bodyKey] ?? p.bodyKey;
      const signRu = SIGN_RU[p.signKey] ?? p.signKey;
      const retroPart = p.retrograde ? ' ℞' : '';
      return `  - ${bodyRu}: ${signRu} (${p.degreeDecimal.toFixed(1)}°)${retroPart}`;
    })
    .join('\n');

  const aspectLines =
    transitAspects.length > 0
      ? transitAspects
          .map((a) => {
            const tRu = BODY_RU[a.transitBody] ?? a.transitBody;
            const nRu = BODY_RU[a.natalBody] ?? a.natalBody;
            const phase = a.applying ? 'сближение' : 'расхождение';
            return `  - ${tRu} ${a.aspectName} натальный ${nRu} (орб ${a.orb.toFixed(1)}°, ${phase})`;
          })
          .join('\n')
      : '  — активных аспектов нет';

  const skyAspectLines =
    skyAspects.length > 0
      ? skyAspects
          .map((a) => {
            const aRu = BODY_RU[a.bodyA] ?? a.bodyA;
            const bRu = BODY_RU[a.bodyB] ?? a.bodyB;
            return `  - ${aRu} ${a.aspectName} ${bRu} (орб ${a.orb.toFixed(1)}°)`;
          })
          .join('\n')
      : '';

  const retroLines =
    retrogradeTransits.length > 0
      ? retrogradeTransits.map((p) => `  - ${BODY_RU[p.bodyKey] ?? p.bodyKey}`).join('\n')
      : '';

  const systemPrompt = `КРИТИЧЕСКИ ВАЖНО: Весь JSON-ответ ОБЯЗАТЕЛЬНО должен быть написан на русском языке.

Ты — опытный астролог, который пишет персональный ежедневный гороскоп. Тебе предоставлены ФАКТИЧЕСКИЕ астрологические данные, вычисленные по эфемеридам. Используй их точно — не изменяй и не противоречь указанным положениям планет.

ПРАВИЛА ИНТЕРПРЕТАЦИИ:
1. ПРИОРИТЕТ АСПЕКТОВ: Сближающиеся аспекты с малым орбом (< 2°) — самые сильные влияния дня. Расходящиеся аспекты — фоновые.
2. РЕТРОГРАДНЫЕ ПЛАНЕТЫ: Ретроградный Меркурий — пересмотр, коммуникационные сбои. Ретроградная Венера — переоценка отношений. Ретроградный Марс — внутренняя переработка энергии. Если ретроградов нет — не упоминай ретроградность.
3. ЛУННАЯ ФАЗА: Учитывай фазу луны как эмоциональный фон дня.
4. ОБЩИЙ ФОН: Аспекты между транзитными планетами задают тон дня для всех людей. Аспекты к натальной карте — персональные.

Пиши тепло и по-человечески. Избегай сложных астрологических терминов в тексте (не используй слова "транзит", "оппозиция", "квадратура", "орб", "аспект", "куспид", "ретроградный"). Вместо этого выражай смысл простым языком.
Прогноз должен быть конкретным, жизненным и полезным. Минимум общих фраз.
Выведи ответ ТОЛЬКО как JSON без markdown-блоков.`;

  const userPrompt = `Дата: ${today.toISOString().slice(0, 10)}
Имя: ${chart.person_name}${moonPhase ? `\nЛунная фаза: ${moonPhase}` : ''}

Положение планет на небе СЕГОДНЯ (фактические данные по эфемеридам, ℞ = ретроградная):
${transitLines || '  — нет данных'}${retroLines ? `\n\nРетроградные планеты сегодня:\n${retroLines}` : ''}${skyAspectLines ? `\n\nОбщий астрологический фон дня (аспекты между транзитными планетами):\n${skyAspectLines}` : ''}

Персональные влияния (аспекты транзитных планет к натальной карте ${chart.person_name}):
${aspectLines}

Натальная карта ${chart.person_name}:
${natalLines || '  — нет данных'}

Напиши персональный гороскоп на сегодня. Опирайся прежде всего на персональные аспекты (особенно сближающиеся с малым орбом). Учти общий фон и фазу луны. Ответь JSON:
{
  "interpretation": "2-3 абзаца (минимум 150 слов), разделённых двойным переносом строки. Что может происходить сегодня, на что обратить внимание, как использовать день.",
  "keyTheme": "Одна ключевая тема дня, 2-4 слова (например: 'Время для общения', 'Фокус на себе', 'День решений')",
  "advice": "Один практический совет, 1-2 предложения"
}`;

  const modelName = env.LLM_PROVIDER === 'qwen' ? env.QWEN_MODEL : 'mock';
  const startMs = Date.now();

  let result: DailyForecastContent;

  try {
    const generation = await generateStructuredOutputWithUsage({
      systemPrompt,
      userPrompt,
      schema: dailyForecastSchema,
      mockResponse: {
        interpretation:
          'Сегодня ощущается прилив ясности и желание двигаться вперёд. Если давно откладывали какое-то дело — сегодня хороший момент взяться за него: энергия благоприятствует активным шагам.\n\nОбратите внимание на общение с близкими — сегодня слова находят отклик особенно легко. Искренний разговор может прояснить то, что давно оставалось невысказанным.\n\nВечером стоит замедлиться и уделить время себе: небольшой отдых или прогулка помогут переработать впечатления дня и восстановить силы.',
        keyTheme: 'Ясность и движение',
        advice: 'Начните день с самого важного дела — сейчас для этого есть и силы, и настрой.',
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
