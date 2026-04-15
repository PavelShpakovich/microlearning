import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateStructuredOutputWithUsage } from '@/lib/llm/structured-generation';
import { calculateNatalChart } from '@/lib/astrology/engine';
import { NotFoundError } from '@/lib/errors';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { Json, TablesInsert } from '@/lib/supabase/types';

const db = supabaseAdmin;

export const dailyForecastSchema = z.object({
  interpretation: z.string(),
  keyTheme: z.string(),
  advice: z.string(),
  moonPhase: z.string().optional(),
});

export type DailyForecastContent = z.infer<typeof dailyForecastSchema>;

/** Returns today's daily forecast for the given chart, creating a pending row if missing.
 *  If multiple rows exist (race condition), prefers the one that already has generated content. */
export async function getOrCreateDailyForecast(userId: string, chartId: string) {
  const today = new Date().toISOString().slice(0, 10);

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
    .maybeSingle();

  if (!chart) throw new NotFoundError({ message: 'Chart not found' });

  // Fetch natal positions
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
        .select('body_key, sign_key, house_number')
        .eq('chart_snapshot_id', snapshot.id)
    : { data: [] };

  // Compute today's transits
  const today = new Date();
  let transitPositions: Array<{ bodyKey: string; signKey: string; degreeDecimal: number }> = [];
  try {
    const transitResult = await calculateNatalChart({
      personName: 'transit',
      birthDate: today.toISOString().slice(0, 10),
      birthTime: '12:00',
      birthTimeKnown: true,
      city: chart.city ?? 'London',
      country: chart.country ?? 'GB',
      latitude: chart.latitude ?? 51.5,
      longitude: chart.longitude ?? 0,
      houseSystem: 'equal',
      label: 'transit',
      subjectType: 'other',
    });
    transitPositions = transitResult.positions.map((p) => ({
      bodyKey: p.bodyKey,
      signKey: p.signKey,
      degreeDecimal: p.degreeDecimal,
    }));
  } catch (err) {
    logger.error({ err }, 'Failed to compute transits for daily forecast');
  }

  const natalLines = (positions ?? [])
    .slice(0, 10)
    .map(
      (p) => `  - ${p.body_key} в ${p.sign_key}${p.house_number ? `, дом ${p.house_number}` : ''}`,
    )
    .join('\n');

  const transitLines = transitPositions
    .slice(0, 8)
    .map((p) => `  - ${p.bodyKey} в ${p.signKey} (${p.degreeDecimal.toFixed(1)}°)`)
    .join('\n');

  const systemPrompt = `КРИТИЧЕСКИ ВАЖНО: Весь JSON-ответ ОБЯЗАТЕЛЬНО должен быть написан на русском языке.

Ты профессиональный астролог, создающий персонализированные ежедневные гороскопы на русском языке.
Пиши конкретно и лично, опираясь на реальные транзиты к натальной карте.
Упоминай конкретные транзиты (например: "Транзитный Юпитер в соединении с натальным Солнцем").
Выведи ответ ТОЛЬКО как JSON без markdown-блоков.`;

  const userPrompt = `Дата: ${today.toISOString().slice(0, 10)}
Имя: ${chart.person_name}

Натальная карта (ключевые позиции):
${natalLines || '  — нет данных'}

Текущие транзиты:
${transitLines || '  — нет данных'}

Создай персональный гороскоп на сегодня. Ответь JSON:
{
  "interpretation": "2-3 абзаца персонального астрологического прогноза (минимум 180 слов), разделённых двойным переносом строки",
  "keyTheme": "Одна ключевая тема дня, 2-4 слова",
  "advice": "Практический совет на сегодня, 1-2 предложения",
  "moonPhase": "Фаза луны и её краткое влияние (опционально)"
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
          'Сегодня звёзды благоприятствуют новым начинаниям. Транзитное Солнце освещает вашу натальную карту, принося ясность и уверенность.\n\nЛуна усиливает интуицию — доверяйте своим ощущениям в принятии решений. Это хороший момент для завершения старых дел и планирования будущего.\n\nОбратите внимание на свои отношения с близкими. Искреннее общение сегодня принесёт положительные результаты.',
        keyTheme: 'Ясность и движение',
        advice: 'Используйте сегодняшнюю энергию для принятия важных решений. Действуйте уверенно.',
        moonPhase: 'Растущая луна — время для роста и новых начинаний',
      },
    });
    result = generation.content;

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
