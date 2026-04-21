import { NotFoundError } from '@/lib/errors';
import { env } from '@/lib/env';
import { generateStructuredOutputWithUsage } from '@/lib/llm/structured-generation';
import { logger } from '@/lib/logger';
import { TONE_STYLES, normalizeHouseSystem } from '@/lib/astrology/constants';
import type { ToneStyle, AstrologyLocale } from '@/lib/astrology/types';
import { calculateNatalChart } from '@/lib/astrology/engine';
import { readingPlanSchema } from '@/lib/readings/plan-schema';
import {
  structuredReadingSchema,
  type StructuredReadingOutput,
} from '@/lib/readings/report-schema';
import {
  buildReadingPlanPrompts,
  buildReadingReviewPrompts,
  buildReadingWriterPrompts,
  stableReadingTitle,
  type ReadingPromptInput,
} from '@/lib/readings/prompt';
import type { ReadingCreateInput } from '@/lib/readings/reading-request-schema';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Json, TablesInsert } from '@/lib/supabase/types';
import type { ZodType } from 'zod';

const db = supabaseAdmin;

type JsonObject = { [key: string]: Json | undefined };

interface ChartPositionSource {
  body_key: string;
  sign_key: string;
  house_number: number | null;
  degree_decimal: number;
  retrograde: boolean;
}

interface ChartAspectSource {
  body_a: string;
  body_b: string;
  aspect_key: string;
  orb_decimal: number;
  applying: boolean | null;
}

interface GenerationLogDraft {
  operationKey: string;
  requestPayload: JsonObject;
  responsePayload: Json;
  latencyMs: number;
  usageTokens: number | null;
  errorMessage: string | null;
}

function activeModelName() {
  switch (env.LLM_PROVIDER) {
    case 'qwen':
      return env.QWEN_MODEL;
    case 'mock':
      return 'deterministic-reading-mock-v1';
    default:
      return 'unknown';
  }
}

function plainTextFromReading(content: StructuredReadingOutput) {
  return [
    content.summary,
    ...content.sections.map((section) => `${section.title}\n\n${section.content}`),
    ...content.advice,
  ].join('\n\n');
}

async function incrementReadingUsage(userId: string) {
  const now = new Date();

  const { data: existingUsage } = await db
    .from('usage_counters')
    .select('id, readings_generated')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gte('period_end', now.toISOString())
    .maybeSingle();

  if (existingUsage) {
    await db
      .from('usage_counters')
      .update({ readings_generated: (existingUsage.readings_generated ?? 0) + 1 })
      .eq('id', existingUsage.id);
    return;
  }

  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await db.from('usage_counters').insert({
    user_id: userId,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    readings_generated: 1,
  });
}

function normalizeToneStyle(value: string | null | undefined): ToneStyle {
  return TONE_STYLES.includes(value as ToneStyle) ? (value as ToneStyle) : 'balanced';
}

function extractWarnings(value: Json): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((warning): warning is string => typeof warning === 'string');
}

async function runStructuredStage<T>({
  operationKey,
  systemPrompt,
  userPrompt,
  schema,
  mockResponse,
  maxTokens,
  requestPayload,
  traces,
}: {
  operationKey: string;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  mockResponse: T;
  maxTokens?: number;
  requestPayload: JsonObject;
  traces: GenerationLogDraft[];
}): Promise<T> {
  const startedAt = Date.now();

  try {
    const result = await generateStructuredOutputWithUsage({
      systemPrompt,
      userPrompt,
      schema,
      mockResponse,
      maxTokens,
    });

    traces.push({
      operationKey,
      requestPayload: {
        ...requestPayload,
        systemPrompt,
        userPrompt,
      },
      responsePayload: result.content as Json,
      latencyMs: Date.now() - startedAt,
      usageTokens: result.usageTokens,
      errorMessage: null,
    });

    return result.content;
  } catch (error) {
    traces.push({
      operationKey,
      requestPayload: {
        ...requestPayload,
        systemPrompt,
        userPrompt,
      },
      responsePayload: {
        status: 'error',
      } as Json,
      latencyMs: Date.now() - startedAt,
      usageTokens: null,
      errorMessage: error instanceof Error ? error.message : 'Structured generation failed',
    });

    throw error;
  }
}

/** Fast: creates a pending reading record without running LLM. */
export async function createPendingReading(userId: string, input: ReadingCreateInput) {
  const { data: chart } = await db
    .from('charts')
    .select('id, label')
    .eq('id', input.chartId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!chart) {
    throw new NotFoundError({ message: 'Chart not found' });
  }

  const { data: snapshot } = await db
    .from('chart_snapshots')
    .select('id')
    .eq('chart_id', input.chartId)
    .order('snapshot_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const title = stableReadingTitle(input.readingType, chart.label, input.locale);

  const { data: reading, error } = await db
    .from('readings')
    .insert({
      user_id: userId,
      chart_id: input.chartId,
      chart_snapshot_id: snapshot?.id ?? null,
      reading_type: input.readingType,
      title,
      status: 'pending',
      locale: input.locale,
      prompt_version: 'astrology-reading-pipeline-v1',
      schema_version: '1',
    })
    .select('*')
    .single();

  if (error || !reading) {
    throw error ?? new Error('Failed to create reading');
  }

  return reading;
}

/**
 * Slow: fetches chart data and runs the 3-stage LLM pipeline to fill in a pending reading.
 * Idempotent: no-ops if the reading is already 'ready'.
 */
export async function generateReadingContent(readingId: string, userId: string): Promise<void> {
  const { data: pendingReading } = await db
    .from('readings')
    .select('id, chart_id, chart_snapshot_id, reading_type, locale, status')
    .eq('id', readingId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!pendingReading) {
    throw new NotFoundError({ message: 'Reading not found' });
  }

  // Idempotent: already completed or in-flight
  if (pendingReading.status === 'ready' || pendingReading.status === 'generating') {
    return;
  }

  // Mark as generating to prevent duplicate concurrent runs
  await db.from('readings').update({ status: 'generating' }).eq('id', readingId);

  const { data: chart } = await db
    .from('charts')
    .select(
      'id, label, person_name, birth_date, birth_time, birth_time_known, city, country, house_system, user_id, latitude, longitude',
    )
    .eq('id', pendingReading.chart_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!chart) {
    await db
      .from('readings')
      .update({ status: 'error', error_message: 'Chart not found' })
      .eq('id', readingId);
    return;
  }

  const snapshotId = pendingReading.chart_snapshot_id;

  if (!snapshotId) {
    await db
      .from('readings')
      .update({ status: 'error', error_message: 'No chart snapshot available' })
      .eq('id', readingId);
    return;
  }

  const { data: snapshot } = await db
    .from('chart_snapshots')
    .select('id, warnings_json')
    .eq('id', snapshotId)
    .maybeSingle();

  const [{ data: positions }, { data: aspects }, { data: preferences }] = await Promise.all([
    db
      .from('chart_positions')
      .select('body_key, sign_key, house_number, degree_decimal, retrograde')
      .eq('chart_snapshot_id', snapshotId)
      .order('degree_decimal', { ascending: true }),
    db
      .from('chart_aspects')
      .select('body_a, body_b, aspect_key, orb_decimal, applying')
      .eq('chart_snapshot_id', snapshotId)
      .order('orb_decimal', { ascending: true }),
    db
      .from('user_preferences')
      .select(
        'tone_style, allow_spiritual_tone, content_focus_love, content_focus_career, content_focus_growth',
      )
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const locale = pendingReading.locale as AstrologyLocale;
  const readingType = pendingReading.reading_type as ReadingCreateInput['readingType'];

  const generationTraces: GenerationLogDraft[] = [];
  let status: 'ready' | 'error' = 'ready';
  let errorMessage: string | null = null;
  let content: StructuredReadingOutput;

  try {
    let transitPositions:
      | Array<{
          bodyKey: string;
          signKey: string;
          houseNumber: number | null;
          degreeDecimal: number;
          retrograde: boolean;
        }>
      | undefined;

    if (readingType === 'transit' && chart.latitude !== null && chart.longitude !== null) {
      try {
        const today = new Date();
        const transitResult = await calculateNatalChart({
          personName: 'transit',
          birthDate: today.toISOString().slice(0, 10),
          birthTime: '12:00',
          birthTimeKnown: true,
          city: chart.city,
          country: chart.country,
          latitude: chart.latitude,
          longitude: chart.longitude,
          houseSystem: normalizeHouseSystem(chart.house_system),
          label: 'transit',
          subjectType: 'other',
        });
        transitPositions = transitResult.positions.map((p) => ({
          bodyKey: p.bodyKey,
          signKey: p.signKey,
          houseNumber: p.houseNumber ?? null,
          degreeDecimal: p.degreeDecimal,
          retrograde: p.retrograde,
        }));
      } catch (err) {
        logger.warn({ err }, 'readings: failed to compute transit positions, continuing without');
      }
    }

    const promptInput: ReadingPromptInput = {
      locale,
      readingType,
      toneStyle: normalizeToneStyle(preferences?.tone_style),
      allowSpiritualTone: preferences?.allow_spiritual_tone ?? true,
      contentFocusLove: preferences?.content_focus_love ?? true,
      contentFocusCareer: preferences?.content_focus_career ?? true,
      contentFocusGrowth: preferences?.content_focus_growth ?? true,
      chartLabel: chart.label,
      personName: chart.person_name,
      birthDate: chart.birth_date,
      birthTimeKnown: chart.birth_time_known,
      city: chart.city,
      country: chart.country,
      houseSystem: chart.house_system,
      positions: (positions ?? []).map((position: ChartPositionSource) => ({
        bodyKey: position.body_key,
        signKey: position.sign_key,
        houseNumber: position.house_number,
        degreeDecimal: position.degree_decimal,
        retrograde: position.retrograde,
      })),
      aspects: (aspects ?? []).map((aspect: ChartAspectSource) => ({
        bodyA: aspect.body_a,
        bodyB: aspect.body_b,
        aspectKey: aspect.aspect_key,
        orbDecimal: aspect.orb_decimal,
        applying: aspect.applying,
      })),
      warnings: extractWarnings(snapshot?.warnings_json ?? null),
      transitPositions,
    };

    const stageContext = {
      chartId: chart.id,
      chartSnapshotId: snapshotId,
      locale,
      readingType,
      provider: env.LLM_PROVIDER,
      model: activeModelName(),
    } satisfies JsonObject;

    const planPrompts = buildReadingPlanPrompts(promptInput);
    const plan = await runStructuredStage({
      operationKey: 'reading.pipeline.planner',
      systemPrompt: planPrompts.systemPrompt,
      userPrompt: planPrompts.userPrompt,
      schema: readingPlanSchema,
      mockResponse: planPrompts.mockResponse,
      requestPayload: {
        ...stageContext,
        stage: 'planner',
        promptVersion: planPrompts.mockResponse.metadata.promptVersion,
      },
      traces: generationTraces,
    });

    const writerPrompts = buildReadingWriterPrompts(promptInput, plan);
    const draft = await runStructuredStage({
      operationKey: 'reading.pipeline.writer',
      systemPrompt: writerPrompts.systemPrompt,
      userPrompt: writerPrompts.userPrompt,
      schema: structuredReadingSchema,
      mockResponse: writerPrompts.mockResponse,
      maxTokens: 8192,
      requestPayload: {
        ...stageContext,
        stage: 'writer',
        promptVersion: writerPrompts.mockResponse.metadata.promptVersion,
        plan,
      },
      traces: generationTraces,
    });

    const reviewPrompts = buildReadingReviewPrompts(promptInput, draft);
    content = await runStructuredStage({
      operationKey: 'reading.pipeline.reviewer',
      systemPrompt: reviewPrompts.systemPrompt,
      userPrompt: reviewPrompts.userPrompt,
      schema: structuredReadingSchema,
      mockResponse: reviewPrompts.mockResponse,
      maxTokens: 8192,
      requestPayload: {
        ...stageContext,
        stage: 'reviewer',
        promptVersion: reviewPrompts.mockResponse.metadata.promptVersion,
        draft,
      },
      traces: generationTraces,
    });
  } catch (error) {
    status = 'error';
    errorMessage = error instanceof Error ? error.message : 'Reading generation failed';
    content = {
      title: stableReadingTitle(readingType, chart.label, locale),
      summary:
        'Разбор не удалось сгенерировать автоматически. Данные карты сохранены — попробуйте ещё раз.',
      sections: [
        {
          key: 'generation-failed',
          title: 'Генерация не выполнена',
          content:
            'Запрос к AI завершился ошибкой. Снимок карты доступен, поэтому разбор можно повторить без пересоздания карты.',
        },
      ],
      placementHighlights: [],
      advice: ['Повторите генерацию после проверки настроек AI-провайдера.'],
      disclaimers: [
        'Астрологический разбор носит интерпретационный характер и не является медицинской, юридической или финансовой рекомендацией.',
      ],
      metadata: {
        locale,
        readingType,
        promptVersion: 'astrology-reading-pipeline-v1',
        schemaVersion: '1',
      },
    };
  }

  // Update the reading record with generated content
  await db
    .from('readings')
    .update({
      status,
      title: content.title,
      summary: content.summary,
      rendered_content_json: content as Json,
      plain_text_content: plainTextFromReading(content),
      prompt_version: content.metadata.promptVersion,
      model_provider: env.LLM_PROVIDER,
      model_name: activeModelName(),
      error_message: errorMessage,
    })
    .eq('id', readingId);

  // Insert sections (only for successful generation)
  if (status === 'ready' && content.sections.length > 0) {
    await db.from('reading_sections').insert(
      content.sections.map((section, index) => ({
        reading_id: readingId,
        section_key: section.key,
        title: section.title,
        content: section.content,
        sort_order: index,
      })),
    );
  }

  // Persist generation logs
  if (generationTraces.length > 0) {
    const generationLogRows: TablesInsert<'generation_logs'>[] = generationTraces.map((trace) => ({
      user_id: userId,
      entity_type: 'reading',
      entity_id: readingId,
      operation_key: trace.operationKey,
      provider: env.LLM_PROVIDER,
      model: activeModelName(),
      request_payload_json: trace.requestPayload,
      response_payload_json: trace.responsePayload,
      latency_ms: trace.latencyMs,
      usage_tokens: trace.usageTokens,
      error_message: trace.errorMessage,
    }));

    const { error: generationLogError } = await db
      .from('generation_logs')
      .insert(generationLogRows);

    if (generationLogError) {
      logger.warn(
        { error: generationLogError, readingId, traceCount: generationTraces.length },
        'readings: failed to persist generation logs',
      );
    }
  }

  if (status === 'ready') {
    try {
      await incrementReadingUsage(userId);
    } catch (usageErr) {
      logger.warn({ err: usageErr, readingId }, 'readings: failed to increment usage counter');
    }
  }
}

/** Reset a failed reading to pending so it can be re-generated. */
export async function resetReadingForRetry(readingId: string, userId: string) {
  const { data: reading } = await db
    .from('readings')
    .select('id, status')
    .eq('id', readingId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!reading) throw new NotFoundError({ message: 'Reading not found' });

  await db.from('readings').update({ status: 'pending', error_message: null }).eq('id', readingId);
}
