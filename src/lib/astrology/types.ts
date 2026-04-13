import type {
  ASTROLOGY_SUPPORTED_LOCALES,
  CHART_STATUSES,
  CHART_SUBJECT_TYPES,
  FOLLOW_UP_ROLES,
  FORECAST_TYPES,
  HOUSE_SYSTEMS,
  READING_STATUSES,
  READING_TYPES,
  TONE_STYLES,
} from '@/lib/astrology/constants';

export type AstrologyLocale = (typeof ASTROLOGY_SUPPORTED_LOCALES)[number];
export type HouseSystem = (typeof HOUSE_SYSTEMS)[number];
export type ChartSubjectType = (typeof CHART_SUBJECT_TYPES)[number];
export type ChartStatus = (typeof CHART_STATUSES)[number];
export type ReadingType = (typeof READING_TYPES)[number];
export type ReadingStatus = (typeof READING_STATUSES)[number];
export type FollowUpRole = (typeof FOLLOW_UP_ROLES)[number];
export type ForecastType = (typeof FORECAST_TYPES)[number];
export type ToneStyle = (typeof TONE_STYLES)[number];

export interface BirthLocation {
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface BirthDataInput extends BirthLocation {
  personName: string;
  birthDate: string;
  birthTime?: string;
  birthTimeKnown: boolean;
  houseSystem: HouseSystem;
  label: string;
  subjectType: ChartSubjectType;
  notes?: string;
}

export interface CalculatedPosition {
  bodyKey: string;
  signKey: string;
  houseNumber?: number;
  degreeDecimal: number;
  retrograde: boolean;
}

export interface CalculatedAspect {
  bodyA: string;
  bodyB: string;
  aspectKey: string;
  orbDecimal: number;
  applying?: boolean;
}

export interface ChartComputationResult {
  provider: string;
  snapshotVersion: number;
  computedChart: Record<string, unknown>;
  warnings: string[];
  positions: CalculatedPosition[];
  aspects: CalculatedAspect[];
}

export interface ReadingSection {
  key: string;
  title: string;
  content: string;
}

export interface StructuredReading {
  title: string;
  summary: string;
  sections: ReadingSection[];
  placementHighlights: string[];
  advice: string[];
  disclaimers: string[];
  metadata: {
    locale: AstrologyLocale;
    readingType: ReadingType;
    promptVersion: string;
    schemaVersion: string;
  };
}
