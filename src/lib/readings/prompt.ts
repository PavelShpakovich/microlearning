import type { AstrologyLocale, ReadingType, ToneStyle } from '@/lib/astrology/types';
import type { StructuredReadingOutput } from '@/lib/readings/report-schema';

interface ReadingPromptInput {
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

export function buildReadingPrompts(input: ReadingPromptInput): {
  systemPrompt: string;
  userPrompt: string;
  mockResponse: StructuredReadingOutput;
} {
  const language = input.locale === 'ru' ? 'Russian' : 'English';
  const title = stableReadingTitle(input.readingType, input.chartLabel);

  const systemPrompt = `You are an expert astrology analyst writing thoughtful, structured natal readings.
You must interpret only the supplied chart data.
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
- Produce 3 to 5 sections.
- Section keys must be short kebab-case identifiers.
- Keep the interpretation grounded in placements and aspects provided.
- Advice must be actionable and emotionally measured.
- Disclaimers must include a reminder that astrology is interpretive guidance.`;

  const userPrompt = `Create a ${input.readingType} astrology reading.

Chart:
- Label: ${input.chartLabel}
- Person: ${input.personName}
- Birth date: ${input.birthDate}
- Birth time known: ${input.birthTimeKnown ? 'yes' : 'no'}
- Place: ${input.city}, ${input.country}
- House system: ${input.houseSystem}
- Tone style: ${input.toneStyle}

Positions:
${input.positions
  .slice(0, 16)
  .map(
    (position) =>
      `- ${position.bodyKey} in ${position.signKey}, house ${position.houseNumber ?? 'unknown'}, ${position.degreeDecimal.toFixed(2)}°, retrograde=${position.retrograde}`,
  )
  .join('\n')}

Aspects:
${input.aspects
  .slice(0, 16)
  .map(
    (aspect) =>
      `- ${aspect.bodyA} ${aspect.aspectKey} ${aspect.bodyB}, orb ${aspect.orbDecimal.toFixed(2)}°, applying=${aspect.applying ?? false}`,
  )
  .join('\n')}

Warnings:
${input.warnings.length > 0 ? input.warnings.map((warning) => `- ${warning}`).join('\n') : '- none'}

Focus the reading on pattern recognition, emotional tone, relational style, and grounded guidance.`;

  return {
    systemPrompt,
    userPrompt,
    mockResponse: {
      title,
      summary: `${input.personName}'s chart suggests a distinct emotional tone, clear inner drives, and several recurring growth themes worth observing over time.`,
      sections: [
        {
          key: 'core-patterns',
          title: 'Core Patterns',
          content: `${input.personName}'s chart points to a recognizable blend of instinct, motivation, and self-expression. The strongest placements suggest a person who benefits from understanding how inner sensitivity and outward action shape each other.`,
        },
        {
          key: 'relationship-style',
          title: 'Relationship Style',
          content:
            'The aspect pattern suggests that intimacy deepens when expectations are named clearly and emotional reactions are observed before they harden into stories. A steady rhythm matters more than intensity alone.',
        },
        {
          key: 'growth-direction',
          title: 'Growth Direction',
          content:
            'The most constructive path here is not self-correction through pressure, but awareness through repetition: notice triggers, name priorities, and keep returning to choices that build trust in your own timing.',
        },
      ],
      placementHighlights: input.positions.slice(0, 4).map((position) => {
        const houseLabel = position.houseNumber ? `house ${position.houseNumber}` : 'unknown house';
        return `${position.bodyKey} in ${position.signKey} (${houseLabel})`;
      }),
      advice: [
        'Track repeated emotional patterns before making major interpretive conclusions.',
        'Use the chart as a reflection tool, not as a substitute for choice or responsibility.',
        'Revisit the strongest placements when you need clarity on priorities and energy management.',
      ],
      disclaimers: [
        'Astrology is interpretive guidance and should not replace professional medical, legal, or financial advice.',
      ],
      metadata: {
        locale: input.locale,
        readingType: input.readingType,
        promptVersion: 'astrology-reading-v1',
        schemaVersion: '1',
      },
    },
  };
}
