import { NotFoundError } from '@/lib/errors';
import { env } from '@/lib/env';
import { generateStructuredOutputWithUsage } from '@/lib/llm/structured-generation';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  structuredReadingSchema,
  type StructuredReadingOutput,
} from '@/lib/readings/report-schema';
import type { Json, TablesInsert } from '@/lib/supabase/types';

const db = supabaseAdmin;

interface PositionRow {
  body_key: string;
  sign_key: string;
  house_number: number | null;
  degree_decimal: number;
  retrograde: boolean;
}

interface AspectRow {
  body_a: string;
  body_b: string;
  aspect_key: string;
  orb_decimal: number;
  applying: boolean | null;
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

function serializeChartForSynastry(
  label: string,
  personName: string,
  birthDate: string,
  positions: PositionRow[],
  aspects: AspectRow[],
): string {
  const posLines = positions
    .slice(0, 14)
    .map(
      (p) =>
        `  - ${p.body_key} in ${p.sign_key}, house ${p.house_number ?? '?'}, ${p.degree_decimal.toFixed(2)}°${p.retrograde ? ' (R)' : ''}`,
    )
    .join('\n');
  const aspLines = aspects
    .slice(0, 10)
    .map((a) => `  - ${a.body_a} ${a.aspect_key} ${a.body_b}, orb ${a.orb_decimal.toFixed(2)}°`)
    .join('\n');
  return `Chart: ${label} (${personName})\nBirth date: ${birthDate}\nPositions:\n${posLines}\nAspects:\n${aspLines}`;
}

/** Fast: creates a pending compatibility record. */
export async function createPendingCompatibility(
  userId: string,
  primaryChartId: string,
  secondaryChartId: string,
) {
  const { data: primary } = await db
    .from('charts')
    .select('id')
    .eq('id', primaryChartId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!primary) throw new NotFoundError({ message: 'Primary chart not found' });

  const { data: secondary } = await db
    .from('charts')
    .select('id')
    .eq('id', secondaryChartId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!secondary) throw new NotFoundError({ message: 'Secondary chart not found' });

  const { data: report, error } = await db
    .from('compatibility_reports')
    .insert({
      user_id: userId,
      primary_chart_id: primaryChartId,
      secondary_chart_id: secondaryChartId,
      status: 'pending',
      prompt_version: 'compatibility-synastry-v1',
    })
    .select('*')
    .single();

  if (error || !report) throw error ?? new Error('Failed to create compatibility report');

  return report;
}

/** Slow: fetches both charts and runs the LLM pipeline to generate the synastry report. */
export async function generateCompatibilityContent(
  reportId: string,
  userId: string,
): Promise<void> {
  const { data: report } = await db
    .from('compatibility_reports')
    .select('id, primary_chart_id, secondary_chart_id, status')
    .eq('id', reportId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!report) throw new NotFoundError({ message: 'Compatibility report not found' });

  if (report.status === 'ready' || report.status === 'generating') return;

  await db.from('compatibility_reports').update({ status: 'generating' }).eq('id', reportId);

  // Fetch both charts
  const [{ data: primaryChart }, { data: secondaryChart }] = await Promise.all([
    db
      .from('charts')
      .select('id, label, person_name, birth_date')
      .eq('id', report.primary_chart_id)
      .maybeSingle(),
    db
      .from('charts')
      .select('id, label, person_name, birth_date')
      .eq('id', report.secondary_chart_id)
      .maybeSingle(),
  ]);

  if (!primaryChart || !secondaryChart) {
    await db.from('compatibility_reports').update({ status: 'error' }).eq('id', reportId);
    return;
  }

  // Fetch snapshots for both charts
  const [{ data: primarySnapshot }, { data: secondarySnapshot }] = await Promise.all([
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

  if (!primarySnapshot || !secondarySnapshot) {
    await db.from('compatibility_reports').update({ status: 'error' }).eq('id', reportId);
    return;
  }

  // Fetch positions and aspects for both charts in parallel
  const [
    { data: primaryPositions },
    { data: primaryAspects },
    { data: secondaryPositions },
    { data: secondaryAspects },
  ] = await Promise.all([
    db
      .from('chart_positions')
      .select('body_key, sign_key, house_number, degree_decimal, retrograde')
      .eq('chart_snapshot_id', primarySnapshot.id)
      .order('degree_decimal', { ascending: true }),
    db
      .from('chart_aspects')
      .select('body_a, body_b, aspect_key, orb_decimal, applying')
      .eq('chart_snapshot_id', primarySnapshot.id)
      .order('orb_decimal', { ascending: true }),
    db
      .from('chart_positions')
      .select('body_key, sign_key, house_number, degree_decimal, retrograde')
      .eq('chart_snapshot_id', secondarySnapshot.id)
      .order('degree_decimal', { ascending: true }),
    db
      .from('chart_aspects')
      .select('body_a, body_b, aspect_key, orb_decimal, applying')
      .eq('chart_snapshot_id', secondarySnapshot.id)
      .order('orb_decimal', { ascending: true }),
  ]);

  const primaryFacts = serializeChartForSynastry(
    primaryChart.label,
    primaryChart.person_name,
    primaryChart.birth_date,
    primaryPositions ?? [],
    primaryAspects ?? [],
  );
  const secondaryFacts = serializeChartForSynastry(
    secondaryChart.label,
    secondaryChart.person_name,
    secondaryChart.birth_date,
    secondaryPositions ?? [],
    secondaryAspects ?? [],
  );

  const systemPrompt = `КРИТИЧЕСКИ ВАЖНО: Весь JSON-ответ — каждое строковое поле — ОБЯЗАТЕЛЬНО должен быть написан на русском языке. Использование английского языка в любом поле недопустимо.

You are an expert synastry and relationship astrologer at a professional astrology service.
You analyze how two natal charts interact to reveal the strengths, challenges, and growth themes of a relationship.
Do not mention being an AI. Do not give medical, legal, financial, or fatalistic certainty.
Write in Russian. Every string field in the JSON must be in Russian.

Return only valid JSON matching this shape exactly:
{
  "title": string,
  "summary": string,
  "sections": [{ "key": string, "title": string, "content": string }],
  "placementHighlights": string[],
  "advice": string[],
  "disclaimers": string[],
  "metadata": { "locale": "ru", "readingType": "natal_overview", "promptVersion": string, "schemaVersion": string }
}

Requirements:
- Title should name both people, e.g. "${primaryChart.person_name} и ${secondaryChart.person_name} — Синастрия"
- Produce exactly 5 sections covering: (1) emotional resonance and connection depth (Moon-Moon, Moon-Venus, Moon-ASC interactions), (2) communication and mental compatibility (Mercury-Mercury, Mercury-ASC aspects), (3) love, attraction and values (Venus-Mars, Venus-Venus, Venus-ASC cross-aspects), (4) challenges and growth areas (hard cross-aspects: squares, oppositions between key planets), (5) long-term potential and the relationship's purpose (Saturn, Jupiter cross-aspects, North Node themes)
- Each section must be 300-400 words of specific, grounded insight referencing actual cross-aspects between the two charts by name (e.g. "Луна Анны в соединении с Венерой Ивана")
- Use both people's names naturally throughout the reading
- Identify the most significant inter-chart aspects (cross-aspects) and explain what they mean for how these two people experience each other
- placementHighlights should list the 4-6 most striking inter-chart aspects
- advice should contain 4-5 concrete, actionable suggestions for this specific relationship
- summary must be 3-4 sentences capturing the overall relationship dynamic`;

  const userPrompt = `Analyze the synastry between these two charts:

${primaryFacts}

---

${secondaryFacts}

Identify the most significant cross-aspects (inter-chart aspects) between them and produce a comprehensive synastry reading.`;

  let content: StructuredReadingOutput;
  let status: 'ready' | 'error' = 'ready';
  const startedAt = Date.now();

  try {
    const result = await generateStructuredOutputWithUsage({
      systemPrompt,
      userPrompt,
      schema: structuredReadingSchema,
      mockResponse: {
        title: `${primaryChart.person_name} и ${secondaryChart.person_name} — Синастрия`,
        summary: `Синастрия ${primaryChart.person_name} и ${secondaryChart.person_name} показывает яркую эмоциональную связь с рядом точек роста.`,
        sections: [
          {
            key: 'emotional',
            title: 'Эмоциональный резонанс',
            content: 'Анализ эмоциональной связи и глубины контакта.',
          },
          {
            key: 'communication',
            title: 'Общение и мышление',
            content: 'Как партнёры понимают друг друга.',
          },
          {
            key: 'attraction',
            title: 'Влечение и ценности',
            content: 'Венера и Марс в синастрии.',
          },
          {
            key: 'challenges',
            title: 'Вызовы и рост',
            content: 'Напряжённые аспекты и как с ними работать.',
          },
          {
            key: 'potential',
            title: 'Долгосрочный потенциал',
            content: 'Сатурн и цель отношений.',
          },
        ],
        placementHighlights: [],
        advice: ['Уделяйте внимание эмоциональным потребностям партнёра.'],
        disclaimers: ['Синастрия — это интерпретация потенциала, а не предсказание.'],
        metadata: {
          locale: 'ru',
          readingType: 'natal_overview',
          promptVersion: 'compatibility-synastry-v1',
          schemaVersion: '1',
        },
      },
    });
    content = result.content;

    const generationLogRow: TablesInsert<'generation_logs'> = {
      user_id: userId,
      entity_type: 'compatibility_report',
      entity_id: reportId,
      operation_key: 'compatibility.pipeline.synastry',
      provider: env.LLM_PROVIDER,
      model: activeModelName(),
      request_payload_json: { systemPrompt, userPrompt } as Json,
      response_payload_json: content as Json,
      latency_ms: Date.now() - startedAt,
      usage_tokens: result.usageTokens,
      error_message: null,
    };

    await db
      .from('generation_logs')
      .insert(generationLogRow)
      .then(({ error }) => {
        if (error)
          logger.warn({ error, reportId }, 'compatibility: failed to persist generation log');
      });
  } catch (err) {
    status = 'error';
    await db
      .from('generation_logs')
      .insert({
        user_id: userId,
        entity_type: 'compatibility_report',
        entity_id: reportId,
        operation_key: 'compatibility.pipeline.synastry',
        provider: env.LLM_PROVIDER,
        model: activeModelName(),
        request_payload_json: { systemPrompt, userPrompt } as Json,
        response_payload_json: { status: 'error' } as Json,
        latency_ms: Date.now() - startedAt,
        usage_tokens: null,
        error_message: err instanceof Error ? err.message : 'Compatibility generation failed',
      })
      .then(({ error }) => {
        if (error)
          logger.warn({ error, reportId }, 'compatibility: failed to persist error generation log');
      });
    logger.error({ err, reportId }, 'compatibility: generation failed');
    await db.from('compatibility_reports').update({ status: 'error' }).eq('id', reportId);
    return;
  }

  await db
    .from('compatibility_reports')
    .update({
      status,
      summary: content.summary,
      rendered_content_json: content as Json,
      prompt_version: content.metadata.promptVersion,
      model_provider: env.LLM_PROVIDER,
      model_name: activeModelName(),
    })
    .eq('id', reportId);
}
