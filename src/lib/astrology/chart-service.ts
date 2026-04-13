import { chartCreateSchema, type ChartCreateInput } from '@/lib/astrology/chart-schema';
import { calculateNatalChart } from '@/lib/astrology/engine';
import {
  createChartRecord,
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
    const message = error instanceof Error ? error.message : 'Chart calculation failed';
    await markChartFailed(chart.id, message);
    throw error;
  }
}
