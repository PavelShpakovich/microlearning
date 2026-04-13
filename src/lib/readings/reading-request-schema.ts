import { z } from 'zod';
import { ASTROLOGY_SUPPORTED_LOCALES, READING_TYPES } from '@/lib/astrology/constants';

export const readingCreateSchema = z.object({
  chartId: z.string().uuid(),
  readingType: z.enum(READING_TYPES),
  locale: z.enum(ASTROLOGY_SUPPORTED_LOCALES).default('en'),
});

export type ReadingCreateInput = z.infer<typeof readingCreateSchema>;
