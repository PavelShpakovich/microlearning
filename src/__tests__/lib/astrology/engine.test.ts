/**
 * Tests for the real astrology calculation engine.
 *
 * Uses a fixed birth date/time/location (Minsk, 1990-06-21 14:00 UTC+3) to
 * assert deterministic, astronomically-correct output.
 */
import { calculateNatalChart, getAstrologyEngine } from '@/lib/astrology/engine';
import type { BirthDataInput } from '@/lib/astrology/types';

// ── fixtures ────────────────────────────────────────────────────────────────

/** Summer Solstice 1990, Minsk. Sun should be in Gemini (late) / early Cancer.
 *  Birth time 11:00 UTC (14:00 Minsk, UTC+3). */
const MINSK_INPUT: BirthDataInput = {
  personName: 'Test User',
  label: 'Test Chart',
  birthDate: '1990-06-21',
  birthTime: '11:00', // UTC
  birthTimeKnown: true,
  city: 'Минск',
  country: 'Беларусь',
  latitude: 53.9045,
  longitude: 27.5615,
  timezone: 'Europe/Minsk',
  houseSystem: 'placidus',
  subjectType: 'self',
};

/** No birth time variant — houses and angles must be absent. */
const MINSK_NO_TIME: BirthDataInput = {
  ...MINSK_INPUT,
  birthTime: undefined,
  birthTimeKnown: false,
};

/** No coordinates variant — houses absent even with known time. */
const MINSK_NO_COORDS: BirthDataInput = {
  ...MINSK_INPUT,
  latitude: undefined,
  longitude: undefined,
};

// ── engine factory ───────────────────────────────────────────────────────────

describe('getAstrologyEngine', () => {
  it('returns an engine with the correct providerKey', async () => {
    const engine = await getAstrologyEngine();
    expect(engine.providerKey).toBe('astronomy-engine-v1');
  });
});

// ── full chart calculation ───────────────────────────────────────────────────

describe('calculateNatalChart', () => {
  let result: Awaited<ReturnType<typeof calculateNatalChart>>;

  beforeAll(async () => {
    result = await calculateNatalChart(MINSK_INPUT);
  });

  it('returns the correct provider key', () => {
    expect(result.provider).toBe('astronomy-engine-v1');
  });

  it('returns snapshotVersion 1', () => {
    expect(result.snapshotVersion).toBe(1);
  });

  it('returns exactly 12 positions (10 planets + ASC + MC)', () => {
    expect(result.positions).toHaveLength(12);
  });

  it('includes all 10 standard planets', () => {
    const bodies = result.positions.map((p) => p.bodyKey);
    for (const planet of [
      'sun',
      'moon',
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'pluto',
    ]) {
      expect(bodies).toContain(planet);
    }
  });

  it('includes ascendant and midheaven when coords + time are known', () => {
    const bodies = result.positions.map((p) => p.bodyKey);
    expect(bodies).toContain('ascendant');
    expect(bodies).toContain('midheaven');
  });

  it('places Sun in Gemini or Cancer on summer solstice 1990', () => {
    const sun = result.positions.find((p) => p.bodyKey === 'sun')!;
    expect(['gemini', 'cancer']).toContain(sun.signKey);
  });

  it('all positions have degreeDecimal between 0 and 360', () => {
    for (const pos of result.positions) {
      expect(pos.degreeDecimal).toBeGreaterThanOrEqual(0);
      expect(pos.degreeDecimal).toBeLessThan(360);
    }
  });

  it('all positions have a valid sign key', () => {
    const signs = [
      'aries',
      'taurus',
      'gemini',
      'cancer',
      'leo',
      'virgo',
      'libra',
      'scorpio',
      'sagittarius',
      'capricorn',
      'aquarius',
      'pisces',
    ];
    for (const pos of result.positions) {
      expect(signs).toContain(pos.signKey);
    }
  });

  it('assigns house numbers (1–12) to non-angle positions', () => {
    const planets = result.positions.filter((p) => !['ascendant', 'midheaven'].includes(p.bodyKey));
    for (const pos of planets) {
      expect(pos.houseNumber).toBeGreaterThanOrEqual(1);
      expect(pos.houseNumber).toBeLessThanOrEqual(12);
    }
  });

  it('ascendant has houseNumber 1', () => {
    const asc = result.positions.find((p) => p.bodyKey === 'ascendant')!;
    expect(asc.houseNumber).toBe(1);
  });

  it('midheaven has houseNumber 10', () => {
    const mc = result.positions.find((p) => p.bodyKey === 'midheaven')!;
    expect(mc.houseNumber).toBe(10);
  });

  it('Sun and Moon are never retrograde', () => {
    const sun = result.positions.find((p) => p.bodyKey === 'sun')!;
    const moon = result.positions.find((p) => p.bodyKey === 'moon')!;
    expect(sun.retrograde).toBe(false);
    expect(moon.retrograde).toBe(false);
  });

  it('produces at least one aspect', () => {
    expect(result.aspects.length).toBeGreaterThan(0);
  });

  it('all aspects reference valid body keys', () => {
    const validBodies = result.positions.map((p) => p.bodyKey);
    for (const asp of result.aspects) {
      expect(validBodies).toContain(asp.bodyA);
      expect(validBodies).toContain(asp.bodyB);
    }
  });

  it('all aspects have valid aspect key', () => {
    const validKeys = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];
    for (const asp of result.aspects) {
      expect(validKeys).toContain(asp.aspectKey);
    }
  });

  it('all aspect orbs are within allowed maximums', () => {
    const maxOrbs: Record<string, number> = {
      conjunction: 8,
      sextile: 6,
      square: 7,
      trine: 8,
      opposition: 8,
    };
    for (const asp of result.aspects) {
      expect(asp.orbDecimal).toBeLessThanOrEqual(maxOrbs[asp.aspectKey]);
    }
  });

  it('no aspect body pair appears more than once', () => {
    const seen = new Set<string>();
    for (const asp of result.aspects) {
      const key = [asp.bodyA, asp.bodyB].sort().join('|');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('has no warnings for a complete input', () => {
    expect(result.warnings).toHaveLength(0);
  });

  it('computedChart preserves personName and birthDate', () => {
    expect(result.computedChart.personName).toBe('Test User');
    expect(result.computedChart.birthDate).toBe('1990-06-21');
  });
});

// ── unknown birth time ───────────────────────────────────────────────────────

describe('calculateNatalChart — unknown birth time', () => {
  let result: Awaited<ReturnType<typeof calculateNatalChart>>;

  beforeAll(async () => {
    result = await calculateNatalChart(MINSK_NO_TIME);
  });

  it('returns exactly 10 positions (no angles)', () => {
    expect(result.positions).toHaveLength(10);
  });

  it('does not include ascendant or midheaven', () => {
    const bodies = result.positions.map((p) => p.bodyKey);
    expect(bodies).not.toContain('ascendant');
    expect(bodies).not.toContain('midheaven');
  });

  it('all planet houseNumbers are undefined', () => {
    for (const pos of result.positions) {
      expect(pos.houseNumber).toBeUndefined();
    }
  });

  it('adds a noon-UTC warning', () => {
    expect(result.warnings.some((w) => w.includes('Birth time is unknown'))).toBe(true);
  });
});

// ── missing coordinates ──────────────────────────────────────────────────────

describe('calculateNatalChart — known time but no coordinates', () => {
  let result: Awaited<ReturnType<typeof calculateNatalChart>>;

  beforeAll(async () => {
    result = await calculateNatalChart(MINSK_NO_COORDS);
  });

  it('returns exactly 10 positions (no angles)', () => {
    expect(result.positions).toHaveLength(10);
  });

  it('warns about missing coordinates', () => {
    expect(
      result.warnings.some(
        (w) => w.toLowerCase().includes('latitude') || w.toLowerCase().includes('coordinates'),
      ),
    ).toBe(true);
  });
});

// ── determinism ──────────────────────────────────────────────────────────────

describe('calculateNatalChart determinism', () => {
  it('returns identical results when called twice with the same input', async () => {
    const [r1, r2] = await Promise.all([
      calculateNatalChart(MINSK_INPUT),
      calculateNatalChart(MINSK_INPUT),
    ]);
    expect(r1.positions.map((p) => p.degreeDecimal)).toEqual(
      r2.positions.map((p) => p.degreeDecimal),
    );
    expect(r1.aspects).toEqual(r2.aspects);
  });
});
