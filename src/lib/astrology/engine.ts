import type { BirthDataInput, ChartComputationResult } from '@/lib/astrology/types';

export interface AstrologyEngine {
  readonly providerKey: string;
  calculateNatalChart(input: BirthDataInput): Promise<ChartComputationResult>;
}

const BODIES = [
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
  'ascendant',
  'midheaven',
] as const;

const SIGNS = [
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
] as const;

const ASPECTS = ['conjunction', 'sextile', 'square', 'trine', 'opposition'] as const;

function buildSeed(input: BirthDataInput): number {
  const raw = [
    input.personName,
    input.birthDate,
    input.birthTimeKnown ? input.birthTime ?? '00:00' : 'unknown-time',
    input.city,
    input.country,
    input.houseSystem,
  ].join('|');

  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = (hash * 31 + raw.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function decimalDegree(seed: number, offset: number): number {
  const value = ((seed + offset * 137) % 3000) / 100;
  return Number(value.toFixed(4));
}

function signForDegree(degreeDecimal: number): (typeof SIGNS)[number] {
  const signIndex = Math.floor(degreeDecimal / 2.5) % SIGNS.length;
  return SIGNS[signIndex];
}

function houseForBody(index: number, birthTimeKnown: boolean): number | undefined {
  if (!birthTimeKnown && index >= 10) {
    return undefined;
  }
  return (index % 12) + 1;
}

class DeterministicMockAstrologyEngine implements AstrologyEngine {
  readonly providerKey = 'deterministic-mock-v1';

  async calculateNatalChart(input: BirthDataInput): Promise<ChartComputationResult> {
    const seed = buildSeed(input);

    const warnings = input.birthTimeKnown
      ? []
      : [
          'Birth time is unknown. Houses, ascendant, and midheaven should be treated as limited or approximate.',
        ];

    const positions = BODIES.filter(
      (body) => input.birthTimeKnown || (body !== 'ascendant' && body !== 'midheaven'),
    ).map((body, index) => {
      const degree = decimalDegree(seed, index + 1);
      return {
        bodyKey: body,
        signKey: signForDegree(degree),
        houseNumber: houseForBody(index, input.birthTimeKnown),
        degreeDecimal: degree,
        retrograde: body !== 'sun' && body !== 'moon' && ((seed + index) % 3 === 0),
      };
    });

    const aspects = positions.slice(0, 5).map((position, index) => {
      const counterpart = positions[(index + 3) % positions.length];
      return {
        bodyA: position.bodyKey,
        bodyB: counterpart.bodyKey,
        aspectKey: ASPECTS[(seed + index) % ASPECTS.length],
        orbDecimal: Number((((seed % 70) + index * 9) / 10).toFixed(4)),
        applying: ((seed + index) % 2) === 0,
      };
    });

    const computedChart = {
      personName: input.personName,
      birthDate: input.birthDate,
      birthTime: input.birthTimeKnown ? input.birthTime ?? null : null,
      birthTimeKnown: input.birthTimeKnown,
      location: {
        city: input.city,
        country: input.country,
        timezone: input.timezone ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
      houseSystem: input.houseSystem,
      dominantSigns: positions.slice(0, 3).map((position) => position.signKey),
      dominantBodies: positions.slice(0, 3).map((position) => position.bodyKey),
      warnings,
    };

    return {
      provider: this.providerKey,
      snapshotVersion: 1,
      computedChart,
      warnings,
      positions,
      aspects,
    };
  }
}

export async function calculateNatalChart(input: BirthDataInput): Promise<ChartComputationResult> {
  const engine = await getAstrologyEngine();
  return engine.calculateNatalChart(input);
}

export async function getAstrologyEngine(): Promise<AstrologyEngine> {
  return new DeterministicMockAstrologyEngine();
}
