import { chartCreateSchema, type ChartCreateInput } from '@/lib/astrology/chart-schema';
import { normalizeHouseSystem } from '@/lib/astrology/constants';
import { calculateNatalChart } from '@/lib/astrology/engine';
import {
  createChartRecord,
  deleteChartSnapshots,
  getChartWithBirthData,
  markChartFailed,
  markOnboardingComplete,
  saveChartSnapshot,
} from '@/lib/astrology/repository';

export async function createChart(userId: string, rawInput: ChartCreateInput) {
  const input = chartCreateSchema.parse(rawInput);
  const chart = await createChartRecord(userId, input);

  try {
    const computation = await calculateNatalChart({
      label: input.label,
      personName: input.personName,
      subjectType: input.subjectType,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      birthTimeKnown: input.birthTimeKnown,
      houseSystem: input.houseSystem,
      notes: input.notes,
      city: input.city,
      country: input.country,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
    });

    const snapshot = await saveChartSnapshot(chart.id, computation);
    await markOnboardingComplete(userId);
    return { chart, snapshot };
  } catch (error) {
    await markChartFailed(chart.id);
    throw error;
  }
}

export async function recalculateChart(chartId: string, userId: string) {
  const chart = await getChartWithBirthData(chartId, userId);

  await deleteChartSnapshots(chartId);

  const computation = await calculateNatalChart({
    label: chart.label,
    personName: chart.person_name,
    subjectType: chart.subject_type as 'self' | 'partner' | 'child' | 'client' | 'other',
    birthDate: chart.birth_date,
    birthTime: chart.birth_time ?? undefined,
    birthTimeKnown: chart.birth_time_known,
    houseSystem: normalizeHouseSystem(chart.house_system),
    notes: chart.notes ?? undefined,
    city: chart.city,
    country: chart.country,
    latitude: chart.latitude ?? undefined,
    longitude: chart.longitude ?? undefined,
    timezone: chart.timezone ?? undefined,
  });

  const snapshot = await saveChartSnapshot(chartId, computation);

  return {
    snapshot,
    positionCount: computation.positions.length,
    aspectCount: computation.aspects.length,
    warnings: computation.warnings,
  };
}
