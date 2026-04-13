import { z } from 'zod';
import { ASTROLOGY_SUPPORTED_LOCALES, READING_TYPES } from '@/lib/astrology/constants';

export const readingPlanSchema = z.object({
  title: z.string().trim().min(1).max(180),
  summaryAngle: z.string().trim().min(1),
  sectionBlueprints: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(60),
        title: z.string().trim().min(1).max(120),
        focus: z.string().trim().min(1),
      }),
    )
    .min(3)
    .max(5),
  placementHighlights: z.array(z.string().trim().min(1)).default([]),
  adviceThemes: z.array(z.string().trim().min(1)).default([]),
  cautionNotes: z.array(z.string().trim().min(1)).default([]),
  metadata: z.object({
    locale: z.enum(ASTROLOGY_SUPPORTED_LOCALES),
    readingType: z.enum(READING_TYPES),
    promptVersion: z.string().trim().min(1),
    schemaVersion: z.string().trim().min(1),
  }),
});

export type ReadingPlanOutput = z.infer<typeof readingPlanSchema>;
