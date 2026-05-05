export const ASTROLOGY_SUPPORTED_LOCALES = ['ru', 'en'] as const;

export const HOUSE_SYSTEMS = [
  'placidus',
  'koch',
  'equal',
  'whole_sign',
  'porphyry',
  'regiomontanus',
  'campanus',
] as const;

export type HouseSystem = (typeof HOUSE_SYSTEMS)[number];

const HOUSE_SYSTEM_SET: ReadonlySet<string> = new Set(HOUSE_SYSTEMS);

export function normalizeHouseSystem(value?: string | null): HouseSystem {
  if (value && HOUSE_SYSTEM_SET.has(value)) return value as HouseSystem;
  return 'placidus';
}

/** Map our DB/internal house system key to celestine's expected string. */
export function toCelestineHouseSystem(
  hs: HouseSystem,
): 'placidus' | 'koch' | 'equal' | 'whole-sign' | 'porphyry' | 'regiomontanus' | 'campanus' {
  if (hs === 'whole_sign') return 'whole-sign';
  return hs;
}

export const CHART_SUBJECT_TYPES = ['self', 'partner', 'child', 'client', 'other'] as const;

export const CHART_STATUSES = ['pending', 'ready', 'error'] as const;

export const READING_TYPES = [
  'natal_overview',
  'personality',
  'love',
  'career',
  'strengths',
  'transit',
] as const;

export const READING_STATUSES = ['pending', 'generating', 'ready', 'error'] as const;

export const FOLLOW_UP_ROLES = ['user', 'assistant', 'system'] as const;

/** Max follow-up questions a user can ask per reading thread. */
export const FOLLOW_UP_LIMIT = 5;

export const TONE_STYLES = ['balanced', 'mystical', 'therapeutic', 'analytical'] as const;
