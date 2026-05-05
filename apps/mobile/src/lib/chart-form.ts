import type { ChartRecord, CityOption } from '@clario/api-client';
import { CHART_SUBJECT_TYPES, HOUSE_SYSTEMS } from '@clario/types';
import { resolveChartTimezone } from '@clario/validation';

type SubjectType = (typeof CHART_SUBJECT_TYPES)[number];
type HouseSystem = (typeof HOUSE_SYSTEMS)[number];

export interface ChartFormData {
  label: string;
  personName: string;
  subjectType: SubjectType;
  birthDate: string;
  birthTime: string;
  birthTimeKnown: boolean;
  houseSystem: HouseSystem;
  city: string;
  country: string;
  lat: number | null;
  lon: number | null;
  timezone: string;
}

export const CHART_FORM_TOTAL_STEPS = 3;

export function createEmptyChartFormData(): ChartFormData {
  return {
    label: '',
    personName: '',
    subjectType: 'self',
    birthDate: '',
    birthTime: '',
    birthTimeKnown: true,
    houseSystem: 'placidus',
    city: '',
    country: '',
    lat: null,
    lon: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function mapChartRecordToFormData(chart: ChartRecord): ChartFormData {
  return {
    label: chart.label,
    personName: chart.person_name,
    subjectType: toChartSubjectType(chart.subject_type),
    birthDate: chart.birth_date,
    birthTime: chart.birth_time ?? '',
    birthTimeKnown: chart.birth_time_known,
    houseSystem: toHouseSystem(chart.house_system),
    city: chart.city,
    country: chart.country,
    lat: chart.latitude ?? null,
    lon: chart.longitude ?? null,
    timezone:
      resolveChartTimezone(chart.timezone, chart.country) ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function getChartDisplayLocation(form: Pick<ChartFormData, 'city' | 'country'>): string {
  return form.city ? `${form.city}, ${form.country}` : '';
}

export async function buildChartFormLocationPatch(
  city: CityOption,
  lookupTimezone: (lat: number, lon: number) => Promise<string | null | undefined>,
): Promise<Pick<ChartFormData, 'city' | 'country' | 'lat' | 'lon' | 'timezone'>> {
  const timezone = await lookupTimezone(city.lat, city.lon);

  return {
    city: city.city,
    country: city.country,
    lat: city.lat,
    lon: city.lon,
    timezone: resolveChartTimezone(timezone, city.country) ?? '',
  };
}

export function validateChartFormStep(
  step: number,
  form: ChartFormData,
  messages: {
    identity: string;
    birth: string;
    birthTime: string;
    location: string;
  },
): string | null {
  if (step === 1) {
    if (!form.label.trim() || !form.personName.trim()) {
      return messages.identity;
    }
  }

  if (step === 2) {
    if (!form.birthDate.trim()) {
      return messages.birth;
    }

    if (form.birthTimeKnown && !form.birthTime.trim()) {
      return messages.birthTime;
    }
  }

  if (step === 3) {
    if (!form.city.trim() || !form.country.trim()) {
      return messages.location;
    }
  }

  return null;
}

function toChartSubjectType(value: string): SubjectType {
  return CHART_SUBJECT_TYPES.includes(value as SubjectType) ? (value as SubjectType) : 'self';
}

function toHouseSystem(value: string): HouseSystem {
  return HOUSE_SYSTEMS.includes(value as HouseSystem) ? (value as HouseSystem) : 'placidus';
}
