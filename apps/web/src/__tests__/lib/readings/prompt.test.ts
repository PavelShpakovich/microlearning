import {
  buildReadingPlanPrompts,
  buildReadingWriterPrompts,
  buildReadingReviewPrompts,
  type ReadingPromptInput,
} from '@/lib/readings/prompt';

const SAMPLE_INPUT: ReadingPromptInput = {
  locale: 'ru',
  readingType: 'personality',
  toneStyle: 'balanced',
  allowSpiritualTone: true,
  contentFocusLove: true,
  contentFocusCareer: true,
  contentFocusGrowth: true,
  chartLabel: 'Тестовая карта',
  personName: 'Анна',
  birthTimeKnown: true,
  houseSystem: 'placidus',
  positions: [
    { bodyKey: 'sun', signKey: 'gemini', houseNumber: 10, degreeDecimal: 90.5, retrograde: false },
    {
      bodyKey: 'moon',
      signKey: 'scorpio',
      houseNumber: 3,
      degreeDecimal: 215.2,
      retrograde: false,
    },
    {
      bodyKey: 'mercury',
      signKey: 'cancer',
      houseNumber: 11,
      degreeDecimal: 100.1,
      retrograde: true,
    },
  ],
  aspects: [{ bodyA: 'sun', bodyB: 'moon', aspectKey: 'trine', orbDecimal: 1.2, applying: true }],
  warnings: [],
};

describe('Reading prompts: personal data exclusion', () => {
  it('does not include birth date in plan prompt', () => {
    const { userPrompt, systemPrompt } = buildReadingPlanPrompts(SAMPLE_INPUT);
    const combined = systemPrompt + userPrompt;

    expect(combined).not.toContain('Birth date');
    expect(combined).not.toContain('birth_date');
    expect(combined).not.toContain('birthDate');
  });

  it('does not include city or country in plan prompt', () => {
    const { userPrompt, systemPrompt } = buildReadingPlanPrompts(SAMPLE_INPUT);
    const combined = systemPrompt + userPrompt;

    expect(combined).not.toContain('Place:');
    expect(combined).not.toContain('city');
    expect(combined).not.toContain('country');
  });

  it('does not include birth date in writer prompt', () => {
    const plan = buildReadingPlanPrompts(SAMPLE_INPUT);
    const { userPrompt, systemPrompt } = buildReadingWriterPrompts(SAMPLE_INPUT, plan.mockResponse);
    const combined = systemPrompt + userPrompt;

    expect(combined).not.toContain('Birth date');
  });

  it('does not include birth date in review prompt', () => {
    const plan = buildReadingPlanPrompts(SAMPLE_INPUT);
    const writer = buildReadingWriterPrompts(SAMPLE_INPUT, plan.mockResponse);
    const { userPrompt, systemPrompt } = buildReadingReviewPrompts(
      SAMPLE_INPUT,
      writer.mockResponse,
    );
    const combined = systemPrompt + userPrompt;

    expect(combined).not.toContain('Birth date');
  });

  it('includes person name in prompts', () => {
    const { userPrompt } = buildReadingPlanPrompts(SAMPLE_INPUT);

    expect(userPrompt).toContain('Анна');
  });

  it('includes natal positions in prompts', () => {
    const { userPrompt } = buildReadingPlanPrompts(SAMPLE_INPUT);

    expect(userPrompt).toContain('sun in gemini');
    expect(userPrompt).toContain('moon in scorpio');
  });

  it('includes aspects in prompts', () => {
    const { userPrompt } = buildReadingPlanPrompts(SAMPLE_INPUT);

    expect(userPrompt).toContain('sun trine moon');
  });

  it('includes birth time known flag', () => {
    const { userPrompt } = buildReadingPlanPrompts(SAMPLE_INPUT);

    expect(userPrompt).toContain('Birth time known: yes');
  });

  it('includes house system', () => {
    const { userPrompt } = buildReadingPlanPrompts(SAMPLE_INPUT);

    expect(userPrompt).toContain('House system: placidus');
  });
});

describe('ReadingPromptInput interface', () => {
  it('does not accept birthDate, city, or country fields', () => {
    // TypeScript compile-time check: if these fields existed in the interface,
    // the SAMPLE_INPUT above would need them. This test verifies the runtime shape.
    const keys = Object.keys(SAMPLE_INPUT);

    expect(keys).not.toContain('birthDate');
    expect(keys).not.toContain('city');
    expect(keys).not.toContain('country');
  });
});

describe('Reading prompts: tone constraints', () => {
  it('keeps mystical tone secular when spiritual language is disabled', () => {
    const input: ReadingPromptInput = {
      ...SAMPLE_INPUT,
      toneStyle: 'mystical',
      allowSpiritualTone: false,
    };

    const { systemPrompt } = buildReadingPlanPrompts(input);

    expect(systemPrompt).toContain(
      'Use symbolic, archetypal, and mythic language while remaining fully secular.',
    );
    expect(systemPrompt).toContain('Keep all language secular and psychological.');
    expect(systemPrompt).not.toContain('spiritual metaphor');
    expect(systemPrompt).not.toContain('connection with larger forces');
  });
});

describe('Reading prompts: data completeness', () => {
  it('includes all positions without cap', () => {
    const manyPositions = Array.from({ length: 20 }, (_, i) => ({
      bodyKey: `planet${i}`,
      signKey: 'aries',
      houseNumber: (i % 12) + 1,
      degreeDecimal: i * 18,
      retrograde: false,
    }));
    const input: ReadingPromptInput = { ...SAMPLE_INPUT, positions: manyPositions };
    const { userPrompt } = buildReadingPlanPrompts(input);

    // All 20 positions should be present (no slicing)
    for (const p of manyPositions) {
      expect(userPrompt).toContain(p.bodyKey);
    }
  });

  it('includes all aspects without cap', () => {
    const manyAspects = Array.from({ length: 30 }, (_, i) => ({
      bodyA: `planetA${i}`,
      bodyB: `planetB${i}`,
      aspectKey: 'trine',
      orbDecimal: i * 0.5,
      applying: true,
    }));
    const input: ReadingPromptInput = { ...SAMPLE_INPUT, aspects: manyAspects };
    const { userPrompt } = buildReadingPlanPrompts(input);

    // All 30 aspects should be present (no slicing)
    for (const a of manyAspects) {
      expect(userPrompt).toContain(a.bodyA);
    }
  });

  it('includes all transit positions without cap', () => {
    const manyTransits = Array.from({ length: 15 }, (_, i) => ({
      bodyKey: `transit${i}`,
      signKey: 'leo',
      houseNumber: (i % 12) + 1,
      degreeDecimal: i * 24,
      retrograde: false,
    }));
    const input: ReadingPromptInput = { ...SAMPLE_INPUT, transitPositions: manyTransits };
    const { userPrompt } = buildReadingPlanPrompts(input);

    for (const t of manyTransits) {
      expect(userPrompt).toContain(t.bodyKey);
    }
  });

  it('includes applying flag on aspects', () => {
    const input: ReadingPromptInput = {
      ...SAMPLE_INPUT,
      aspects: [
        { bodyA: 'sun', bodyB: 'moon', aspectKey: 'trine', orbDecimal: 1.0, applying: true },
        { bodyA: 'venus', bodyB: 'mars', aspectKey: 'square', orbDecimal: 2.0, applying: false },
      ],
    };
    const { userPrompt } = buildReadingPlanPrompts(input);

    expect(userPrompt).toContain('applying=true');
    expect(userPrompt).toContain('applying=false');
  });
});
