export const ASTROLOGY_SUPPORTED_LOCALES = ['en', 'ru'] as const;

export const HOUSE_SYSTEMS = ['placidus', 'whole_sign', 'koch', 'equal'] as const;

export const CHART_SUBJECT_TYPES = ['self', 'partner', 'child', 'client', 'other'] as const;

export const CHART_STATUSES = ['pending', 'ready', 'error'] as const;

export const READING_TYPES = [
  'natal_overview',
  'personality',
  'love',
  'career',
  'strengths',
  'finance',
  'health',
  'transit',
  'compatibility',
] as const;

export const READING_STATUSES = ['pending', 'generating', 'ready', 'error'] as const;

export const FOLLOW_UP_ROLES = ['user', 'assistant', 'system'] as const;

export const FORECAST_TYPES = ['daily', 'weekly', 'monthly', 'custom'] as const;

export const TONE_STYLES = ['balanced', 'mystical', 'therapeutic', 'analytical'] as const;
