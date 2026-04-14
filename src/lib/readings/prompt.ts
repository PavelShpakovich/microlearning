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

  const systemPrompt = `You are an expert astrology analysis planner working for a professional astrology service.
You must interpret only the supplied chart data and produce a structured, in-depth plan for an astrology reading.
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
- Produce exactly 5 section blueprints for a rich, comprehensive reading.
- Section keys must be short kebab-case identifiers.
- Each section focus must be at least 2–3 sentences describing what the writer should explore and which specific placements to reference.
- Keep the plan grounded in the actual placements and aspects provided — reference specific bodies, signs, houses, and aspects.
- Advice themes must be actionable, specific, and emotionally measured.
- Caution notes must reflect genuine uncertainty, especially if birth time is unknown.

Reading-type guidance for section planning:
- natal_overview / personality: Sections should cover (1) core identity and ego expression (Sun sign/house), (2) emotional world and inner needs (Moon sign/house), (3) communication and thinking style (Mercury/3rd house), (4) relational dynamics (Venus/7th house/Descendant), (5) life direction and ambitions (10th house/MC/Sun-Moon integration).
- love: Sections should cover (1) what the person needs from a partner, (2) how they express and receive love (Venus sign/house), (3) patterns attracting or repelling connection (7th house ruler), (4) emotional communication in relationships (Moon/Venus aspects), (5) growth path in love.
- career: Sections should cover (1) natural talents and vocational calling (10th house/MC), (2) working style and discipline (Saturn/6th house), (3) ambition and drive (Mars/Sun), (4) challenges and latent potential (squares/oppositions to MC), (5) a practical roadmap for professional development.
- strengths: Sections should cover (1) innate gifts (trines and sextiles), (2) resilience and determination (fire/earth emphasis), (3) interpersonal strengths, (4) creative or intellectual edge (Mercury/Venus/3rd/5th house), (5) how to leverage strengths.
- transit: Sections should cover (1) current major transiting themes, (2) areas of life highlighted now, (3) inner shifts and growth demands, (4) practical opportunities, (5) timing and rhythm.
- finance: Sections should cover (1) the person's natural relationship with money and material security (2nd house/Venus/Jupiter), (2) income capacity and earning talents (6th house/Sun placement), (3) risk tolerance and speculative tendencies (5th/8th house rulers, Jupiter/Saturn balance), (4) financial patterns and blind spots (Saturn/Pluto in money houses), (5) practical roadmap for financial well-being.
- health: Sections should cover (1) constitutional vitality and overall health signature (Sun/Mars/1st house), (2) areas of physical sensitivity and vulnerability (6th house/Chiron), (3) nerves, stress, and mental-emotional impact on health (Moon/Gemini/Mercury placements), (4) restorative and regenerative resources (Moon/Neptune/12th house), (5) lifestyle guidance aligned with the chart.`;

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

  const systemPrompt = `You are a professional astrology writer producing a rich, insightful, and deeply personal reading for a real user.
Your writing must feel warm, authoritative, and psychologically grounded — like a skilled astrologer speaking directly to the person.
You must follow the approved plan while expanding every section into substantial, meaningful prose tied to the actual chart data.
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
- Each section content MUST be at least 350–500 words of rich, focused prose. This is a paid professional service — thin content is unacceptable.
- Every section must reference specific planetary placements, signs, houses, and aspects from the chart data. Never write generically.
- Name the person (${input.personName}) naturally in the reading to make it personal.
- Use the actual Sun, Moon, Ascendant, and house positions as the backbone of interpretation.
- When describing aspects, explain what they mean for this person's lived experience (e.g., "Moon square Saturn often shows up as...").
- Where retrograde planets appear, note their introspective or reworked quality.
- Advice must stay practical, specific, and emotionally measured — not vague platitudes.
- Disclaimers must include interpretive guidance language and reflect caution notes from the plan.
- summary must be 3–5 engaging sentences that capture the core character of the chart.
- Do NOT write hollow filler sentences. Every sentence must add meaning derived from the chart.`;

  const userPrompt = `Write a full ${input.readingType} astrology reading for ${input.personName}. This reading will be delivered to the client — make it rich, personal, and substantive. Each section must be 350–500 words minimum.

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
  const systemPrompt = `You are a senior astrology reading editor at a professional astrology service.
Your job is to improve clarity, depth, grounding, and safety without changing the intended meaning.
Return only valid JSON in exactly the same schema as the draft.
Review goals:
- Remove overclaiming and fatalistic wording ("you will", "you must")
- Remove vague platitudes not tied to the chart — replace them with chart-specific insight
- Ensure every section has at least 350 words of meaningful content; if too short, expand with relevant chart analysis
- Keep the reading tied to the actual chart placements and aspects provided
- Keep tone warm, authoritative, direct, and non-manipulative
- Preserve all section structure (keys, titles)
- Ensure disclaimers are present and useful
- Make the content feel personal — the person's name and their actual sign placements should appear naturally`;

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
