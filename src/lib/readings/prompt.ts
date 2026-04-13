import type { AstrologyLocale, ReadingType, ToneStyle } from '@/lib/astrology/types';
import type { ReadingPlanOutput } from '@/lib/readings/plan-schema';
import type { StructuredReadingOutput } from '@/lib/readings/report-schema';

const READING_PIPELINE_VERSION = 'astrology-reading-pipeline-v1';

export interface ReadingPromptInput {
  locale: AstrologyLocale;
  readingType: ReadingType;
  toneStyle: ToneStyle;
  chartLabel: string;
  personName: string;
  birthDate: string;
  birthTimeKnown: boolean;
  city: string;
  country: string;
  houseSystem: string;
  positions: Array<{
    bodyKey: string;
    signKey: string;
    houseNumber: number | null;
    degreeDecimal: number;
    retrograde: boolean;
  }>;
  aspects: Array<{
    bodyA: string;
    bodyB: string;
    aspectKey: string;
    orbDecimal: number;
    applying: boolean | null;
  }>;
  warnings: string[];
}

function stableReadingTitle(readingType: ReadingType, chartLabel: string): string {
  switch (readingType) {
    case 'personality':
      return `${chartLabel} Personality Reading`;
    case 'love':
      return `${chartLabel} Love Reading`;
    case 'career':
      return `${chartLabel} Career Reading`;
    case 'strengths':
      return `${chartLabel} Strengths and Challenges`;
    case 'transit':
      return `${chartLabel} Transit Snapshot`;
    case 'compatibility':
      return `${chartLabel} Compatibility Reading`;
    default:
      return `${chartLabel} Natal Overview`;
  }
}

function serializeChartFacts(input: ReadingPromptInput): string {
  const positionsBlock = input.positions
    .slice(0, 16)
    .map(
      (position) =>
        `- ${position.bodyKey} in ${position.signKey}, house ${position.houseNumber ?? 'unknown'}, ${position.degreeDecimal.toFixed(2)}°, retrograde=${position.retrograde}`,
    )
    .join('\n');

  const aspectsBlock = input.aspects
    .slice(0, 16)
    .map(
      (aspect) =>
        `- ${aspect.bodyA} ${aspect.aspectKey} ${aspect.bodyB}, orb ${aspect.orbDecimal.toFixed(2)}°, applying=${aspect.applying ?? false}`,
    )
    .join('\n');

  const warningsBlock =
    input.warnings.length > 0
      ? input.warnings.map((warning) => `- ${warning}`).join('\n')
      : '- none';

  return `Chart:\n- Label: ${input.chartLabel}\n- Person: ${input.personName}\n- Birth date: ${input.birthDate}\n- Birth time known: ${input.birthTimeKnown ? 'yes' : 'no'}\n- Place: ${input.city}, ${input.country}\n- House system: ${input.houseSystem}\n- Tone style: ${input.toneStyle}\n\nPositions:\n${positionsBlock}\n\nAspects:\n${aspectsBlock}\n\nWarnings:\n${warningsBlock}`;
}

export function buildReadingPlanPrompts(input: ReadingPromptInput): {
  systemPrompt: string;
  userPrompt: string;
  mockResponse: ReadingPlanOutput;
} {
  const language = input.locale === 'ru' ? 'Russian' : 'English';
  const title = stableReadingTitle(input.readingType, input.chartLabel);

  const systemPrompt = `You are an expert astrology analysis planner.
You must interpret only the supplied chart data and produce a structured plan for a natal reading.
Do not mention being an AI.
Do not give medical, legal, financial, or fatalistic certainty.
Return only valid JSON matching this shape exactly:
{
  "title": string,
  "summaryAngle": string,
  "sectionBlueprints": [{ "key": string, "title": string, "focus": string }],
  "placementHighlights": string[],
  "adviceThemes": string[],
  "cautionNotes": string[],
  "metadata": {
    "locale": "en" | "ru",
    "readingType": "natal_overview" | "personality" | "love" | "career" | "strengths" | "transit" | "compatibility",
    "promptVersion": string,
    "schemaVersion": string
  }
}
Requirements:
- Write in ${language}.
- Produce 3 to 5 section blueprints.
- Section keys must be short kebab-case identifiers.
- Keep the plan grounded in placements and aspects provided.
- Advice themes must be actionable and emotionally measured.
- Caution notes must flag uncertainty, especially if birth time is unknown.`;

  const userPrompt = `Create a ${input.readingType} astrology reading plan.

${serializeChartFacts(input)}

Focus the plan on pattern recognition, emotional tone, relational style, inner contradictions, and grounded guidance.`;

  return {
    systemPrompt,
    userPrompt,
    mockResponse: {
      title,
      summaryAngle: `${input.personName}'s chart should be read through recurring emotional patterns, relationship dynamics, and a clear growth direction rather than through isolated placements.`,
      sectionBlueprints: [
        {
          key: 'core-patterns',
          title: 'Core Patterns',
          focus:
            'Explain the dominant emotional and motivational signatures visible across the strongest placements.',
        },
        {
          key: 'relationship-style',
          title: 'Relationship Style',
          focus:
            'Show how the chart approaches closeness, trust, and conflict regulation in real relationships.',
        },
        {
          key: 'growth-direction',
          title: 'Growth Direction',
          focus:
            'Translate the chart into practical, psychologically grounded advice for personal development.',
        },
      ],
      placementHighlights: input.positions.slice(0, 4).map((position) => {
        const houseLabel = position.houseNumber ? `house ${position.houseNumber}` : 'unknown house';
        return `${position.bodyKey} in ${position.signKey} (${houseLabel})`;
      }),
      adviceThemes: [
        'Track repeated emotional reactions before making final conclusions.',
        'Look for situations where sensitivity and control are in tension.',
        'Use the chart as a reflection tool, not as a substitute for choice.',
      ],
      cautionNotes: input.birthTimeKnown
        ? ['Keep the interpretation grounded in the actual placements and aspect pattern.']
        : [
            'Birth time is unknown, so houses and angle-based conclusions must remain limited or approximate.',
          ],
      metadata: {
        locale: input.locale,
        readingType: input.readingType,
        promptVersion: 'astrology-reading-plan-v1',
        schemaVersion: '1',
      },
    },
  };
}

export function buildReadingWriterPrompts(
  input: ReadingPromptInput,
  plan: ReadingPlanOutput,
): {
  systemPrompt: string;
  userPrompt: string;
  mockResponse: StructuredReadingOutput;
} {
  const language = input.locale === 'ru' ? 'Russian' : 'English';

  const systemPrompt = `You are an expert astrology writer producing a polished structured reading from an approved reading plan.
You must follow the plan while staying grounded in the supplied chart data.
Do not mention being an AI.
Do not give medical, legal, financial, or fatalistic certainty.
Return only valid JSON matching this shape exactly:
{
  "title": string,
  "summary": string,
  "sections": [{ "key": string, "title": string, "content": string }],
  "placementHighlights": string[],
  "advice": string[],
  "disclaimers": string[],
  "metadata": {
    "locale": "en" | "ru",
    "readingType": "natal_overview" | "personality" | "love" | "career" | "strengths" | "transit" | "compatibility",
    "promptVersion": string,
    "schemaVersion": string
  }
}
Requirements:
- Write in ${language}.
- Produce exactly the same number of sections as in the plan.
- Each section must expand the plan focus into clear, grounded prose.
- Advice must stay practical and emotionally measured.
- Disclaimers must include interpretive guidance language and reflect caution notes from the plan.`;

  const userPrompt = `Write the final ${input.readingType} astrology reading from this chart data and approved plan.

${serializeChartFacts(input)}

Approved plan:
${JSON.stringify(plan, null, 2)}`;

  return {
    systemPrompt,
    userPrompt,
    mockResponse: {
      title: plan.title,
      summary: plan.summaryAngle,
      sections: plan.sectionBlueprints.map((section) => ({
        key: section.key,
        title: section.title,
        content: `${section.focus} The strongest placements suggest that ${input.personName} benefits from slowing down interpretation and looking for repeated patterns instead of reacting to isolated moments.`,
      })),
      placementHighlights: plan.placementHighlights,
      advice: plan.adviceThemes,
      disclaimers: [
        'Astrology is interpretive guidance and should not replace professional medical, legal, or financial advice.',
        ...plan.cautionNotes,
      ],
      metadata: {
        locale: input.locale,
        readingType: input.readingType,
        promptVersion: 'astrology-reading-writer-v1',
        schemaVersion: '1',
      },
    },
  };
}

export function buildReadingReviewPrompts(
  input: ReadingPromptInput,
  draft: StructuredReadingOutput,
): {
  systemPrompt: string;
  userPrompt: string;
  mockResponse: StructuredReadingOutput;
} {
  const systemPrompt = `You are an astrology reading reviewer.
Your job is to improve clarity, grounding, and safety without changing the intended meaning.
Return only valid JSON in exactly the same schema as the draft.
Review goals:
- remove overclaiming and fatalistic wording
- keep the reading tied to chart evidence
- keep tone warm, precise, and non-manipulative
- preserve section structure
- ensure disclaimers are present and useful`;

  const userPrompt = `Review and refine this astrology reading draft.

${serializeChartFacts(input)}

Draft reading:
${JSON.stringify(draft, null, 2)}`;

  return {
    systemPrompt,
    userPrompt,
    mockResponse: {
      ...draft,
      disclaimers: Array.from(
        new Set([
          ...draft.disclaimers,
          'Astrology is interpretive guidance and should not replace professional medical, legal, or financial advice.',
          ...(input.birthTimeKnown
            ? []
            : [
                'Birth time is unknown, so houses and angle-based conclusions should be treated as limited or approximate.',
              ]),
        ]),
      ),
      metadata: {
        ...draft.metadata,
        promptVersion: READING_PIPELINE_VERSION,
        schemaVersion: '1',
      },
    },
  };
}

export function buildReadingPrompts(input: ReadingPromptInput): {
  systemPrompt: string;
  userPrompt: string;
  mockResponse: StructuredReadingOutput;
} {
  const planPrompts = buildReadingPlanPrompts(input);
  const writerPrompts = buildReadingWriterPrompts(input, planPrompts.mockResponse);
  const reviewedMock = buildReadingReviewPrompts(input, writerPrompts.mockResponse);

  return {
    systemPrompt: writerPrompts.systemPrompt,
    userPrompt: writerPrompts.userPrompt,
    mockResponse: reviewedMock.mockResponse,
  };
}
