import { NotFoundError } from '@/lib/errors';
import { env } from '@/lib/env';
import { generateStructuredOutput } from '@/lib/llm/structured-generation';
import {
  structuredReadingSchema,
  type StructuredReadingOutput,
} from '@/lib/readings/report-schema';
import { buildReadingPrompts } from '@/lib/readings/prompt';
import type { ReadingCreateInput } from '@/lib/readings/reading-request-schema';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Temporary bridge until Supabase types are regenerated for the astrology schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

function activeModelName() {
  switch (env.LLM_PROVIDER) {
    case 'qwen':
      return env.QWEN_MODEL;
    case 'ollama':
      return env.OLLAMA_MODEL;
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

function titleForReadingType(readingType: string, label: string) {
  switch (readingType) {
    case 'natal_overview':
      return `${label} - Natal Overview`;
    case 'personality':
      return `${label} - Personality Reading`;
    case 'love':
      return `${label} - Love Reading`;
    case 'career':
      return `${label} - Career Reading`;
    case 'strengths':
      return `${label} - Strengths and Challenges`;
    case 'transit':
      return `${label} - Transit Snapshot`;
    case 'compatibility':
      return `${label} - Compatibility`;
    default:
      return `${label} - Reading`;
  }
}

export async function createReadingDraft(userId: string, input: ReadingCreateInput) {
  const { data: chart } = await db
    .from('charts')
    .select(
      'id, label, person_name, birth_date, birth_time_known, city, country, house_system, user_id',
    )
    .eq('id', input.chartId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!chart) {
    throw new NotFoundError({ message: 'Chart not found' });
  }

  const { data: snapshot } = await db
    .from('chart_snapshots')
    .select('id, warnings_json')
    .eq('chart_id', input.chartId)
    .order('snapshot_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: positions }, { data: aspects }, { data: preferences }] = await Promise.all([
    snapshot?.id
      ? db
          .from('chart_positions')
          .select('body_key, sign_key, house_number, degree_decimal, retrograde')
          .eq('chart_snapshot_id', snapshot.id)
          .order('degree_decimal', { ascending: true })
      : Promise.resolve({ data: [] }),
    snapshot?.id
      ? db
          .from('chart_aspects')
          .select('body_a, body_b, aspect_key, orb_decimal, applying')
          .eq('chart_snapshot_id', snapshot.id)
          .order('orb_decimal', { ascending: true })
      : Promise.resolve({ data: [] }),
    db.from('user_preferences').select('tone_style').eq('user_id', userId).maybeSingle(),
  ]);

  let status: 'pending' | 'ready' | 'error' = snapshot?.id ? 'ready' : 'pending';
  let errorMessage: string | null = snapshot?.id ? null : 'No chart snapshot available yet';
  let content: StructuredReadingOutput;

  if (!snapshot?.id) {
    content = {
      title: titleForReadingType(input.readingType, chart.label),
      summary:
        'Reading generation is waiting for a valid chart snapshot. Create or recalculate the chart first.',
      sections: [
        {
          key: 'awaiting-chart',
          title: 'Awaiting Chart Data',
          content:
            'This reading cannot be generated yet because no computed chart snapshot is available for the selected chart.',
        },
      ],
      placementHighlights: [],
      advice: [],
      disclaimers: [
        'Astrology output is interpretive guidance and not medical, legal, or financial advice.',
      ],
      metadata: {
        locale: input.locale,
        readingType: input.readingType,
        promptVersion: 'astrology-reading-v1',
        schemaVersion: '1',
      },
    };
  } else {
    try {
      const prompts = buildReadingPrompts({
        locale: input.locale,
        readingType: input.readingType,
        toneStyle: preferences?.tone_style ?? 'balanced',
        chartLabel: chart.label,
        personName: chart.person_name,
        birthDate: chart.birth_date,
        birthTimeKnown: chart.birth_time_known,
        city: chart.city,
        country: chart.country,
        houseSystem: chart.house_system,
        positions: (positions ?? []).map(
          (position: {
            body_key: string;
            sign_key: string;
            house_number: number | null;
            degree_decimal: number;
            retrograde: boolean;
          }) => ({
            bodyKey: position.body_key,
            signKey: position.sign_key,
            houseNumber: position.house_number,
            degreeDecimal: position.degree_decimal,
            retrograde: position.retrograde,
          }),
        ),
        aspects: (aspects ?? []).map(
          (aspect: {
            body_a: string;
            body_b: string;
            aspect_key: string;
            orb_decimal: number;
            applying: boolean | null;
          }) => ({
            bodyA: aspect.body_a,
            bodyB: aspect.body_b,
            aspectKey: aspect.aspect_key,
            orbDecimal: aspect.orb_decimal,
            applying: aspect.applying,
          }),
        ),
        warnings: Array.isArray(snapshot.warnings_json) ? snapshot.warnings_json : [],
      });

      content = await generateStructuredOutput({
        systemPrompt: prompts.systemPrompt,
        userPrompt: prompts.userPrompt,
        schema: structuredReadingSchema,
        mockResponse: prompts.mockResponse,
      });
    } catch (error) {
      status = 'error';
      errorMessage = error instanceof Error ? error.message : 'Reading generation failed';
      content = {
        title: titleForReadingType(input.readingType, chart.label),
        summary:
          'The reading could not be generated automatically in this attempt. The chart data was saved and can be retried.',
        sections: [
          {
            key: 'generation-failed',
            title: 'Generation Failed',
            content:
              'The structured reading request failed during AI synthesis. The chart snapshot is available, so this reading can be retried without recreating the chart.',
          },
        ],
        placementHighlights: [],
        advice: ['Retry the reading after confirming the LLM configuration is available.'],
        disclaimers: [
          'Astrology output is interpretive guidance and not medical, legal, or financial advice.',
        ],
        metadata: {
          locale: input.locale,
          readingType: input.readingType,
          promptVersion: 'astrology-reading-v1',
          schemaVersion: '1',
        },
      };
    }
  }

  const { data: reading, error } = await db
    .from('readings')
    .insert({
      user_id: userId,
      chart_id: input.chartId,
      chart_snapshot_id: snapshot?.id ?? null,
      reading_type: input.readingType,
      title: content.title,
      status,
      locale: input.locale,
      prompt_version: content.metadata.promptVersion,
      schema_version: '1',
      model_provider: snapshot?.id ? env.LLM_PROVIDER : null,
      model_name: snapshot?.id ? activeModelName() : null,
      summary: content.summary,
      rendered_content_json: content,
      plain_text_content: plainTextFromReading(content),
      error_message: errorMessage,
    })
    .select('*')
    .single();

  if (error || !reading) {
    throw error ?? new Error('Failed to create reading');
  }

  const { error: sectionError } = await db.from('reading_sections').insert(
    content.sections.map((section, index) => ({
      reading_id: reading.id,
      section_key: section.key,
      title: section.title,
      content: section.content,
      sort_order: index,
    })),
  );

  if (sectionError) {
    throw sectionError;
  }

  if (status === 'ready') {
    await incrementReadingUsage(userId);
  }

  return reading;
}
