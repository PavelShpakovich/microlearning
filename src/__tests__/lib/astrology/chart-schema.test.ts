import {
  chartCreateSchema,
  birthLocationSchema,
  userPreferencesSchema,
} from '@/lib/astrology/chart-schema';

// ── birthLocationSchema ───────────────────────────────────────────────────────

describe('birthLocationSchema', () => {
  it('accepts a minimal valid location', () => {
    const result = birthLocationSchema.safeParse({ city: 'Минск', country: 'Беларусь' });
    expect(result.success).toBe(true);
  });

  it('accepts a full location with coordinates and timezone', () => {
    const result = birthLocationSchema.safeParse({
      city: 'Минск',
      country: 'Беларусь',
      latitude: 53.9045,
      longitude: 27.5615,
      timezone: 'Europe/Minsk',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty city', () => {
    const result = birthLocationSchema.safeParse({ city: '', country: 'BY' });
    expect(result.success).toBe(false);
  });

  it('rejects latitude out of range', () => {
    const result = birthLocationSchema.safeParse({ city: 'X', country: 'Y', latitude: 99 });
    expect(result.success).toBe(false);
  });

  it('rejects longitude out of range', () => {
    const result = birthLocationSchema.safeParse({ city: 'X', country: 'Y', longitude: -200 });
    expect(result.success).toBe(false);
  });
});

// ── chartCreateSchema ─────────────────────────────────────────────────────────

const VALID_CHART = {
  label: 'Моя карта',
  personName: 'Иван Иванов',
  subjectType: 'self',
  birthDate: '1990-06-21',
  birthTime: '14:30',
  birthTimeKnown: true,
  houseSystem: 'placidus',
  city: 'Минск',
  country: 'Беларусь',
  locale: 'ru',
};

describe('chartCreateSchema', () => {
  it('accepts a fully valid chart input', () => {
    const result = chartCreateSchema.safeParse(VALID_CHART);
    expect(result.success).toBe(true);
  });

  it('requires birthTime when birthTimeKnown is true', () => {
    const result = chartCreateSchema.safeParse({ ...VALID_CHART, birthTime: undefined });
    expect(result.success).toBe(false);
  });

  it('rejects birthTime when birthTimeKnown is false', () => {
    const result = chartCreateSchema.safeParse({
      ...VALID_CHART,
      birthTimeKnown: false,
      birthTime: '14:30', // should be omitted
    });
    expect(result.success).toBe(false);
  });

  it('accepts a chart without birthTime when birthTimeKnown is false', () => {
    const result = chartCreateSchema.safeParse({
      ...VALID_CHART,
      birthTimeKnown: false,
      birthTime: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid birthDate format', () => {
    const result = chartCreateSchema.safeParse({ ...VALID_CHART, birthDate: '21-06-1990' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid birthTime format', () => {
    const result = chartCreateSchema.safeParse({ ...VALID_CHART, birthTime: '25:00' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid houseSystem', () => {
    const result = chartCreateSchema.safeParse({ ...VALID_CHART, houseSystem: 'regiomontanus' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid subjectType', () => {
    const result = chartCreateSchema.safeParse({ ...VALID_CHART, subjectType: 'robot' });
    expect(result.success).toBe(false);
  });

  it('rejects a label exceeding 120 characters', () => {
    const result = chartCreateSchema.safeParse({ ...VALID_CHART, label: 'x'.repeat(121) });
    expect(result.success).toBe(false);
  });

  it('rejects notes exceeding 500 characters', () => {
    const result = chartCreateSchema.safeParse({ ...VALID_CHART, notes: 'n'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('defaults houseSystem to placidus when omitted', () => {
    const input = { ...VALID_CHART };
    delete (input as Partial<typeof VALID_CHART>).houseSystem;
    const result = chartCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.houseSystem).toBe('placidus');
    }
  });
});

// ── userPreferencesSchema ─────────────────────────────────────────────────────

describe('userPreferencesSchema', () => {
  it('accepts a valid preferences object', () => {
    const result = userPreferencesSchema.safeParse({
      toneStyle: 'balanced',
      contentFocusLove: true,
      contentFocusCareer: false,
      contentFocusGrowth: true,
      allowSpiritualTone: false,
    });
    expect(result.success).toBe(true);
  });

  it('uses defaults when no input is provided', () => {
    const result = userPreferencesSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.toneStyle).toBe('balanced');
      expect(result.data.contentFocusLove).toBe(true);
    }
  });

  it('rejects an invalid toneStyle', () => {
    const result = userPreferencesSchema.safeParse({ toneStyle: 'dramatic' });
    expect(result.success).toBe(false);
  });
});
