import {
  AstroTime,
  Body,
  EclipticGeoMoon,
  EclipticLongitude,
  SiderealTime,
  SunPosition,
} from 'astronomy-engine';
import type {
  BirthDataInput,
  CalculatedAspect,
  CalculatedPosition,
  ChartComputationResult,
} from '@/lib/astrology/types';

export interface AstrologyEngine {
  readonly providerKey: string;
  calculateNatalChart(input: BirthDataInput): Promise<ChartComputationResult>;
}

/* ---------- constants ---------- */

const PLANET_BODIES = [
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

/** Standard major aspect definitions: [name, exactAngle, defaultOrb]. */
const ASPECT_DEFS: Array<[string, number, number]> = [
  ['conjunction', 0, 8],
  ['sextile', 60, 6],
  ['square', 90, 7],
  ['trine', 120, 8],
  ['opposition', 180, 8],
];

const MEAN_OBLIQUITY_DEG = 23.4393;

/* ---------- helpers ---------- */

function signForLongitude(lon: number): (typeof SIGNS)[number] {
  const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
  return SIGNS[idx];
}

/** Map internal body key to astronomy-engine Body enum. */
function bodyEnumForKey(key: string): Body | null {
  const map: Record<string, Body> = {
    mercury: Body.Mercury,
    venus: Body.Venus,
    mars: Body.Mars,
    jupiter: Body.Jupiter,
    saturn: Body.Saturn,
    uranus: Body.Uranus,
    neptune: Body.Neptune,
    pluto: Body.Pluto,
  };
  return map[key] ?? null;
}

/** Get ecliptic longitude in degrees [0..360) for a planet at the given time. */
function getPlanetLongitude(body: string, time: AstroTime): number {
  if (body === 'sun') {
    return SunPosition(time).elon;
  }
  if (body === 'moon') {
    return EclipticGeoMoon(time).lon;
  }
  const bodyEnum = bodyEnumForKey(body);
  if (!bodyEnum) throw new Error(`Unknown body: ${body}`);
  return EclipticLongitude(bodyEnum, time);
}

/** Determine retrograde by comparing ecliptic longitude one day later. */
function isRetrograde(body: string, time: AstroTime): boolean {
  if (body === 'sun' || body === 'moon') return false;
  const lon1 = getPlanetLongitude(body, time);
  const later = new AstroTime(new Date(time.date.getTime() + 86_400_000));
  const lon2 = getPlanetLongitude(body, later);
  let delta = lon2 - lon1;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

/** Compute Ascendant (ASC) from local sidereal time and geographic latitude.
 *  Uses the standard formula: ASC = atan2(-cos(RAMC), sin(ε)·tan(φ) + cos(ε)·sin(RAMC))
 */
function computeAscendant(lstDeg: number, latDeg: number, oblDeg: number): number {
  const oblRad = (oblDeg * Math.PI) / 180;
  const latRad = (latDeg * Math.PI) / 180;
  const lstRad = (lstDeg * Math.PI) / 180;
  let asc =
    (Math.atan2(
      -Math.cos(lstRad),
      Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(lstRad),
    ) *
      180) /
    Math.PI;
  if (asc < 0) asc += 360;
  return asc;
}

/** Compute Midheaven (MC). MC = atan2(sin(RAMC), cos(RAMC)·cos(ε)) */
function computeMidheaven(lstDeg: number, oblDeg: number): number {
  const oblRad = (oblDeg * Math.PI) / 180;
  const lstRad = (lstDeg * Math.PI) / 180;
  let mc = (Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(oblRad)) * 180) / Math.PI;
  if (mc < 0) mc += 360;
  return mc;
}

/** Equal-house cusp calculation: house N cusp = ASC + (N-1)*30.  Returns undefined houseNumber
 *  for any body if birth time is unknown. */
function houseForLongitude(lon: number, ascendant: number): number {
  const diff = (((lon - ascendant) % 360) + 360) % 360;
  return Math.floor(diff / 30) + 1;
}

/** Build aspects between the given positions using exact angular distances. */
function buildAspects(positions: CalculatedPosition[]): CalculatedAspect[] {
  const aspects: CalculatedAspect[] = [];

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i];
      const b = positions[j];
      let angDiff = Math.abs(a.degreeDecimal - b.degreeDecimal);
      if (angDiff > 180) angDiff = 360 - angDiff;

      for (const [aspectKey, exact, maxOrb] of ASPECT_DEFS) {
        const orb = Math.abs(angDiff - exact);
        if (orb <= maxOrb) {
          // "Applying" ≈ orb is still tightening. Simplified: applying if orb < maxOrb/2.
          const applying = orb < maxOrb / 2;
          aspects.push({
            bodyA: a.bodyKey,
            bodyB: b.bodyKey,
            aspectKey,
            orbDecimal: Number(orb.toFixed(4)),
            applying,
          });
          break; // Only the tightest aspect per pair
        }
      }
    }
  }

  return aspects;
}

/* ---------- engine ---------- */

class RealAstrologyEngine implements AstrologyEngine {
  readonly providerKey = 'astronomy-engine-v1';

  async calculateNatalChart(input: BirthDataInput): Promise<ChartComputationResult> {
    const warnings: string[] = [];

    // Build birth datetime in UTC
    const [year, month, day] = input.birthDate.split('-').map(Number);
    let utcDate: Date;

    if (input.birthTimeKnown && input.birthTime) {
      const [hour, minute] = input.birthTime.split(':').map(Number);
      // If timezone provided, attempt offset; otherwise treat as UTC
      utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
      if (input.timezone) {
        try {
          // Try Intl to resolve timezone offset
          const local = new Date(`${input.birthDate}T${input.birthTime}:00`);
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: input.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });
          // Calculate offset by formatting in that timezone
          const parts = formatter.formatToParts(local);
          const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
          const tzLocal = new Date(
            Date.UTC(
              get('year'),
              get('month') - 1,
              get('day'),
              get('hour'),
              get('minute'),
              get('second'),
            ),
          );
          const offsetMs = tzLocal.getTime() - local.getTime();
          utcDate = new Date(local.getTime() + offsetMs);
        } catch {
          warnings.push('Could not resolve timezone offset; birth time treated as UTC.');
        }
      }
    } else {
      // Unknown birth time → noon UTC as convention
      utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0));
      warnings.push(
        'Birth time is unknown. Houses, ascendant, and midheaven are omitted. Noon UTC is used for planetary positions.',
      );
    }

    const time = new AstroTime(utcDate);

    // Calculate planetary positions (ecliptic longitude)
    const positions: CalculatedPosition[] = [];

    for (const body of PLANET_BODIES) {
      const lon = getPlanetLongitude(body, time);
      const retro = isRetrograde(body, time);

      positions.push({
        bodyKey: body,
        signKey: signForLongitude(lon),
        degreeDecimal: Number(lon.toFixed(4)),
        retrograde: retro,
        houseNumber: undefined, // set below if birth time known + coords available
      });
    }

    // Calculate ASC / MC / houses if birth time known AND lat/lng available
    let ascendant: number | undefined;
    let midheaven: number | undefined;

    if (input.birthTimeKnown && input.latitude != null && input.longitude != null) {
      const gmst = SiderealTime(time); // hours
      const lstDeg = (gmst + input.longitude / 15) * 15; // local sidereal time in degrees

      ascendant = computeAscendant(lstDeg, input.latitude, MEAN_OBLIQUITY_DEG);
      midheaven = computeMidheaven(lstDeg, MEAN_OBLIQUITY_DEG);

      // Add ASC / MC as positions
      positions.push({
        bodyKey: 'ascendant',
        signKey: signForLongitude(ascendant),
        degreeDecimal: Number(ascendant.toFixed(4)),
        retrograde: false,
        houseNumber: 1,
      });
      positions.push({
        bodyKey: 'midheaven',
        signKey: signForLongitude(midheaven),
        degreeDecimal: Number(midheaven.toFixed(4)),
        retrograde: false,
        houseNumber: 10,
      });

      // Assign houses using Equal house system anchored at ASC
      for (const pos of positions) {
        if (pos.bodyKey !== 'ascendant' && pos.bodyKey !== 'midheaven') {
          pos.houseNumber = houseForLongitude(pos.degreeDecimal, ascendant);
        }
      }
    } else if (input.birthTimeKnown) {
      warnings.push(
        'Latitude/longitude not provided. Houses and angles cannot be calculated without coordinates.',
      );
    }

    // Calculate real aspects
    const aspects = buildAspects(positions);

    // Identify dominant signs and bodies
    const innerPlanets = positions.filter((p) =>
      ['sun', 'moon', 'mercury', 'venus', 'mars', 'ascendant'].includes(p.bodyKey),
    );
    const dominantSigns = [...new Set(innerPlanets.map((p) => p.signKey))].slice(0, 3);
    const dominantBodies = innerPlanets.slice(0, 3).map((p) => p.bodyKey);

    const computedChart = {
      personName: input.personName,
      birthDate: input.birthDate,
      birthTime: input.birthTimeKnown ? (input.birthTime ?? null) : null,
      birthTimeKnown: input.birthTimeKnown,
      location: {
        city: input.city,
        country: input.country,
        timezone: input.timezone ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
      houseSystem: input.houseSystem,
      dominantSigns,
      dominantBodies,
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
  return new RealAstrologyEngine();
}
