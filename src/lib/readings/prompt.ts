import type { AstrologyLocale, ReadingType, ToneStyle } from '@/lib/astrology/types';
import type { ReadingPlanOutput } from '@/lib/readings/plan-schema';
import type { StructuredReadingOutput } from '@/lib/readings/report-schema';

const READING_PIPELINE_VERSION = 'astrology-reading-pipeline-v1';

export interface ReadingPromptInput {
  locale: AstrologyLocale;
  readingType: ReadingType;
  toneStyle: ToneStyle;
  allowSpiritualTone: boolean;
  contentFocusLove: boolean;
  contentFocusCareer: boolean;
  contentFocusGrowth: boolean;
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
  /** Current planetary positions for transit readings */
  transitPositions?: Array<{
    bodyKey: string;
    signKey: string;
    houseNumber: number | null;
    degreeDecimal: number;
    retrograde: boolean;
  }>;
}

export function stableReadingTitle(
  readingType: ReadingType,
  chartLabel: string,
  locale = 'ru',
): string {
  if (locale === 'ru') {
    switch (readingType) {
      case 'personality':
        return `${chartLabel} — Личность`;
      case 'love':
        return `${chartLabel} — Любовь и отношения`;
      case 'career':
        return `${chartLabel} — Карьера`;
      case 'strengths':
        return `${chartLabel} — Сильные стороны`;
      case 'transit':
        return `${chartLabel} — Текущие транзиты`;
      default:
        return `${chartLabel} — Натальный обзор`;
    }
  }

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
      return `${chartLabel} Current Transits`;
    default:
      return `${chartLabel} Natal Overview`;
  }
}

function buildStyleInstructions(input: ReadingPromptInput): string {
  const lines: string[] = [];

  // Tone style — tell the LLM exactly what writing style to adopt
  switch (input.toneStyle) {
    case 'mystical':
      lines.push(
        'Writing tone: Use symbolic, archetypal, and mythic language. Draw on cosmic patterns, spiritual metaphor, and a sense of meaning and mystery. Invite the reader into a feeling of connection with larger forces.',
      );
      break;
    case 'therapeutic':
      lines.push(
        'Writing tone: Center emotional understanding, self-compassion, and psychological healing. Use reflective, gentle, validating language. Focus on inner patterns and self-awareness rather than prediction or certainty.',
      );
      break;
    case 'analytical':
      lines.push(
        'Writing tone: Be precise, structured, and factual. Explain the mechanics of each placement clearly. Minimize poetic language and maximize specificity about signs, houses, aspects, and their interactions.',
      );
      break;
    default:
      lines.push(
        'Writing tone: Warm, measured, and psychologically grounded. Blend insight with practical advice. Allow poetic touches but never sacrifice clarity for vagueness.',
      );
  }

  // Spiritual language gate
  if (!input.allowSpiritualTone) {
    lines.push(
      'Language constraint: Keep all language secular and psychological. Do NOT use spiritual, religious, or new-age terms (e.g. "soul", "karma", "higher self", "cosmic", "universe guides you", "spiritual path", "destiny"). Frame everything in terms of psychology, personality, and lived experience.',
    );
  }

  // Focus areas — only add instruction when not all three are equally active
  const activeAreas: string[] = [];
  if (input.contentFocusLove) activeAreas.push('love and relationships');
  if (input.contentFocusCareer) activeAreas.push('career and professional life');
  if (input.contentFocusGrowth) activeAreas.push('personal growth and self-development');

  if (activeAreas.length > 0 && activeAreas.length < 3) {
    lines.push(
      `Focus emphasis: The user has explicitly requested emphasis on ${activeAreas.join(' and ')}. Weave these themes prominently throughout the reading. Sections that are not directly about these areas should still connect back to how they relate.`,
    );
  } else if (activeAreas.length === 0) {
    lines.push('Focus: Provide a balanced overview without emphasis on any particular life area.');
  }

  return lines.join('\n');
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

  let transitBlock = '';
  if (input.transitPositions && input.transitPositions.length > 0) {
    const transitLines = input.transitPositions
      .slice(0, 12)
      .map(
        (p) =>
          `- ${p.bodyKey} in ${p.signKey}, house ${p.houseNumber ?? 'unknown'}, ${p.degreeDecimal.toFixed(2)}°, retrograde=${p.retrograde}`,
      )
      .join('\n');
    transitBlock = `\n\nCurrent sky (transiting positions as of today):\n${transitLines}`;
  }

  return `Chart:\n- Label: ${input.chartLabel}\n- Person: ${input.personName}\n- Birth date: ${input.birthDate}\n- Birth time known: ${input.birthTimeKnown ? 'yes' : 'no'}\n- Place: ${input.city}, ${input.country}\n- House system: ${input.houseSystem}\n\nNatal positions:\n${positionsBlock}\n\nAspects:\n${aspectsBlock}\n\nWarnings:\n${warningsBlock}${transitBlock}`;
}

export function buildReadingPlanPrompts(input: ReadingPromptInput): {
  systemPrompt: string;
  userPrompt: string;
  mockResponse: ReadingPlanOutput;
} {
  const language = input.locale === 'ru' ? 'Russian' : 'English';
  const title = stableReadingTitle(input.readingType, input.chartLabel, input.locale);

  const styleInstructions = buildStyleInstructions(input);

  const langDirective =
    input.locale === 'ru'
      ? 'КРИТИЧЕСКИ ВАЖНО: Весь JSON-ответ — каждое строковое поле — ОБЯЗАТЕЛЬНО должен быть написан на русском языке. Использование английского языка в любом поле недопустимо.'
      : 'CRITICAL: Every string field in the JSON response MUST be written in English.';

  const systemPrompt = `${langDirective}

You are an expert astrology analysis planner working for a professional astrology service.
You must interpret only the supplied chart data and produce a structured, in-depth plan for an astrology reading.
Do not mention being an AI.
Do not give medical, legal, financial, or fatalistic certainty.

${styleInstructions}

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
    "readingType": "natal_overview" | "personality" | "love" | "career" | "strengths" | "finance" | "health" | "transit" | "year_ahead" | "progressions",
    "promptVersion": string,
    "schemaVersion": string
  }
}
Requirements:
- Write in ${language}. Every field must be in ${language} — no exceptions.
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
- finance: Sections should cover (1) natural relationship with money and resources (2nd house/ruler/Venus), (2) earning potential and financial style (Jupiter/8th house), (3) spending and security patterns (Moon/Saturn), (4) financial risks and shadow patterns (squares/Neptune/12th house), (5) practical steps toward financial stability grounded in the chart.
- health: Sections should cover (1) overall vitality and life force (Sun/1st house/Ascendant), (2) emotional and nervous-system health (Moon/Mercury/stress aspects), (3) physical constitution and areas of sensitivity (Mars/6th house/Virgo placements), (4) long-term wellbeing and chronic tendencies (Saturn/Chiron/8th house), (5) holistic practices and self-care approaches aligned with the chart. Note: frame all health content as tendencies and self-awareness, NOT medical diagnosis. Always include strong medical-disclaimer language.
- transit: If current sky positions are provided, this is a transit reading — show how today's planetary sky interacts with the natal chart. Sections should cover (1) overview of the most significant active transits (outer planets aspecting natal luminaries), (2) current Saturn and Jupiter transits and their life-area themes, (3) shorter-cycle transits affecting relationships and daily life (Venus/Mars transiting natal angles), (4) inner growth themes and awareness called for right now (Pluto/Neptune/Uranus long transits), (5) practical guidance for navigating the current period. Reference specific transit-to-natal aspects with orbs. If no transit positions are provided, write a general chart-based reading of current life themes.
- year_ahead: A 12-month personal forecast combining natal chart themes with active transits. Sections should cover (1) the overarching theme and dominant energy of the coming year (major outer planet transits to natal Sun/Moon/ASC), (2) opportunities and expansion zones (Jupiter transits and harmonious aspects), (3) challenges, responsibilities, and karmic lessons (Saturn transits and hard aspects), (4) relationship and personal life rhythms over the year (Venus, Mars, and inner planet transits by season), (5) a month-by-month or quarter-by-quarter practical roadmap with concrete guidance on timing and focus areas.
- progressions: A secondary progressions reading based on the progressed chart positions (1 day = 1 year after birth). Sections should cover (1) the progressed Sun — its current sign and house, what ego evolution and new identity themes are unfolding now, (2) the progressed Moon — current sign, house, and emotional atmosphere, what inner work is highlighted, (3) key progressed aspects between progressed and natal planets — their life-event and psychological themes, (4) the overall progressed chart narrative — what chapter of life this period represents compared to the natal blueprint, (5) practical guidance for consciously working with the progressed energy.
`;

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

  const styleInstructions = buildStyleInstructions(input);

  const langDirective =
    input.locale === 'ru'
      ? 'КРИТИЧЕСКИ ВАЖНО: Весь JSON-ответ — каждое строковое поле — ОБЯЗАТЕЛЬНО должен быть написан на русском языке. Никаких английских слов или фраз в тексте быть не должно.'
      : 'CRITICAL: Every string field in the JSON response MUST be written in English.';

  const systemPrompt = `${langDirective}

You are a professional astrology writer producing a rich, insightful, and deeply personal reading for a real user.
Your writing must follow the approved plan while expanding every section into substantial, meaningful prose tied to the actual chart data.
Do not mention being an AI.
Do not give medical, legal, financial, or fatalistic certainty.

${styleInstructions}

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
    "readingType": "natal_overview" | "personality" | "love" | "career" | "strengths" | "finance" | "health" | "transit" | "year_ahead" | "progressions",
    "promptVersion": string,
    "schemaVersion": string
  }
}
Requirements:
- Write in ${language}. Every field must be in ${language} — no exceptions.
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
- Do NOT write hollow filler sentences. Every sentence must add meaning derived from the chart.
- Each section MUST reference at least 3 specific placements or aspects from the provided chart data by name (planet + sign + house). Generic statements that could apply to any chart are prohibited.`;

  const transitNote =
    input.readingType === 'transit' && input.transitPositions
      ? ' Use the current sky positions provided to identify active transit-to-natal aspects and ground each section in what is happening NOW.'
      : '';

  const userPrompt = `Write a full ${input.readingType} astrology reading for ${input.personName}.${transitNote} This reading will be delivered to the client — make it rich, personal, and substantive. Each section must be 350–500 words minimum.

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
  const reviewLangDirective =
    input.locale === 'ru'
      ? 'КРИТИЧЕСКИ ВАЖНО: Весь отредактированный JSON-ответ ОБЯЗАТЕЛЬНО должен быть написан на русском языке. Если в черновике встречаются английские слова или фразы — замени их на русские.'
      : 'CRITICAL: The entire edited JSON response MUST be in English.';

  const systemPrompt = `${reviewLangDirective}

You are a senior astrology reading editor at a professional astrology service.
Your job is to improve clarity, depth, grounding, and safety without changing the intended meaning.
Return only valid JSON in exactly the same schema as the draft.
Review goals:
- Remove overclaiming and fatalistic wording ("you will", "you must")
- Remove vague platitudes not tied to the chart — replace them with chart-specific insight
- Ensure every section has at least 350 words of meaningful content; if too short, expand with relevant chart analysis
- Check that each section names at least 3 specific planets, signs, and houses from the provided chart data; add specific references if missing
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
